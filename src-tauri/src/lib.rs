// Core Tauri commands for Docker container management and websockify bridge

mod config;
mod docker;
mod http_proxy;
mod websockify;

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{TrayIcon, TrayIconBuilder};
use tauri::{Emitter, Manager, Runtime};
use tauri_plugin_shell::ShellExt;

// Global state for container and websockify management
static CONTAINER_RUNNING: AtomicBool = AtomicBool::new(false);
static WEBSOCKIFY_RUNNING: AtomicBool = AtomicBool::new(false);
static HTTP_PROXY_RUNNING: AtomicBool = AtomicBool::new(false);

// Store container ID and websockify process
static CONTAINER_ID: Mutex<Option<String>> = Mutex::new(None);

// Store shutdown senders
static WEBSOCKIFY_SHUTDOWN: Mutex<Option<tokio::sync::broadcast::Sender<()>>> = Mutex::new(None);
static HTTP_PROXY_SHUTDOWN: Mutex<Option<tokio::sync::broadcast::Sender<()>>> = Mutex::new(None);

// Store tray handle for updating status
static TRAY_HANDLE: Mutex<Option<TrayIcon>> = Mutex::new(None);

/// Update tray tooltip with current status
fn update_tray_tooltip<R: Runtime>(app: &tauri::AppHandle<R>) {
    let connected = CONTAINER_RUNNING.load(Ordering::SeqCst);
    let http_running = HTTP_PROXY_RUNNING.load(Ordering::SeqCst);

    let status = if connected {
        if http_running {
            "Connected (HTTP Proxy: ON)"
        } else {
            "Connected (HTTP Proxy: OFF)"
        }
    } else {
        "Disconnected"
    };

    let tooltip = format!("Quick EasyConnect Proxy\nStatus: {}", status);

    if let Ok(mut tray) = TRAY_HANDLE.lock() {
        if let Some(tray_icon) = tray.as_ref() {
            let _ = tray_icon.set_tooltip(Some(&tooltip));
        }
    }
}

/// Rebuild tray menu with current status
fn rebuild_tray_menu<R: Runtime>(app: &tauri::AppHandle<R>) -> Result<(), Box<dyn std::error::Error>> {
    let connected = CONTAINER_RUNNING.load(Ordering::SeqCst);

    // Create status text
    let status_text = if connected {
        "● Connected"
    } else {
        "○ Disconnected"
    };

    // Create menu items
    let status_item = MenuItem::with_id(app, "status", status_text, false, None::<&str>)?;
    let separator1 = PredefinedMenuItem::separator(app)?;
    let connect_item = MenuItem::with_id(app, "connect", "Connect", !connected, None::<&str>)?;
    let disconnect_item = MenuItem::with_id(app, "disconnect", "Disconnect", connected, None::<&str>)?;
    let separator2 = PredefinedMenuItem::separator(app)?;
    let show_item = MenuItem::with_id(app, "show", "Show Window", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    // Create tray menu
    let menu = Menu::with_items(app, &[
        &status_item,
        &separator1,
        &connect_item,
        &disconnect_item,
        &separator2,
        &show_item,
        &quit_item,
    ])?;

    // Update tray with new menu
    if let Ok(tray) = TRAY_HANDLE.lock() {
        if let Some(tray_icon) = tray.as_ref() {
            let _ = tray_icon.set_menu(Some(menu));
        }
    }

    Ok(())
}

/// Check if Docker command is available on the system
#[tauri::command]
async fn check_docker_available() -> Result<bool, String> {
    match which::which("docker") {
        Ok(_) => Ok(true),
        Err(_) => Err("Docker command not found. Please install Docker Desktop.".to_string()),
    }
}

/// Start the network container
#[tauri::command]
async fn start_network_container(
    app: tauri::AppHandle,
    vnc_password: String,
    ec_version: String,
) -> Result<String, String> {
    if CONTAINER_RUNNING.load(Ordering::SeqCst) {
        return Err("Container is already running".to_string());
    }

    // Get app data path for volume mount
    let app_data_path = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data path: {}", e))?;

    // Ensure .ecdata directory exists (for EasyConnect session persistence)
    let ecdata_path = app_data_path.join(".ecdata");
    std::fs::create_dir_all(&ecdata_path)
        .map_err(|e| format!("Failed to create .ecdata directory: {}", e))?;

    // Ensure .easyconn directory exists (for EasyConnect login state)
    let easyconn_path = ecdata_path.join(".easyconn");
    std::fs::create_dir_all(&easyconn_path)
        .map_err(|e| format!("Failed to create .easyconn directory: {}", e))?;

    let ecdata_path_str = ecdata_path.to_string_lossy().to_string();

    // Build docker run command arguments
    let args = vec![
        "run".to_string(),
        "--rm".to_string(),
        "-d".to_string(), // Run in detached mode
        "--privileged".to_string(),
        "--device".to_string(),
        "/dev/net/tun".to_string(),
        "-v".to_string(),
        format!("{}:/root", ecdata_path_str),
        "-p".to_string(),
        "127.0.0.1:5901:5901".to_string(),
        "-p".to_string(),
        "127.0.0.1:1080:1080".to_string(),
        "-e".to_string(),
        format!("PASSWORD={}", vnc_password),
        "-e".to_string(),
        format!("EC_VER={}", ec_version),
        format!("hagb/docker-easyconnect:{}", ec_version),
    ];

    // Execute docker run command
    let shell = app.shell();
    let output = shell
        .command("docker")
        .args(&args)
        .output()
        .await
        .map_err(|e| format!("Failed to execute docker command: {}", e))?;

    if output.status.success() {
        // Extract container ID from output (first line)
        let container_id = String::from_utf8_lossy(&output.stdout)
            .lines()
            .next()
            .unwrap_or("")
            .trim()
            .to_string();

        // Store container ID
        if let Ok(mut id) = CONTAINER_ID.lock() {
            *id = Some(container_id.clone());
        }

        CONTAINER_RUNNING.store(true, Ordering::SeqCst);

        // Update tray status
        let _ = rebuild_tray_menu(&app);
        update_tray_tooltip(&app);

        // Emit success event to frontend
        app.emit("container-started", &container_id)
            .map_err(|e| format!("Failed to emit event: {}", e))?;

        Ok(container_id)
    } else {
        let error = String::from_utf8_lossy(&output.stderr).to_string();
        Err(format!("Docker command failed: {}", error))
    }
}

/// Stop the network container
#[tauri::command]
async fn stop_network_container(app: tauri::AppHandle) -> Result<(), String> {
    if !CONTAINER_RUNNING.load(Ordering::SeqCst) {
        return Ok(());
    }

    // Get container ID
    let container_id = if let Ok(id) = CONTAINER_ID.lock() {
        id.clone()
    } else {
        None
    };

    if let Some(id) = container_id {
        // Execute docker stop command
        let shell = app.shell();
        let _ = shell
            .command("docker")
            .args(["stop", &id])
            .output()
            .await;
    }

    CONTAINER_RUNNING.store(false, Ordering::SeqCst);
    if let Ok(mut id) = CONTAINER_ID.lock() {
        *id = None;
    }

    // Update tray status
    let _ = rebuild_tray_menu(&app);
    update_tray_tooltip(&app);

    // Emit event to frontend
    app.emit("container-stopped", ())
        .map_err(|e| format!("Failed to emit event: {}", e))?;

    Ok(())
}

/// Get current container status
#[tauri::command]
async fn get_container_status() -> bool {
    CONTAINER_RUNNING.load(Ordering::SeqCst)
}

/// Start websockify bridge (VNC to WebSocket)
#[tauri::command]
async fn start_websockify(_app: tauri::AppHandle) -> Result<(), String> {
    if WEBSOCKIFY_RUNNING.load(Ordering::SeqCst) {
        return Ok(());
    }

    // Create shutdown channel
    let (tx, rx) = tokio::sync::broadcast::channel(1);
    let shutdown_rx = rx.resubscribe();

    // Store sender for later shutdown
    if let Ok(mut shutdown) = WEBSOCKIFY_SHUTDOWN.lock() {
        *shutdown = Some(tx);
    }

    // Start Rust-based websockify server
    tokio::spawn(async move {
        if let Err(e) = websockify::start_websockify_server("127.0.0.1:6080", "127.0.0.1:5901", shutdown_rx).await {
            eprintln!("Websockify error: {}", e);
        }
    });

    WEBSOCKIFY_RUNNING.store(true, Ordering::SeqCst);
    Ok(())
}

/// Stop websockify bridge
#[tauri::command]
async fn stop_websockify() -> Result<(), String> {
    if WEBSOCKIFY_RUNNING.load(Ordering::SeqCst) {
        // Send shutdown signal
        if let Ok(mut shutdown) = WEBSOCKIFY_SHUTDOWN.lock() {
            if let Some(tx) = shutdown.take() {
                let _ = tx.send(());
            }
        }
        WEBSOCKIFY_RUNNING.store(false, Ordering::SeqCst);
    }
    Ok(())
}

/// Start HTTP proxy server
#[tauri::command]
async fn start_http_proxy(app: tauri::AppHandle, rules: Vec<config::ProxyRuleConfig>) -> Result<(), String> {
    if HTTP_PROXY_RUNNING.load(Ordering::SeqCst) {
        return Ok(());
    }

    // Check if HTTP proxy port is already in use
    if std::net::TcpListener::bind("127.0.0.1:8080").is_err() {
        return Err("Port 8080 is already in use. Please stop any process using this port.".to_string());
    }

    // Convert config rules to proxy rules
    let proxy_rules: Vec<http_proxy::ProxyRule> = rules.into_iter().map(|r| r.into()).collect();

    // Create shutdown channel
    let (tx, rx) = tokio::sync::broadcast::channel(1);
    let shutdown_rx = rx.resubscribe();

    // Store sender for later shutdown
    if let Ok(mut shutdown) = HTTP_PROXY_SHUTDOWN.lock() {
        *shutdown = Some(tx);
    }

    let running_flag = std::sync::Arc::new(AtomicBool::new(true));

    // Create proxy config
    let config = http_proxy::ProxyConfig {
        enabled: true,
        listen_port: 8080,
        socks5_host: "127.0.0.1".to_string(),
        socks5_port: 1080,
        rules: proxy_rules,
    };

    // Clone app for the async task and for updating tray
    let app_for_proxy = app.clone();
    let app_for_tray = app.clone();

    // Start HTTP proxy server
    tokio::spawn(async move {
        if let Err(e) = http_proxy::start_http_proxy(app_for_proxy, config, shutdown_rx, running_flag).await {
            eprintln!("HTTP Proxy error: {}", e);
        }
    });

    HTTP_PROXY_RUNNING.store(true, Ordering::SeqCst);

    // Update tray tooltip
    update_tray_tooltip(&app_for_tray);

    Ok(())
}

/// Stop HTTP proxy server
#[tauri::command]
async fn stop_http_proxy(app: tauri::AppHandle) -> Result<(), String> {
    if HTTP_PROXY_RUNNING.load(Ordering::SeqCst) {
        // Send shutdown signal
        if let Ok(mut shutdown) = HTTP_PROXY_SHUTDOWN.lock() {
            if let Some(tx) = shutdown.take() {
                let _ = tx.send(());
            }
        }
        HTTP_PROXY_RUNNING.store(false, Ordering::SeqCst);

        // Update tray tooltip
        update_tray_tooltip(&app);
    }
    Ok(())
}

/// Get HTTP proxy status
#[tauri::command]
async fn get_http_proxy_status() -> bool {
    HTTP_PROXY_RUNNING.load(Ordering::SeqCst)
}

/// Get app data path
#[tauri::command]
async fn get_app_data_path(app: tauri::AppHandle) -> Result<String, String> {
    app.path()
        .app_data_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| format!("Failed to get app data path: {}", e))
}

/// Load configuration from file
#[tauri::command]
async fn load_config(app: tauri::AppHandle) -> Result<config::AppConfig, String> {
    config::load_config(&app).await
}

/// Save configuration to file
#[tauri::command]
async fn save_config(app: tauri::AppHandle, config: config::AppConfig) -> Result<(), String> {
    config::save_config(&app, config).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Get the main window
            let window = app.get_webview_window("main").unwrap();

            // Handle window close event - minimize to tray instead of closing
            let window_clone = window.clone();
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    // Prevent the window from closing
                    api.prevent_close();
                    // Hide the window instead
                    let _ = window_clone.hide();
                }
            });

            // Create tray menu with initial status
            let connected = CONTAINER_RUNNING.load(Ordering::SeqCst);
            let status_text = if connected { "● Connected" } else { "○ Disconnected" };

            let status_item = MenuItem::with_id(app, "status", status_text, false, None::<&str>)?;
            let separator1 = PredefinedMenuItem::separator(app)?;
            let connect_item = MenuItem::with_id(app, "connect", "Connect", true, None::<&str>)?;
            let disconnect_item = MenuItem::with_id(app, "disconnect", "Disconnect", false, None::<&str>)?;
            let separator2 = PredefinedMenuItem::separator(app)?;
            let show_item = MenuItem::with_id(app, "show", "Show Window", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

            // Create tray menu
            let menu = Menu::with_items(app, &[
                &status_item,
                &separator1,
                &connect_item,
                &disconnect_item,
                &separator2,
                &show_item,
                &quit_item,
            ])?;

            // Build tray icon
            let tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .tooltip("Quick EasyConnect Proxy\nStatus: Disconnected")
                .on_menu_event(|app, event| {
                    match event.id().as_ref() {
                        "connect" => {
                            let _ = app.emit("tray-connect", ());
                        }
                        "disconnect" => {
                            let _ = app.emit("tray-disconnect", ());
                        }
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    // Handle left click on tray icon - show window
                    if let tauri::tray::TrayIconEvent::Click { button: tauri::tray::MouseButton::Left, .. } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // Store tray handle for later updates
            if let Ok(mut tray_handle) = TRAY_HANDLE.lock() {
                *tray_handle = Some(tray);
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            check_docker_available,
            start_network_container,
            stop_network_container,
            get_container_status,
            start_websockify,
            stop_websockify,
            start_http_proxy,
            stop_http_proxy,
            get_http_proxy_status,
            get_app_data_path,
            load_config,
            save_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
