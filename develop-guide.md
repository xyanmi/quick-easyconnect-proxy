
# Project: EasyConnect-Resurrection (Tauri Desktop Tool)

## 1. 项目概述 (Overview)

本项目是一个基于 **Tauri** 的桌面工具，旨在通过 **Docker Desktop** 隔离运行 EasyConnect 客户端。它通过 Rust 后端管理 Docker 容器，并提供一个天蓝色风格的 React 前端界面，集成 **noVNC** 供用户处理图形验证码，同时自动管理分流代理规则，确保与现有的 Clash/Mihomo 不冲突。

## 2. 技术栈 (Tech Stack)

* **Framework** : [Tauri v2](https://v2.tauri.app/) (Rust 后端, React 前端)
* **Frontend** : React + Tailwind CSS + Lucide Icons (图标)
* **VNC Solution** : [noVNC](https://github.com/novnc/noVNC) (在 WebView 中渲染远程桌面) + [websockify](https://github.com/novnc/websockify) (由 Rust 侧启动，将 TCP 5901 转为 WebSocket)
* **State Management** : `zustand` (轻量级状态管理)
* **Styling** : 仿 **Clash Verge Rev** 风格，主色调：天蓝色 (`#00aaff`)，亮色模式。

---

## 3. 核心功能需求 (Features)

### A. Docker 自动化管理

* **环境检测** ：启动时检测本地 `docker` 指令是否可用。
* **容器生命周期** ：
* 点击“连接”：后台执行 `docker run` 命令。
* 退出应用：自动执行 `docker stop` 销毁容器（`--rm` 模式）。
* **自动填充** ：支持从配置文件读取 `USERNAME`, `PASSWORD`, `VPN_URL` 并作为环境变量传入。

### B. 内嵌交互 (VNC Integration)

* **免外置软件** ：前端集成 `noVNC` 库。用户直接在 Tauri 窗口内看到 EasyConnect 登录界面。
* **手动/自动登录** ：用户可在 VNC 画面点击验证码。若只需账密，支持通过模拟按键或环境变量尝试自动登录。

### C. 智能代理分流 (Proxy & Routing)

* **不污染系统代理** ：默认仅监听 `127.0.0.1:1080` (SOCKS5)。
* **配置生成器** ：
* 提供一个 `config.yaml` 编辑页面，用户填入内网域名/IP 段（如 `*.itp.ac.cn`, `10.0.0.0/8`）。
* 工具自动生成一段 Clash 节点代码供用户复制，或直接生成一个本地 PAC 文件。
* **进阶** ：支持一键切换系统代理（可选）。

### D. UI/UX 体验

* **风格定制** ：侧边栏导航，天蓝色渐变按钮，卡片式布局。
* **系统托盘** ：支持最小化到任务栏图标，右键菜单包含“快速连接/断开”。
* **状态反馈** ：实时显示 Docker 日志流和 VPN 连接状态。

---

## 4. 给 Claude Code 的实现指南 (Implementation Steps)

### 第一阶段：Rust 后端逻辑 (src-tauri/src/main.rs)

1. **Command 定义** ：编写 `start_vpn_container` 和 `stop_vpn_container`。
2. **进程管理** ：使用 `std::process::Command` 启动 Docker。
3. **日志推送** ：使用 Tauri 的 `Window.emit()` 将 Docker 的 `stdout` 实时推送到前端。
4. **Websockify 桥接** ：集成一个轻量级的 WebSocket 转发器（或调用 node 脚本），将容器 5901 端口转给 noVNC。

### 第二阶段：前端界面 (src/components)

1. **Sidebar** : 包含 [连接, 规则配置, 日志, 设置]。
2. **VNCViewer** : 使用 `novnc-node` 或原生 JS 库，连接到 `ws://localhost:6080`。
3. **ConfigEditor** : Monaco Editor 或简单文本框，用于编辑分流规则。

### 第三阶段：样式规范 (Tailwind Config)

* **Primary** : `#00aaff` (Sky Blue)
* **Background** : `#f5f7fa` (Light Gray/Blue)
* **Border Radius** : `12px` (Rounded look like Modern Windows Apps)

---

## 5. 具体的 Docker 执行参数参考

**Bash**

```
# 最终工具应执行的底层指令模板
docker run --rm --privileged --device /dev/net/tun \
  -v "{app_data_path}/.ecdata:/root" \
  -p 127.0.0.1:5901:5901 \
  -p 127.0.0.1:1080:1080 \
  -e PASSWORD={vnc_password} \
  -e EC_VER=7.6.3 \
  hagb/docker-easyconnect:7.6.3
```
