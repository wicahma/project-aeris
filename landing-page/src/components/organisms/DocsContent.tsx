import React, { useState } from 'react';

export const DocsContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'curl' | 'brew' | 'apt'>('curl');
  const [langTab, setLangTab] = useState<'curl' | 'go' | 'ts'>('curl');
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const queryCode = {
    curl: `curl -X POST http://localhost:9090/api/v1/query \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer aeris_...95e0" \\
  -d '{"query": "SELECT id, name, latency_ms FROM nodes WHERE status = \\'active\\' LIMIT 10;"}'`,
    go: `package main

import (
    "bytes"
    "net/http"
)

func main() {
    body := []byte(\`{"query":"SELECT * FROM nodes WHERE status='active'"}\`)
    req, _ := http.NewRequest("POST", "http://localhost:9090/api/v1/query", bytes.NewBuffer(body))
    req.Header.Set("Authorization", "Bearer aeris_live_8f3d9b1c72e4401a95e0")
    http.DefaultClient.Do(req)
}`,
    ts: `const res = await fetch('http://localhost:9090/api/v1/query', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer aeris_live_8f3d9b1c72e4401a95e0'
  },
  body: JSON.stringify({ query: "SELECT * FROM nodes WHERE status = 'active'" })
});
const data = await res.json();`
  };

  const copyText = (text: string, id: string) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedSnippet(id);
        setTimeout(() => setCopiedSnippet(null), 1400);
      });
    }
  };

  return (
    <article className="flex-1 max-w-4xl p-6 lg:p-12 space-y-16">
      <div>
        <h1 className="font-display font-semibold text-4xl text-fg mb-4">Aeris Documentation</h1>
        <p className="text-muted text-lg leading-relaxed">
          Complete technical specification, REST API contracts, and operational guides for the Aeris embedded database management system.
        </p>
      </div>

      <section id="overview" className="space-y-4 border-t border-border pt-10">
        <h2 className="font-display font-semibold text-2xl text-fg">Overview</h2>
        <p className="text-muted leading-relaxed">
          Aeris is a single-binary embedded DBMS written in Golang. It uses bbolt as its storage engine with a Write-Ahead Log (WAL) for durability, and embeds a React web console compiled directly into the binary via <code className="font-mono text-accent">go:embed</code>. The system exposes a REST API for authentication, querying, table management, and health checks.
        </p>
        <div className="bg-surface border-l-2 border-accent p-4 text-sm font-mono text-muted">
          <strong className="text-fg">Core Invariant:</strong> Aeris compiles all database routines, HTTP route handlers, and frontend web assets into a single static binary. You copy one file to run the entire system.
        </div>
      </section>

      <section id="installation" className="space-y-4 border-t border-border pt-10">
        <h2 className="font-display font-semibold text-2xl text-fg">Installation</h2>
        <p className="text-muted leading-relaxed">
          Choose your preferred installation method. All targets receive the identical self-contained executable.
        </p>

        <div className="bg-surface border border-border rounded-sm overflow-hidden font-mono text-xs">
          <div className="flex justify-between items-center border-b border-border bg-surface-2 px-3 py-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('curl')}
                className={`px-3 py-1 cursor-pointer transition-colors ${activeTab === 'curl' ? 'text-accent border-b-2 border-accent' : 'text-muted hover:text-fg'}`}
              >
                Shell Script
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('brew')}
                className={`px-3 py-1 cursor-pointer transition-colors ${activeTab === 'brew' ? 'text-accent border-b-2 border-accent' : 'text-muted hover:text-fg'}`}
              >
                Homebrew
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('apt')}
                className={`px-3 py-1 cursor-pointer transition-colors ${activeTab === 'apt' ? 'text-accent border-b-2 border-accent' : 'text-muted hover:text-fg'}`}
              >
                APT
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                const map = {
                  curl: 'curl -fsSL https://get.diama.dev/aeris.sh | sh',
                  brew: 'brew tap wicahma/aeris\nbrew install aeris',
                  apt: 'curl -1sLf \'https://dl.diama.dev/aeris/gpgkey\' | sudo gpg --dearmor -o /etc/apt/keyrings/aeris.gpg\nsudo apt-get update && sudo apt-get install aeris'
                };
                copyText(map[activeTab], 'install');
              }}
              className="text-muted hover:text-fg text-[11px] px-2 py-0.5 border border-border rounded-sm cursor-pointer"
            >
              {copiedSnippet === 'install' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="p-4 bg-code-bg">
            {activeTab === 'curl' && (
              <pre><code><span className="text-accent mr-2">$</span>curl -fsSL https://get.diama.dev/aeris.sh | sh</code></pre>
            )}
            {activeTab === 'brew' && (
              <pre className="space-y-1">
                <div><span className="text-accent mr-2">$</span>brew tap wicahma/aeris</div>
                <div><span className="text-accent mr-2">$</span>brew install aeris</div>
              </pre>
            )}
            {activeTab === 'apt' && (
              <pre className="space-y-1">
                <div><span className="text-accent mr-2">$</span>curl -1sLf 'https://dl.diama.dev/aeris/gpgkey' | sudo gpg --dearmor -o /etc/apt/keyrings/aeris.gpg</div>
                <div><span className="text-accent mr-2">$</span>sudo apt-get update &amp;&amp; sudo apt-get install aeris</div>
              </pre>
            )}
          </div>
        </div>
      </section>

      <section id="quickstart" className="space-y-4 border-t border-border pt-10">
        <h2 className="font-display font-semibold text-2xl text-fg">Quick Start</h2>
        <p className="text-muted leading-relaxed">
          Start the server daemon and begin executing queries immediately.
        </p>
        <div className="bg-code-bg border border-border p-4 rounded-sm font-mono text-xs space-y-1 text-muted">
          <div><span className="text-accent mr-2">$</span>aeris server --port 9090 --data-dir ./aeris-data</div>
          <div className="text-accent">[INFO] Storage engine initialized: bbolt (WAL active)</div>
          <div className="text-accent">[INFO] Embedded Web Console listening at http://localhost:9090</div>
          <div className="text-accent">[INFO] REST API routing ready at http://localhost:9090/api/v1</div>
        </div>
        <p className="text-sm text-muted">
          Open <code className="font-mono text-accent">http://localhost:9090</code> in your browser to access the interactive CodeMirror 6 query workspace.
        </p>
      </section>

      <section id="architecture" className="space-y-4 border-t border-border pt-10">
        <h2 className="font-display font-semibold text-2xl text-fg">Architecture</h2>
        <p className="text-muted leading-relaxed">
          Aeris is composed of four decoupled subsystems residing in the same runtime:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-surface border border-border rounded-sm">
            <h3 className="font-mono font-medium text-fg text-sm mb-2">1. Storage Engine (bbolt)</h3>
            <p className="text-xs text-muted leading-relaxed">
              ACID compliant B+ tree key-value store with byte-level transactions and Write-Ahead Logging.
            </p>
          </div>
          <div className="p-4 bg-surface border border-border rounded-sm">
            <h3 className="font-mono font-medium text-fg text-sm mb-2">2. HTTP Router &amp; API</h3>
            <p className="text-xs text-muted leading-relaxed">
              Standard net/http mux serving JSON payloads, token validation, and table introspections.
            </p>
          </div>
          <div className="p-4 bg-surface border border-border rounded-sm">
            <h3 className="font-mono font-medium text-fg text-sm mb-2">3. Static Asset Embedding</h3>
            <p className="text-xs text-muted leading-relaxed">
              Single virtual filesystem compiled at build time via native Go 1.16+ embed package.
            </p>
          </div>
          <div className="p-4 bg-surface border border-border rounded-sm">
            <h3 className="font-mono font-medium text-fg text-sm mb-2">4. Web Console Client</h3>
            <p className="text-xs text-muted leading-relaxed">
              React + TypeScript single-page app bundled with CodeMirror 6 and Lucide icons.
            </p>
          </div>
        </div>
      </section>

      <section id="storage-engine" className="space-y-4 border-t border-border pt-10">
        <h2 className="font-display font-semibold text-2xl text-fg">Storage &amp; WAL Engine</h2>
        <p className="text-muted leading-relaxed">
          Aeris uses <a href="https://github.com/etcd-io/bbolt" className="text-accent underline" target="_blank" rel="noopener noreferrer">bbolt</a> — a B+ tree key-value store — with an append-only Write-Ahead Log (WAL) for crash recovery. All mutating transactions write to the WAL before flushing to bbolt, guaranteeing durability across ungraceful shutdowns.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm bg-surface border border-border rounded-sm">
            <thead className="border-b border-border font-mono text-faint uppercase text-[11px]">
              <tr>
                <th className="p-3">Property</th>
                <th className="p-3">Specification</th>
                <th className="p-3">Description</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs">
              <tr className="border-b border-border/60">
                <td className="p-3 text-fg">Storage Engine</td>
                <td className="p-3 text-accent">bbolt</td>
                <td className="p-3 text-muted">B+ tree key-value store with single-writer, multiple-reader concurrency.</td>
              </tr>
              <tr className="border-b border-border/60">
                <td className="p-3 text-fg">Sync Mode</td>
                <td className="p-3 text-accent">WAL + fdatasync</td>
                <td className="p-3 text-muted">Append-only write-ahead log flushes to disk on transaction commit.</td>
              </tr>
              <tr>
                <td className="p-3 text-fg">Concurrency</td>
                <td className="p-3 text-accent">Single-writer / MVCC</td>
                <td className="p-3 text-muted">Serialized writes, lock-free concurrent reads via bbolt transactions.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="web-console" className="space-y-4 border-t border-border pt-10">
        <h2 className="font-display font-semibold text-2xl text-fg">Embedded Web Console</h2>
        <p className="text-muted leading-relaxed">
          The console enables direct browser access without separate database clients like DBeaver or TablePlus. Features include:
        </p>
        <ul className="list-none space-y-2 text-muted font-mono text-sm">
          <li><span className="text-accent mr-2">▸</span>CodeMirror 6 editor with SQL syntax highlighting and keyword completion.</li>
          <li><span className="text-accent mr-2">▸</span>Schema tree visualizer with instant column types and row-count metrics.</li>
          <li><span className="text-accent mr-2">▸</span>Inline JSON and tabular result renderers with CSV export.</li>
        </ul>
      </section>

      <section id="auth-sessions" className="space-y-4 border-t border-border pt-10">
        <h2 className="font-display font-semibold text-2xl text-fg">Auth &amp; Permissions</h2>
        <p className="text-muted leading-relaxed">
          Aeris supports Bearer token authentication via the <code className="font-mono text-accent">POST /api/v1/auth/login</code> endpoint. Tokens are scoped to read-only or read-write privilege levels per session.
        </p>
        <div className="bg-surface border-l-2 border-accent p-4 text-sm font-mono text-muted">
          <strong className="text-fg">Note:</strong> The <code className="text-accent">GET /api/v1/health</code> endpoint is publicly accessible and does not require authentication. All other endpoints require a valid Bearer token.
        </div>
      </section>

      <section id="api-overview" className="space-y-4 border-t border-border pt-10">
        <h2 className="font-display font-semibold text-2xl text-fg">REST API Overview</h2>
        <p className="text-muted leading-relaxed">
          Every query, mutation, and schema inspection can be performed via standard HTTP JSON requests.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm bg-surface border border-border rounded-sm">
            <thead className="border-b border-border font-mono text-faint uppercase text-[11px]">
              <tr>
                <th className="p-3">Header</th>
                <th className="p-3">Format</th>
                <th className="p-3">Required</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs">
              <tr className="border-b border-border/60">
                <td className="p-3 text-fg">Authorization</td>
                <td className="p-3 text-accent">Bearer &lt;token&gt;</td>
                <td className="p-3 text-muted">Required (except for /health and /auth/login)</td>
              </tr>
              <tr>
                <td className="p-3 text-fg">Content-Type</td>
                <td className="p-3 text-accent">application/json</td>
                <td className="p-3 text-muted">Yes (for POST requests)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="api-auth-login" className="space-y-4 border-t border-border pt-10">
        <h2 className="font-display font-semibold text-2xl text-fg font-mono">POST /api/v1/auth/login</h2>
        <p className="text-muted leading-relaxed">Authenticate and retrieve a session token for subsequent API calls.</p>
        <div className="bg-surface border border-border rounded-sm overflow-hidden font-mono text-xs">
          <div className="flex justify-between items-center border-b border-border bg-surface-2 px-3 py-2">
            <span className="text-faint text-[11px] uppercase tracking-wider">cURL</span>
            <button
              type="button"
              onClick={() => copyText("curl -X POST http://localhost:9090/api/v1/auth/login \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"username\": \"admin\", \"password\": \"...\"}'", 'login')}
              className="text-muted hover:text-fg text-[11px] px-2 py-0.5 border border-border rounded-sm cursor-pointer"
            >
              {copiedSnippet === 'login' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="p-4 bg-code-bg overflow-x-auto">
            <pre><code>{`curl -X POST http://localhost:9090/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"username": "admin", "password": "..."}'`}</code></pre>
          </div>
        </div>
      </section>

      <section id="api-query" className="space-y-4 border-t border-border pt-10">
        <h2 className="font-display font-semibold text-2xl text-fg font-mono">POST /api/v1/query</h2>
        <p className="text-muted leading-relaxed">
          Execute arbitrary SQL statements and receive structured tabular data or row modification counts.
        </p>
        <div className="bg-surface border border-border rounded-sm overflow-hidden font-mono text-xs">
          <div className="flex justify-between items-center border-b border-border bg-surface-2 px-3 py-2">
            <div className="flex gap-2">
              {(['curl', 'go', 'ts'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setLangTab(t)}
                  className={`px-3 py-1 cursor-pointer transition-colors ${langTab === t ? 'text-accent border-b-2 border-accent' : 'text-muted hover:text-fg'}`}
                >
                  {t === 'curl' ? 'cURL' : t === 'go' ? 'Go' : 'TypeScript'}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => copyText(queryCode[langTab], 'query')}
              className="text-muted hover:text-fg text-[11px] px-2 py-0.5 border border-border rounded-sm cursor-pointer"
            >
              {copiedSnippet === 'query' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="p-4 bg-code-bg overflow-x-auto whitespace-pre"><code>{queryCode[langTab]}</code></div>
        </div>
        <h3 className="font-display font-semibold text-lg text-fg">Response Format</h3>
        <div className="bg-surface border border-border rounded-sm overflow-hidden font-mono text-xs">
          <div className="flex justify-between items-center border-b border-border bg-surface-2 px-3 py-2">
            <span className="text-faint text-[11px] uppercase tracking-wider">Response (200 OK)</span>
            <button
              type="button"
              onClick={() => copyText('{\n  "status": "ok",\n  "execution_time_ms": 1.24,\n  "columns": ["id", "name", "latency_ms"],\n  "rows": [\n    [1, "edge-sgp-01", 2.4],\n    [2, "edge-jkt-02", 8.1]\n  ]\n}', 'resp')}
              className="text-muted hover:text-fg text-[11px] px-2 py-0.5 border border-border rounded-sm cursor-pointer"
            >
              {copiedSnippet === 'resp' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="p-4 bg-code-bg overflow-x-auto whitespace-pre"><code>{'{\n  "status": "ok",\n  "execution_time_ms": 1.24,\n  "columns": ["id", "name", "latency_ms"],\n  "rows": [\n    [1, "edge-sgp-01", 2.4],\n    [2, "edge-jkt-02", 8.1]\n  ]\n}'}</code></div>
        </div>
      </section>

      <section id="api-tables" className="space-y-4 border-t border-border pt-10">
        <h2 className="font-display font-semibold text-2xl text-fg font-mono">GET /api/v1/tables</h2>
        <p className="text-muted leading-relaxed">
          List all registered tables, column schemas, index layouts, and estimated record counts.
        </p>
      </section>

      <section id="api-health" className="space-y-4 border-t border-border pt-10">
        <h2 className="font-display font-semibold text-2xl text-fg font-mono">GET /api/v1/health</h2>
        <p className="text-muted leading-relaxed">
          Retrieve daemon process health, uptime, active connections, and buffer pool stats.
        </p>
      </section>

      <section id="cli-server" className="space-y-4 border-t border-border pt-10">
        <h2 className="font-display font-semibold text-2xl text-fg font-mono">aeris server</h2>
        <p className="text-muted leading-relaxed">Start the server runtime with custom binding flags.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm bg-surface border border-border rounded-sm">
            <thead className="border-b border-border font-mono text-faint uppercase text-[11px]">
              <tr>
                <th className="p-3">Flag</th>
                <th className="p-3">Default</th>
                <th className="p-3">Description</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs">
              <tr className="border-b border-border/60">
                <td className="p-3 text-fg">--port</td>
                <td className="p-3 text-accent">9090</td>
                <td className="p-3 text-muted">TCP port to bind web console and REST API.</td>
              </tr>
              <tr className="border-b border-border/60">
                <td className="p-3 text-fg">--data-dir</td>
                <td className="p-3 text-accent">./data</td>
                <td className="p-3 text-muted">Directory storing WAL and B+ tree page files.</td>
              </tr>
              <tr>
                <td className="p-3 text-fg">--in-memory</td>
                <td className="p-3 text-accent">false</td>
                <td className="p-3 text-muted">Run volatile in-memory engine without disk persistence.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="cli-cli" className="space-y-4 border-t border-border pt-10">
        <h2 className="font-display font-semibold text-2xl text-fg font-mono">aeris cli</h2>
        <p className="text-muted leading-relaxed">
          Launch an interactive terminal REPL connected to a local or remote Aeris instance.
        </p>
      </section>

      <section id="cli-backup" className="space-y-4 border-t border-border pt-10">
        <h2 className="font-display font-semibold text-2xl text-fg font-mono">aeris backup</h2>
        <p className="text-muted leading-relaxed">
          Perform an atomic hot snapshot of the database file without stopping active transactions.
        </p>
      </section>
    </article>
  );
};
