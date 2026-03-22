// HTTP Proxy server with rule-based routing
// Routes traffic through SOCKS5 proxy or direct connection based on rules

use std::net::SocketAddr;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::broadcast;
use tauri::Emitter;

/// Log a proxy request via Tauri event
fn log_proxy_request(app_handle: &tauri::AppHandle, method: &str, host: &str, target: &str, use_proxy: bool) {
    let log_entry = serde_json::json!({
        "method": method,
        "host": host,
        "target": target,
        "via": if use_proxy { "SOCKS5" } else { "DIRECT" },
        "timestamp": chrono::Local::now().format("%H:%M:%S").to_string()
    });

    let _ = app_handle.emit("proxy-log", &log_entry);
    println!("{} {} -> {}", method, target, if use_proxy { "SOCKS5" } else { "DIRECT" });
}

/// Rule for matching requests
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ProxyRule {
    pub pattern: String,
    pub rule_type: RuleType,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum RuleType {
    Domain,
    Ip,
    Cidr,
}

/// Proxy configuration
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ProxyConfig {
    pub enabled: bool,
    pub listen_port: u16,
    pub socks5_host: String,
    pub socks5_port: u16,
    pub rules: Vec<ProxyRule>,
}

impl Default for ProxyConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            listen_port: 8080,
            socks5_host: "127.0.0.1".to_string(),
            socks5_port: 1080,
            rules: vec![],
        }
    }
}

/// Check if a host matches any proxy rule
fn should_use_proxy(host: &str, rules: &[ProxyRule]) -> bool {
    if rules.is_empty() {
        return true; // Default to proxy if no rules
    }

    for rule in rules {
        let matches = match rule.rule_type {
            RuleType::Domain => {
                // Support wildcard matching
                if rule.pattern.starts_with("*.") {
                    let suffix = &rule.pattern[1..]; // Remove the *
                    host.ends_with(suffix) || host == &rule.pattern[2..]
                } else {
                    host == rule.pattern
                }
            }
            RuleType::Ip | RuleType::Cidr => {
                // For simplicity, do string matching for IPs
                // Full CIDR matching would require ipnet crate
                host == rule.pattern || host.starts_with(&rule.pattern.split('/').next().unwrap_or(""))
            }
        };

        if matches {
            return true;
        }
    }

    false
}

/// Start the HTTP proxy server
pub async fn start_http_proxy(
    app_handle: tauri::AppHandle,
    config: ProxyConfig,
    mut shutdown_rx: broadcast::Receiver<()>,
    running_flag: Arc<AtomicBool>,
) -> Result<(), String> {
    let addr: SocketAddr = format!("127.0.0.1:{}", config.listen_port)
        .parse()
        .map_err(|e| format!("Invalid address: {}", e))?;

    let listener = TcpListener::bind(addr)
        .await
        .map_err(|e| format!("Failed to bind proxy server: {}", e))?;

    println!("HTTP Proxy listening on {}", addr);

    let socks5_addr = format!("{}:{}", config.socks5_host, config.socks5_port);
    let rules = Arc::new(config.rules);

    loop {
        tokio::select! {
            accept_result = listener.accept() => {
                match accept_result {
                    Ok((stream, _client_addr)) => {
                        let socks5_addr = socks5_addr.clone();
                        let rules = rules.clone();
                        let app_handle = app_handle.clone();

                        tokio::spawn(async move {
                            if let Err(e) = handle_client(stream, &socks5_addr, &rules, &app_handle).await {
                                eprintln!("Client handler error: {}", e);
                            }
                        });
                    }
                    Err(e) => {
                        eprintln!("Failed to accept connection: {}", e);
                    }
                }
            }

            _ = shutdown_rx.recv() => {
                println!("HTTP Proxy shutting down");
                running_flag.store(false, Ordering::SeqCst);
                break Ok(());
            }
        }
    }
}

/// Handle a single client connection
async fn handle_client(
    mut client_stream: TcpStream,
    socks5_addr: &str,
    rules: &[ProxyRule],
    app_handle: &tauri::AppHandle,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // Read the request line
    let mut buffer = [0u8; 8192];
    let n = client_stream.read(&mut buffer).await?;

    if n == 0 {
        return Ok(());
    }

    let request_str = String::from_utf8_lossy(&buffer[..n]);
    let first_line = request_str.lines().next().unwrap_or("");

    // Parse request: METHOD URL HTTP/VERSION
    let parts: Vec<&str> = first_line.split_whitespace().collect();
    if parts.len() < 3 {
        return Err("Invalid request".into());
    }

    let method = parts[0];
    let _url = parts[1];

    // Handle CONNECT method (HTTPS tunneling)
    if method == "CONNECT" {
        let target = parts[1]; // host:port
        let host = target.split(':').next().unwrap_or("");
        let use_proxy = should_use_proxy(host, rules);

        // Log the request
        log_proxy_request(app_handle, method, host, target, use_proxy);

        // Connect to target
        let mut target_stream = if use_proxy {
            connect_via_socks5(socks5_addr, target).await?
        } else {
            TcpStream::connect(target).await?
        };

        // Send 200 Connection Established
        client_stream.write_all(b"HTTP/1.1 200 Connection Established\r\n\r\n").await?;

        // Tunnel data bidirectionally
        tokio::spawn(async move {
            let (mut client_rd, mut client_wr) = client_stream.into_split();
            let (mut target_rd, mut target_wr) = target_stream.into_split();

            let client_to_target = async {
                let mut buf = [0u8; 8192];
                loop {
                    match client_rd.read(&mut buf).await {
                        Ok(0) => break,
                        Ok(n) => {
                            if target_wr.write_all(&buf[..n]).await.is_err() {
                                break;
                            }
                        }
                        Err(_) => break,
                    }
                }
            };

            let target_to_client = async {
                let mut buf = [0u8; 8192];
                loop {
                    match target_rd.read(&mut buf).await {
                        Ok(0) => break,
                        Ok(n) => {
                            if client_wr.write_all(&buf[..n]).await.is_err() {
                                break;
                            }
                        }
                        Err(_) => break,
                    }
                }
            };

            tokio::join!(client_to_target, target_to_client);
        });

        return Ok(());
    }

    // Handle regular HTTP request
    let host = extract_host(&request_str);
    let use_proxy = should_use_proxy(host, rules);
    let port = extract_port(&request_str).unwrap_or(80);
    let target = format!("{}:{}", host, port);

    // Log the request
    log_proxy_request(app_handle, method, host, &target, use_proxy);

    // For HTTP requests, forward through proxy or direct
    let mut target_stream = if use_proxy {
        connect_via_socks5(socks5_addr, &target).await?
    } else {
        TcpStream::connect(&target).await?
    };

    // Forward the original request
    target_stream.write_all(&buffer[..n]).await?;

    // Read response and forward back
    let mut response_buf = [0u8; 8192];
    loop {
        match target_stream.read(&mut response_buf).await {
            Ok(0) => break,
            Ok(n) => {
                client_stream.write_all(&response_buf[..n]).await?;
            }
            Err(_) => break,
        }
    }

    Ok(())
}

/// Extract host from HTTP request headers
fn extract_host(request: &str) -> &str {
    for line in request.lines() {
        if line.to_lowercase().starts_with("host:") {
            return line.split(':').nth(1).unwrap_or("").trim().split(':').next().unwrap_or("");
        }
    }
    ""
}

/// Extract port from Host header
fn extract_port(request: &str) -> Option<u16> {
    for line in request.lines() {
        if line.to_lowercase().starts_with("host:") {
            let host_part = line.split(':').nth(1).unwrap_or("").trim();
            if let Some(port_str) = host_part.split(':').nth(1) {
                return port_str.parse().ok();
            }
        }
    }
    None
}

/// Connect to target via SOCKS5 proxy
async fn connect_via_socks5(
    socks5_addr: &str,
    target: &str,
) -> Result<TcpStream, Box<dyn std::error::Error + Send + Sync>> {
    let parts: Vec<&str> = target.split(':').collect();
    if parts.len() != 2 {
        return Err("Invalid target address".into());
    }

    let host = parts[0];
    let port: u16 = parts[1].parse()?;

    // Connect to SOCKS5 proxy
    let proxy_stream = TcpStream::connect(socks5_addr).await?;

    // Perform SOCKS5 handshake
    let mut stream = proxy_stream;

    // Send greeting (version 5, 1 auth method, no auth)
    stream.write_all(&[0x05, 0x01, 0x00]).await?;

    // Read response
    let mut buf = [0u8; 2];
    stream.read_exact(&mut buf).await?;

    if buf[0] != 0x05 || buf[1] != 0x00 {
        return Err("SOCKS5 auth failed".into());
    }

    // Send connect request
    let host_bytes = host.as_bytes();
    let port_bytes = port.to_be_bytes();

    let mut request = vec![0x05, 0x01, 0x00, 0x03]; // Version, Connect, Reserved, Domain
    request.push(host_bytes.len() as u8);
    request.extend_from_slice(host_bytes);
    request.extend_from_slice(&port_bytes);

    stream.write_all(&request).await?;

    // Read response
    let mut response = [0u8; 10];
    stream.read_exact(&mut response).await?;

    if response[1] != 0x00 {
        return Err(format!("SOCKS5 connect failed: {}", response[1]).into());
    }

    Ok(stream)
}
