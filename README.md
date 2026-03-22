# Quick EasyConnect Proxy (Docker GUI)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

这是一个第三方的、基于 Tauri 和 Docker 构建的图形化辅助工具，专为改善在 Windows 环境下使用深信服 EasyConnect (Sangfor EasyConnect) 的体验而设计。

本工具通过封装开源镜像 [hagb/docker-easyconnect](https://github.com/docker-easyconnect/docker-easyconnect/tree/master)，提供现代化的 UI 和本地 SOCKS5/HTTP 智能分流代理，实现"业务流量走内网，日常流量走直连"的网络隔离效果。

## ⚠️ 免责声明

1. **本项目与深信服科技 (Sangfor) 无任何官方关联。**
2. **项目中不包含任何官方闭源二进制文件**，仅提供调用 Docker 镜像的控制面板。
3. 本工具仅供学习和个人使用，请勿用于任何违反法律法规的用途。
4. 使用本工具即表示您同意自行承担所有风险，作者不对任何因使用本工具而产生的损失负责。
5. 本工具依赖于 [docker-easyconnect](https://github.com/docker-easyconnect/docker-easyconnect/tree/master) 开源项目，感谢原作者的贡献。

💡 提示 (Known Issue)：受限于浏览器安全策略与 noVNC 剪贴板机制，VNC 画面内暂不支持直接使用 Ctrl+V 快捷键。填写密码时，请使用鼠标右键菜单选择“粘贴”，或利用 VNC 控制面板的剪贴板同步功能。

## ✨ 功能特性

- 🐳 **Docker 隔离**：在容器中运行 EasyConnect，与宿主机环境隔离
- 🖥️ **内置 VNC 查看器**：直接在应用中处理图形界面登录和验证码
- 🔌 **SOCKS5 代理**：`127.0.0.1:1080`，连接后自动可用
- 🌐 **HTTP 智能分流代理**：`127.0.0.1:8080`，基于规则自动分流
- 📋 **规则管理**：支持域名、IP、CIDR 规则配置
- 🔐 **密码安全存储**：使用系统密钥环加密保存密码
- 📊 **实时日志**：查看容器运行状态和代理请求日志
- 🎨 **现代界面**：基于 Tauri + React 的流畅用户体验

## 📋 系统要求

- **操作系统**：Windows 10/11（目前仅支持 Windows）
- **Docker Desktop**：[下载地址](https://www.docker.com/products/docker-desktop/)
  - 确保 Docker Desktop 已安装并正在运行
  - 确保 WSL2 后端已正确配置

## 🚀 安装使用

### 方式一：下载安装包（推荐）

1. 前往 [Releases](https://github.com/xyanmi/quick-easyconnect-proxy/releases) 页面
2. 下载最新版本的安装包（`.msi` 或 `.exe`）
3. 运行安装程序完成安装
4. 确保 Docker Desktop 正在运行
5. 启动 Quick EasyConnect Proxy

### 方式二：从源码构建

```bash
# 克隆仓库
git clone https://github.com/xyanmi/quick-easyconnect-proxy.git
cd quick-easyconnect-proxy

# 安装依赖
npm install

# 开发模式运行
npm run tauri dev

# 构建生产版本
npm run tauri build
```

## 📖 使用指南

### 基本使用

1. **配置连接信息**

   - 打开 Settings 页面
   - 填写 VPN 服务器地址（可选，用于记录）
   - 设置 VNC 密码（默认：`vnc123`）
2. **启动连接**

   - 在 Connect 页面点击 "Start"
   - 等待 Docker 容器启动完成
   - VNC 查看器会自动连接显示 EasyConnect 界面
3. **处理登录**

   - 在 VNC 界面中输入您的 VPN 账号密码
   - 处理任何验证码或双重认证
4. **使用代理**

   - SOCKS5 代理：`127.0.0.1:1080`（始终可用）
   - HTTP 代理：在 HTTP 页面配置规则后启动 `127.0.0.1:8080`

### 配置代理规则

在 HTTP 页面中：

1. 添加需要走代理的域名或 IP：

   - 域名：`*.internal.example.com`
   - IP：`192.168.1.100`
   - CIDR：`10.0.0.0/8`
2. 点击 "Start" 启动 HTTP 代理
3. 配置您的应用程序使用 `http://127.0.0.1:8080` 代理

### SSH 配置示例

在 `~/.ssh/config` 中添加：

```ssh
# 通过 SOCKS5 代理连接内网服务器 
Host *.internal.example.com
    ProxyCommand "C:\Program Files\Git\mingw64\bin\connect.exe" -S 127.0.0.1:1080 %h %p

# 通过 HTTP 代理连接 
Host 10.* 192.168.*
    ProxyCommand "C:\Program Files\Git\mingw64\bin\connect.exe" -H 127.0.0.1:8080 %h %p
```

### 环境变量配置

```bash
# SOCKS5 代理
export ALL_PROXY=socks5://127.0.0.1:1080

# HTTP 代理
export HTTP_PROXY=http://127.0.0.1:8080
export HTTPS_PROXY=http://127.0.0.1:8080
```

## 🔧 常见问题

### 端口被占用

如果看到端口占用错误，停止现有容器：

**PowerShell (Windows):**

```powershell
docker ps -q --filter ancestor=hagb/docker-easyconnect:7.6.3 | ForEach-Object { docker stop $_ }
```

**Bash (Linux/Mac):**

```bash
docker ps -q --filter ancestor=hagb/docker-easyconnect:7.6.3 | xargs -r docker stop
```

### VNC 连接失败

1. 等待几秒让容器完全启动
2. 检查 Docker 容器状态：`docker ps`
3. 点击 VNC 查看器中的 "Retry" 按钮

### 代理不工作

1. 确保容器已连接
2. 检查 SOCKS5 (1080) 或 HTTP (8080) 代理是否已启动
3. 验证应用程序的代理设置正确

## 🛠️ 技术栈

- **后端**：[Tauri v2](https://tauri.app/) (Rust)
- **前端**：React + TypeScript + [Tailwind CSS](https://tailwindcss.com/)
- **VNC**：[noVNC](https://novnc.com/)
- **状态管理**：[Zustand](https://zustand-demo.pmnd.rs/)
- **图标**：[Lucide Icons](https://lucide.dev/)

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源。

---

**注意**：本项目仅供学习交流使用，请遵守当地法律法规。
