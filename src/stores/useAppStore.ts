import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export interface ProxyRule {
  pattern: string;
  rule_type: "Domain" | "Ip" | "Cidr";
}

export interface AppConfig {
  username: string;
  password: string;
  server_url: string;
  vnc_password: string;
  ec_version: string;
  proxy_rules: ProxyRule[];
}

interface AppState {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  dockerAvailable: boolean | null;

  // Config
  config: AppConfig;

  // Logs
  logs: string[];

  // VNC state
  vncConnected: boolean;

  // Actions
  checkDocker: () => Promise<void>;
  startConnection: () => Promise<void>;
  stopConnection: () => Promise<void>;
  loadConfig: () => Promise<void>;
  saveConfig: (config: AppConfig) => Promise<void>;
  addLog: (log: string) => void;
  clearLogs: () => void;
  setVncConnected: (connected: boolean) => void;
}

const defaultConfig: AppConfig = {
  username: "",
  password: "",
  server_url: "",
  vnc_password: "vnc123",
  ec_version: "7.6.3",
  proxy_rules: [
    { pattern: "*.internal.example.com", rule_type: "Domain" },
    { pattern: "10.0.0.0/8", rule_type: "Cidr" },
  ],
};

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  isConnected: false,
  isConnecting: false,
  dockerAvailable: null,
  config: defaultConfig,
  logs: [],
  vncConnected: false,

  // Actions
  checkDocker: async () => {
    try {
      const available = await invoke<boolean>("check_docker_available");
      set({ dockerAvailable: available });
      get().addLog(available ? "Docker is available" : "Docker is not available");
    } catch (error) {
      set({ dockerAvailable: false });
      get().addLog(`Docker check failed: ${error}`);
    }
  },

  startConnection: async () => {
    const { config, addLog } = get();
    set({ isConnecting: true });
    addLog("Starting network container...");

    try {
      // Start the container
      const containerId = await invoke<string>("start_network_container", {
        vncPassword: config.vnc_password,
        ecVersion: config.ec_version,
      });

      addLog(`Container started: ${containerId}`);

      // Wait for container to fully initialize (VNC service needs time to start)
      addLog("Waiting for VNC service to be ready...");
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Start websockify for VNC
      await invoke("start_websockify");
      addLog("Websockify started on port 6080");

      set({ isConnected: true, isConnecting: false });
      addLog("Network connection established");
    } catch (error) {
      set({ isConnecting: false });
      addLog(`Failed to start container: ${error}`);
    }
  },

  stopConnection: async () => {
    const { addLog } = get();
    addLog("Stopping network container...");

    try {
      await invoke("stop_network_container");
      await invoke("stop_websockify");
      set({ isConnected: false, vncConnected: false });
      addLog("Network container stopped");
    } catch (error) {
      addLog(`Failed to stop container: ${error}`);
    }
  },

  loadConfig: async () => {
    try {
      const config = await invoke<AppConfig>("load_config");
      set({ config: { ...defaultConfig, ...config } });
    } catch (error) {
      console.error("Failed to load config:", error);
    }
  },

  saveConfig: async (config: AppConfig) => {
    try {
      await invoke("save_config", { config });
      set({ config });
    } catch (error) {
      console.error("Failed to save config:", error);
      throw error;
    }
  },

  addLog: (log: string) => {
    const timestamp = new Date().toLocaleTimeString();
    set((state) => ({
      logs: [...state.logs, `[${timestamp}] ${log}`],
    }));
  },

  clearLogs: () => {
    set({ logs: [] });
  },

  setVncConnected: (connected: boolean) => {
    set({ vncConnected: connected });
  },
}));

// Setup event listeners
export async function setupEventListeners() {
  // Listen for container events from Rust backend
  await listen<string>("container-started", (event: { payload: string }) => {
    useAppStore.getState().addLog(`Container started: ${event.payload}`);
  });

  await listen("container-stopped", () => {
    useAppStore.getState().addLog("Container stopped");
    useAppStore.setState({ isConnected: false });
  });

  // Listen for tray events
  await listen("tray-connect", () => {
    useAppStore.getState().startConnection();
  });

  await listen("tray-disconnect", () => {
    useAppStore.getState().stopConnection();
  });
}
