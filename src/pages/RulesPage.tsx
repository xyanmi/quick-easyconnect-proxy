import { useState, useEffect } from "react";
import { Play, Square, Plus, Trash2, TestTube, CheckCircle, XCircle } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useAppStore, ProxyRule } from "../stores/useAppStore";

interface ProxyLogEntry {
  method: string;
  host: string;
  target: string;
  via: string;
  timestamp: string;
}

export default function RulesPage() {
  const { config, saveConfig } = useAppStore();
  const [rules, setRules] = useState(config.proxy_rules);
  const [newRule, setNewRule] = useState("");
  const [proxyRunning, setProxyRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Rule tester
  const [testInput, setTestInput] = useState("");
  const [testResult, setTestResult] = useState<{ match: boolean; matchedRule?: string } | null>(null);

  // Proxy logs
  const [proxyLogs, setProxyLogs] = useState<ProxyLogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  // Sync rules from config when it changes
  useEffect(() => {
    setRules(config.proxy_rules);
  }, [config.proxy_rules]);

  useEffect(() => {
    checkProxyStatus();

    // Listen for proxy logs
    const unlisten = listen<ProxyLogEntry>("proxy-log", (event) => {
      setProxyLogs((prev) => [event.payload, ...prev].slice(0, 100));
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const checkProxyStatus = async () => {
    try {
      const running = await invoke<boolean>("get_http_proxy_status");
      setProxyRunning(running);
    } catch (e) {
      console.error("Failed to check proxy status:", e);
    }
  };

  const saveRules = async (newRules: ProxyRule[]) => {
    try {
      await saveConfig({
        ...config,
        proxy_rules: newRules,
      });
    } catch (e) {
      console.error("Failed to save rules:", e);
    }
  };

  const addRule = async () => {
    if (!newRule.trim()) return;

    const rule_type: "Domain" | "Ip" | "Cidr" = newRule.includes("/")
      ? "Cidr"
      : newRule.includes(".")
      ? "Ip"
      : "Domain";

    const newRules = [...rules, { pattern: newRule.trim(), rule_type }];
    setRules(newRules);
    setNewRule("");
    await saveRules(newRules);
  };

  const removeRule = async (index: number) => {
    const newRules = rules.filter((_, i) => i !== index);
    setRules(newRules);
    await saveRules(newRules);
  };

  const startProxy = async () => {
    setIsLoading(true);
    try {
      const backendRules = rules.map((r) => ({
        pattern: r.pattern,
        rule_type: r.rule_type,
      }));
      await invoke("start_http_proxy", { rules: backendRules });
      setProxyRunning(true);
    } catch (e) {
      console.error("Failed to start proxy:", e);
      alert(`Failed to start proxy: ${e}`);
    } finally {
      setIsLoading(false);
    }
  };

  const stopProxy = async () => {
    setIsLoading(true);
    try {
      await invoke("stop_http_proxy");
      setProxyRunning(false);
    } catch (e) {
      console.error("Failed to stop proxy:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const testRule = () => {
    if (!testInput.trim()) return;

    const input = testInput.trim().toLowerCase();
    let matched = false;
    let matchedRule = "";

    for (const rule of rules) {
      const matches = matchRule(input, rule);
      if (matches) {
        matched = true;
        matchedRule = rule.pattern;
        break;
      }
    }

    setTestResult({ match: matched, matchedRule });
  };

  const matchRule = (input: string, rule: ProxyRule): boolean => {
    switch (rule.rule_type) {
      case "Domain":
        if (rule.pattern.startsWith("*.")) {
          const suffix = rule.pattern.slice(1);
          return input.endsWith(suffix) || input === rule.pattern.slice(2);
        }
        return input === rule.pattern.toLowerCase();

      case "Ip":
        return input === rule.pattern.toLowerCase();

      case "Cidr":
        const prefix = rule.pattern.split("/")[0];
        const parts = prefix.split(".");
        if (parts.length >= 2) {
          return input.startsWith(parts.slice(0, 2).join("."));
        }
        return input.startsWith(prefix);

      default:
        return false;
    }
  };

  const getRuleTypeBadge = (type: "Domain" | "Ip" | "Cidr") => {
    const colors = {
      Domain: "bg-blue-100 text-blue-700",
      Ip: "bg-green-100 text-green-700",
      Cidr: "bg-purple-100 text-purple-700",
    };
    return colors[type];
  };

  return (
    <div className="h-full overflow-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">HTTP Proxy</h1>
        <p className="text-text-secondary mt-1">
          Configure rule-based HTTP proxy (127.0.0.1:8080)
        </p>
      </div>

      {/* HTTP Proxy Control */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">HTTP Proxy Server</h3>
            <p className="text-sm text-text-secondary">
              Routes requests through SOCKS5 (1080) or direct based on rules
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                proxyRunning ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${proxyRunning ? "bg-green-500" : "bg-gray-400"}`}
              />
              {proxyRunning ? "Running" : "Stopped"}
            </div>
            {proxyRunning ? (
              <button onClick={stopProxy} disabled={isLoading} className="btn-danger flex items-center gap-2">
                <Square size={18} />
                Stop
              </button>
            ) : (
              <button
                onClick={startProxy}
                disabled={isLoading || rules.length === 0}
                className="btn-primary flex items-center gap-2"
              >
                <Play size={18} />
                Start
              </button>
            )}
            {proxyRunning && (
              <button
                onClick={() => setShowLogs(!showLogs)}
                className="btn-secondary flex items-center gap-2"
              >
                {showLogs ? "Hide Logs" : "Show Logs"}
              </button>
            )}
          </div>
        </div>

        {/* Proxy Logs */}
        {showLogs && proxyRunning && (
          <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Request Log</span>
              <button onClick={() => setProxyLogs([])} className="text-xs text-gray-500 hover:text-gray-700">
                Clear
              </button>
            </div>
            <div className="max-h-48 overflow-auto bg-gray-900 p-2 font-mono text-xs">
              {proxyLogs.length === 0 ? (
                <div className="text-gray-500 text-center py-4">Waiting for requests...</div>
              ) : (
                proxyLogs.map((log, i) => (
                  <div key={i} className="flex items-center gap-2 py-1">
                    <span className="text-gray-500">{log.timestamp}</span>
                    <span
                      className={`px-1 rounded ${
                        log.via === "SOCKS5" ? "bg-green-900 text-green-400" : "bg-gray-700 text-gray-400"
                      }`}
                    >
                      {log.via}
                    </span>
                    <span className="text-blue-400">{log.method}</span>
                    <span className="text-gray-300">{log.target}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div className="p-4 bg-blue-50 rounded-lg mt-4">
          <p className="text-sm text-blue-700">
            <strong>Usage:</strong> Configure your browser or applications to use{" "}
            <code className="bg-blue-100 px-1 rounded">http://127.0.0.1:8080</code> as proxy.
            Requests matching rules will go through SOCKS5, others connect directly.
          </p>
        </div>
      </div>

      {/* Rule Tester */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <TestTube size={20} />
          Rule Tester
        </h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && testRule()}
            placeholder="Enter domain or IP to test (e.g., internal.example.com)"
            className="input-field flex-1"
          />
          <button onClick={testRule} className="btn-secondary flex items-center gap-2">
            Test
          </button>
        </div>
        {testResult && (
          <div
            className={`mt-3 p-3 rounded-lg flex items-center gap-3 ${
              testResult.match ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
            }`}
          >
            {testResult.match ? (
              <>
                <CheckCircle className="text-green-500" size={20} />
                <div>
                  <p className="text-green-700 font-medium">Will use PROXY (SOCKS5)</p>
                  <p className="text-green-600 text-sm">Matched rule: {testResult.matchedRule}</p>
                </div>
              </>
            ) : (
              <>
                <XCircle className="text-red-500" size={20} />
                <div>
                  <p className="text-red-700 font-medium">Will use DIRECT connection</p>
                  <p className="text-red-600 text-sm">No rules matched</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Add new rule */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Add Rule</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={newRule}
            onChange={(e) => setNewRule(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addRule()}
            placeholder="Domain (*.example.com), IP (192.168.1.1), or CIDR (10.0.0.0/8)"
            className="input-field flex-1"
          />
          <button onClick={addRule} className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            Add
          </button>
        </div>
        <p className="text-xs text-text-muted mt-2">
          Use <code className="bg-gray-100 px-1 rounded">*.example.com</code> for wildcard domains,
          <code className="bg-gray-100 px-1 rounded">10.0.0.0/8</code> for IP ranges
        </p>
      </div>

      {/* Rules list */}
      <div className="card">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Rules ({rules.length})
        </h3>
        <div className="space-y-2">
          {rules.map((rule, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 text-xs font-medium rounded ${getRuleTypeBadge(rule.rule_type)}`}>
                  {rule.rule_type.toUpperCase()}
                </span>
                <code className="text-sm font-mono text-text-primary">{rule.pattern}</code>
              </div>
              <button
                onClick={() => removeRule(index)}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {rules.length === 0 && (
            <p className="text-center text-text-muted py-4">No rules added yet. Add rules to start the proxy.</p>
          )}
        </div>
      </div>
    </div>
  );
}
