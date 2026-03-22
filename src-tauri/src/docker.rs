// Docker container management utilities

use std::process::Command;

/// Check if Docker daemon is running
pub fn is_docker_running() -> bool {
    Command::new("docker")
        .args(["info"])
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

/// Check if a container with the given name or ID is running
pub fn is_container_running(container_id: &str) -> bool {
    Command::new("docker")
        .args(["ps", "-q", "--filter", &format!("id={}", container_id)])
        .output()
        .map(|output| !output.stdout.is_empty())
        .unwrap_or(false)
}

/// Get list of running easyconnect containers
pub fn get_easyconnect_containers() -> Vec<String> {
    Command::new("docker")
        .args([
            "ps",
            "-q",
            "--filter",
            "ancestor=hagb/docker-easyconnect:7.6.3",
        ])
        .output()
        .map(|output| {
            String::from_utf8_lossy(&output.stdout)
                .lines()
                .map(|s| s.to_string())
                .collect()
        })
        .unwrap_or_default()
}

/// Pull the EasyConnect Docker image
pub fn pull_easyconnect_image(version: &str) -> Result<(), String> {
    let image = format!("hagb/docker-easyconnect:{}", version);
    let status = Command::new("docker")
        .args(["pull", &image])
        .status()
        .map_err(|e| format!("Failed to pull image: {}", e))?;

    if status.success() {
        Ok(())
    } else {
        Err(format!("Failed to pull image: {}", image))
    }
}
