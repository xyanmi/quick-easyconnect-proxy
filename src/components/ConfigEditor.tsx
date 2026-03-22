import { useState } from "react";
import { Copy, Check, Plus, Trash2 } from "lucide-react";

interface Rule {
  id: string;
  pattern: string;
  type: "domain" | "ip" | "cidr";
}

interface ConfigEditorProps {
  onRulesChange?: (rules: Rule[]) => void;
}

export default function ConfigEditor({ onRulesChange }: ConfigEditorProps) {
  const [rules, setRules] = useState<Rule[]>([
    { id: "1", pattern: "*.internal.example.com", type: "domain" },
    { id: "2", pattern: "10.0.0.0/8", type: "cidr" },
  ]);
  const [newRule, setNewRule] = useState("");
  const [copied, setCopied] = useState(false);

  const addRule = () => {
    if (!newRule.trim()) return;

    const type = newRule.includes("/")
      ? "cidr"
      : newRule.includes(".")
      ? "ip"
      : "domain";

    const rule: Rule = {
      id: Date.now().toString(),
      pattern: newRule.trim(),
      type,
    };

    const updatedRules = [...rules, rule];
    setRules(updatedRules);
    setNewRule("");
    onRulesChange?.(updatedRules);
  };

  const removeRule = (id: string) => {
    const updatedRules = rules.filter((r) => r.id !== id);
    setRules(updatedRules);
    onRulesChange?.(updatedRules);
  };

  const generateProxyConfig = () => {
    const domainRules = rules
      .filter((r) => r.type === "domain")
      .map((r) => `  - "${r.pattern}"`)
      .join("\n");

    const ipRules = rules
      .filter((r) => r.type === "ip" || r.type === "cidr")
      .map((r) => `  - "${r.pattern}"`)
      .join("\n");

    const allRules = domainRules + (ipRules ? `\n${ipRules}` : "");

    return `# Proxy Client Extension Config
# Add this to your proxy client configuration

proxies:
  - name: "EasyConnect"
    type: socks5
    server: 127.0.0.1
    port: 1080

proxy-groups:
  - name: "Internal"
    type: select
    proxies:
      - EasyConnect
      - DIRECT

rules:
${allRules}
  - MATCH,Internal
`;
  };

  const copyToClipboard = async () => {
    const config = generateProxyConfig();
    await navigator.clipboard.writeText(config);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getRuleTypeBadge = (type: Rule["type"]) => {
    const colors = {
      domain: "bg-blue-100 text-blue-700",
      ip: "bg-green-100 text-green-700",
      cidr: "bg-purple-100 text-purple-700",
    };
    return colors[type];
  };

  return (
    <div className="space-y-6">
      {/* Add new rule */}
      <div className="card">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Add Proxy Rule
        </h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={newRule}
            onChange={(e) => setNewRule(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addRule()}
            placeholder="Enter domain (*.example.com) or IP (10.0.0.0/8)"
            className="input-field flex-1"
          />
          <button onClick={addRule} className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            Add
          </button>
        </div>
      </div>

      {/* Rules list */}
      <div className="card">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Current Rules ({rules.length})
        </h3>
        <div className="space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`px-2 py-1 text-xs font-medium rounded ${getRuleTypeBadge(
                    rule.type
                  )}`}
                >
                  {rule.type.toUpperCase()}
                </span>
                <code className="text-sm font-mono text-text-primary">
                  {rule.pattern}
                </code>
              </div>
              <button
                onClick={() => removeRule(rule.id)}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {rules.length === 0 && (
            <p className="text-center text-text-muted py-4">
              No rules added yet
            </p>
          )}
        </div>
      </div>

      {/* Generated config */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">
            Generated Proxy Config
          </h3>
          <button
            onClick={copyToClipboard}
            className="btn-secondary flex items-center gap-2"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
          {generateProxyConfig()}
        </pre>
      </div>
    </div>
  );
}
