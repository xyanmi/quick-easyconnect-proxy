import { Terminal, Globe, Server, HelpCircle, AlertTriangle } from "lucide-react";

export default function HelpPage() {
  return (
    <div className="h-full overflow-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <HelpCircle size={28} />
          Help & Guides
        </h1>
        <p className="text-text-secondary mt-1">
          Configuration guides and troubleshooting tips
        </p>
      </div>

      {/* Quick Troubleshooting */}
      <div className="card mb-6 border-l-4 border-l-yellow-500">
        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <AlertTriangle size={20} className="text-yellow-500" />
          Quick Troubleshooting
        </h3>

        <div className="space-y-4">
          <div className="p-4 bg-yellow-50 rounded-lg">
            <h4 className="font-medium text-yellow-800 mb-2">Port Already in Use Error</h4>
            <p className="text-sm text-yellow-700 mb-3">
              If you see an error about port being in use, stop the existing container:
            </p>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-yellow-600 mb-1">PowerShell (Windows):</p>
                <code className="block bg-gray-900 text-green-400 p-2 rounded text-xs font-mono">
                  docker ps -q --filter ancestor=hagb/docker-easyconnect:7.6.3 | ForEach-Object {"{"} docker stop $_ {"}"}
                </code>
              </div>
              <div>
                <p className="text-xs text-yellow-600 mb-1">Bash (Linux/Mac):</p>
                <code className="block bg-gray-900 text-green-400 p-2 rounded text-xs font-mono">
                  docker ps -q --filter ancestor=hagb/docker-easyconnect:7.6.3 | xargs -r docker stop
                </code>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-text-primary mb-2">VNC Connection Failed</h4>
            <ul className="text-sm text-text-secondary space-y-1 list-disc list-inside">
              <li>Wait a few seconds after container starts</li>
              <li>Check if Docker container is running: <code className="bg-gray-200 px-1 rounded">docker ps</code></li>
              <li>Try the Retry button in VNC viewer</li>
            </ul>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-text-primary mb-2">Proxy Not Working</h4>
            <ul className="text-sm text-text-secondary space-y-1 list-disc list-inside">
              <li>Ensure the container is running and connected</li>
              <li>Check if SOCKS5 (1080) or HTTP (8080) proxy is started</li>
              <li>Verify your application is configured with correct proxy settings</li>
            </ul>
          </div>
        </div>
      </div>

      {/* SSH Configuration */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Terminal size={20} />
          SSH Configuration
        </h3>

        <div className="p-4 bg-gray-50 rounded-lg mb-4">
          <h4 className="font-medium text-text-primary mb-2">SSH Config (~/.ssh/config)</h4>
          <p className="text-sm text-text-secondary mb-3">
            Add this to your SSH config file for automatic proxy usage:
          </p>
          <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto">
{`# Internal servers via SOCKS5 proxy
Host *.example.com
    ProxyCommand connect -S 127.0.0.1:1080 %h %p
    # Use absolute path if 'connect' is not in your system PATH:
    # ProxyCommand "C:\Program Files\Git\mingw64\bin\connect.exe" -S 127.0.0.1:1080 %h %p

# Internal IP ranges via HTTP proxy
Host 10.* 192.168.*
    ProxyCommand connect -H 127.0.0.1:8080 %h %p

# Specific server example
Host myserver.example.com
    User myusername
    ProxyCommand connect -S 127.0.0.1:1080 %h %p`}
          </pre>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-text-primary mb-2">SOCKS5 (127.0.0.1:1080)</h4>
            <code className="block bg-gray-900 text-green-400 p-2 rounded text-xs font-mono">
              ssh -o ProxyCommand "C:\Program Files\Git\mingw64\bin\connect.exe" -S 127.0.0.1:1080 %h %p user@host
            </code>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-text-primary mb-2">HTTP (127.0.0.1:8080)</h4>
            <code className="block bg-gray-900 text-green-400 p-2 rounded text-xs font-mono">
              ssh -o ProxyCommand "C:\Program Files\Git\mingw64\bin\connect.exe" -H 127.0.0.1:8080 %h %p user@host
            </code>
          </div>
        </div>
      </div>

      {/* Proxy Configuration */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Globe size={20} />
          Proxy Configuration
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-1">SOCKS5 Proxy</h4>
            <p className="text-lg font-mono text-blue-600">127.0.0.1:1080</p>
            <p className="text-xs text-blue-600 mt-1">Always available when connected</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <h4 className="font-medium text-purple-800 mb-1">HTTP Proxy</h4>
            <p className="text-lg font-mono text-purple-600">127.0.0.1:8080</p>
            <p className="text-xs text-purple-600 mt-1">Rule-based routing (HTTP page)</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-text-primary mb-2">curl</h4>
            <div className="grid grid-cols-2 gap-2">
              <code className="block bg-gray-900 text-green-400 p-2 rounded text-xs font-mono">
                curl --socks5 127.0.0.1:1080 http://example.com
              </code>
              <code className="block bg-gray-900 text-green-400 p-2 rounded text-xs font-mono">
                curl --proxy http://127.0.0.1:8080 http://example.com
              </code>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-text-primary mb-2">Git</h4>
            <code className="block bg-gray-900 text-green-400 p-2 rounded text-xs font-mono">
              git -c http.proxy=http://127.0.0.1:8080 clone https://repo.example.com
            </code>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-text-primary mb-2">Environment Variables</h4>
            <pre className="bg-gray-900 text-green-400 p-2 rounded text-xs font-mono">
{`# For SOCKS5
export ALL_PROXY=socks5://127.0.0.1:1080

# For HTTP
export HTTP_PROXY=http://127.0.0.1:8080
export HTTPS_PROXY=http://127.0.0.1:8080`}
            </pre>
          </div>
        </div>
      </div>

      {/* Termius & Browser */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Server size={20} />
          Applications
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-text-primary mb-2">Termius</h4>
            <ol className="text-sm text-text-secondary space-y-1 list-decimal list-inside">
              <li>Settings → Proxy</li>
              <li>Enable "Use Proxy"</li>
              <li>SOCKS5: 127.0.0.1:1080</li>
              <li>HTTP: 127.0.0.1:8080</li>
            </ol>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-text-primary mb-2">Browser (SwitchyOmega)</h4>
            <ol className="text-sm text-text-secondary space-y-1 list-decimal list-inside">
              <li>Install SwitchyOmega extension</li>
              <li>Create Proxy Profile</li>
              <li>Set protocol & port</li>
              <li>Configure auto-switch rules</li>
            </ol>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="card">
        <h3 className="text-lg font-semibold text-text-primary mb-4">About</h3>
        <div className="space-y-2 text-text-secondary">
          <p>
            <strong>Quick EasyConnect Proxy</strong> - Version 0.1.0
          </p>
          <p className="text-sm">
            A desktop tool for running EasyConnect in Docker isolation with
            built-in VNC viewer and proxy management.
          </p>
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-text-muted">
              Built with Tauri v2, React, and Tailwind CSS
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
