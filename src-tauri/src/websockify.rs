// Websockify bridge implementation (Rust-based TCP to WebSocket proxy)
// This module provides a pure Rust implementation for bridging VNC to WebSocket

use futures_util::{SinkExt, StreamExt};
use std::net::SocketAddr;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::broadcast;
use tokio_tungstenite::{accept_async, tungstenite::Message};

/// Start the websockify bridge server
pub async fn start_websockify_server(
    listen_addr: &str,
    target_addr: &str,
    mut shutdown_rx: broadcast::Receiver<()>,
) -> Result<(), String> {
    let listener = TcpListener::bind(listen_addr)
        .await
        .map_err(|e| format!("Failed to bind to {}: {}", listen_addr, e))?;

    let target = target_addr.to_string();

    loop {
        tokio::select! {
            // Accept new connections
            accept_result = listener.accept() => {
                match accept_result {
                    Ok((stream, addr)) => {
                        let target_clone = target.clone();
                        tokio::spawn(async move {
                            if let Err(e) = handle_connection(stream, addr, &target_clone).await {
                                eprintln!("Connection error: {}", e);
                            }
                        });
                    }
                    Err(e) => {
                        eprintln!("Failed to accept connection: {}", e);
                    }
                }
            }

            // Handle shutdown signal
            _ = shutdown_rx.recv() => {
                println!("Websockify server shutting down");
                break Ok(());
            }
        }
    }
}

/// Handle a single WebSocket connection
async fn handle_connection(
    ws_stream: TcpStream,
    addr: SocketAddr,
    target: &str,
) -> Result<(), String> {
    println!("New WebSocket connection from {}", addr);

    // Upgrade to WebSocket
    let ws = accept_async(ws_stream)
        .await
        .map_err(|e| format!("WebSocket upgrade failed: {}", e))?;

    let (mut ws_sender, mut ws_receiver) = ws.split();

    // Connect to target VNC server
    let mut tcp_stream = TcpStream::connect(target)
        .await
        .map_err(|e| format!("Failed to connect to {}: {}", target, e))?;

    // Split TCP stream for bidirectional communication
    let (mut tcp_read, mut tcp_write) = tcp_stream.split();

    // Forward data between WebSocket and TCP
    let ws_to_tcp = async {
        while let Some(msg) = ws_receiver.next().await {
            match msg {
                Ok(Message::Binary(data)) => {
                    use tokio::io::AsyncWriteExt;
                    if tcp_write.write_all(&data).await.is_err() {
                        break;
                    }
                }
                Ok(Message::Close(_)) => break,
                Err(_) => break,
                _ => {}
            }
        }
    };

    let tcp_to_ws = async {
        let mut buf = vec![0u8; 4096];
        use tokio::io::AsyncReadExt;
        loop {
            match tcp_read.read(&mut buf).await {
                Ok(0) => break, // Connection closed
                Ok(n) => {
                    if ws_sender
                        .send(Message::Binary(buf[..n].to_vec()))
                        .await
                        .is_err()
                    {
                        break;
                    }
                }
                Err(_) => break,
            }
        }
    };

    // Run both directions concurrently
    tokio::select! {
        _ = ws_to_tcp => {},
        _ = tcp_to_ws => {},
    }

    println!("Connection from {} closed", addr);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_websockify_start() {
        let (tx, rx) = broadcast::channel(1);

        // Start server in background
        let server = tokio::spawn(async move {
            start_websockify_server("127.0.0.1:16080", "127.0.0.1:5901", rx).await
        });

        // Give server time to start
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

        // Send shutdown signal
        tx.send(()).unwrap();

        // Wait for server to stop
        let result = server.await.unwrap();
        assert!(result.is_ok());
    }
}
