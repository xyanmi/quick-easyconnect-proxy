// Entry point for the Tauri application
// This file is required for building the application

// Hide console window on Windows release builds
#![cfg_attr(all(windows, not(debug_assertions)), windows_subsystem = "windows")]

fn main() {
    quick_easyconnect_proxy_lib::run()
}
