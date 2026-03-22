// Configuration management with password encryption

use crate::http_proxy::{ProxyRule, RuleType};
use keyring::Entry;
use serde::{Deserialize, Serialize};
use std::fs;
use tauri::Manager;

const KEYRING_SERVICE: &str = "quick-easyconnect-proxy";
const KEYRING_USERNAME: &str = "network_password";
const KEYRING_VNC_USERNAME: &str = "vnc_password";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub username: String,
    pub server_url: String,
    pub ec_version: String,
    #[serde(default)]
    pub proxy_rules: Vec<ProxyRuleConfig>,
    // Passwords are stored in OS keyring, not in config file
    #[serde(skip)]
    pub password: String,
    #[serde(skip)]
    pub vnc_password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyRuleConfig {
    pub pattern: String,
    pub rule_type: String, // "Domain", "Ip", "Cidr"
}

impl From<ProxyRuleConfig> for ProxyRule {
    fn from(config: ProxyRuleConfig) -> Self {
        let rule_type = match config.rule_type.as_str() {
            "Ip" => RuleType::Ip,
            "Cidr" => RuleType::Cidr,
            _ => RuleType::Domain,
        };
        ProxyRule {
            pattern: config.pattern,
            rule_type,
        }
    }
}

impl From<ProxyRule> for ProxyRuleConfig {
    fn from(rule: ProxyRule) -> Self {
        let rule_type = match rule.rule_type {
            RuleType::Ip => "Ip".to_string(),
            RuleType::Cidr => "Cidr".to_string(),
            RuleType::Domain => "Domain".to_string(),
        };
        ProxyRuleConfig {
            pattern: rule.pattern,
            rule_type,
        }
    }
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            username: String::new(),
            server_url: String::new(),
            ec_version: "7.6.3".to_string(),
            proxy_rules: vec![
                ProxyRuleConfig {
                    pattern: "*.internal.example.com".to_string(),
                    rule_type: "Domain".to_string(),
                },
                ProxyRuleConfig {
                    pattern: "10.0.0.0/8".to_string(),
                    rule_type: "Cidr".to_string(),
                },
            ],
            password: String::new(),
            vnc_password: "vnc123".to_string(),
        }
    }
}

/// Get config file path
fn get_config_path(app: &tauri::AppHandle) -> std::path::PathBuf {
    app.path()
        .app_data_dir()
        .expect("Failed to get app data directory")
        .join("config.json")
}

/// Load configuration from file and keyring
pub async fn load_config(app: &tauri::AppHandle) -> Result<AppConfig, String> {
    let config_path = get_config_path(app);

    // Create default config if file doesn't exist
    if !config_path.exists() {
        return Ok(AppConfig::default());
    }

    // Read config file
    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config file: {}", e))?;

    let mut config: AppConfig = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse config file: {}", e))?;

    // Load passwords from keyring
    if let Ok(entry) = Entry::new(KEYRING_SERVICE, KEYRING_USERNAME) {
        if let Ok(password) = entry.get_password() {
            config.password = password;
        }
    }

    if let Ok(entry) = Entry::new(KEYRING_SERVICE, KEYRING_VNC_USERNAME) {
        if let Ok(password) = entry.get_password() {
            config.vnc_password = password;
        }
    }

    Ok(config)
}

/// Save configuration to file and keyring
pub async fn save_config(app: &tauri::AppHandle, config: AppConfig) -> Result<(), String> {
    let config_path = get_config_path(app);

    // Ensure directory exists
    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }

    // Save passwords to keyring
    if !config.password.is_empty() {
        let entry = Entry::new(KEYRING_SERVICE, KEYRING_USERNAME)
            .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
        entry
            .set_password(&config.password)
            .map_err(|e| format!("Failed to save password to keyring: {}", e))?;
    }

    if !config.vnc_password.is_empty() {
        let entry = Entry::new(KEYRING_SERVICE, KEYRING_VNC_USERNAME)
            .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
        entry
            .set_password(&config.vnc_password)
            .map_err(|e| format!("Failed to save VNC password to keyring: {}", e))?;
    }

    // Create config without passwords for file storage
    let file_config = AppConfigFile {
        username: config.username,
        server_url: config.server_url,
        ec_version: config.ec_version,
        proxy_rules: config.proxy_rules,
    };

    let content = serde_json::to_string_pretty(&file_config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;

    fs::write(&config_path, content)
        .map_err(|e| format!("Failed to write config file: {}", e))?;

    Ok(())
}

/// Config file structure (without passwords)
#[derive(Debug, Serialize, Deserialize)]
struct AppConfigFile {
    pub username: String,
    pub server_url: String,
    pub ec_version: String,
    #[serde(default)]
    pub proxy_rules: Vec<ProxyRuleConfig>,
}
