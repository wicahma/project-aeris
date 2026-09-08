import React from 'react';

export const Features: React.FC = () => {
  return (
    <section id="features" className="py-[96px] border-b border-border">
      <div className="mb-14">
        <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-faint mb-5 block">
          <span className="text-accent">02</span> / Capabilities
        </span>
        <h2 className="font-display font-semibold text-3xl sm:text-4xl text-fg mb-4">
          Engineered for technical utility.
        </h2>
        <p className="text-muted max-w-[65ch] leading-relaxed">
          Essential developer capabilities without the architectural overhead of a platform.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-surface border border-border p-8 rounded-sm">
          <span className="font-mono text-[11px] text-accent tracking-wider block mb-3">F.01</span>
          <h3 className="font-display font-semibold text-2xl mb-3 text-fg">Web IDE &amp; Console</h3>
          <p className="text-muted text-sm leading-relaxed mb-6">
            Full SQL editor with CodeMirror 6 syntax highlighting, schema-aware autocomplete, and live table viewers - served from the same binary.
          </p>
          <div className="bg-code-bg border border-border p-4 rounded-sm font-mono text-xs text-muted mb-6">
            <span className="text-accent">SELECT</span> * <span className="text-accent">FROM</span> nodes <span className="text-accent">WHERE</span> status = 'active' <span className="text-accent">LIMIT</span> 50;
          </div>
          <a href="https://aeris-app.diama.dev" target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-accent hover:underline inline-flex items-center gap-1">
            Open live workspace &rarr;
          </a>
        </div>

        <div className="bg-surface border border-border p-8 rounded-sm flex flex-col justify-between">
          <div>
            <span className="font-mono text-[11px] text-accent tracking-wider block mb-3">F.02</span>
            <h3 className="font-display font-semibold text-xl mb-3 text-fg">Golang Performance</h3>
            <p className="text-muted text-sm leading-relaxed mb-6">
              Low memory footprint, concurrent connection pooling, in-memory mode with disk persistence.
            </p>
          </div>
          <a href="#architecture" className="font-mono text-xs text-accent hover:underline inline-flex items-center gap-1">
            View stack &rarr;
          </a>
        </div>

        <div className="bg-surface border border-border p-8 rounded-sm flex flex-col justify-between">
          <div>
            <span className="font-mono text-[11px] text-accent tracking-wider block mb-3">F.03</span>
            <h3 className="font-display font-semibold text-xl mb-3 text-fg">Automated REST APIs</h3>
            <p className="text-muted text-sm leading-relaxed mb-6">
              Expose tables over HTTP with automatic CRUD endpoints, token verification, and health checks.
            </p>
          </div>
          <a href="/docs#api-overview" className="font-mono text-xs text-accent hover:underline inline-flex items-center gap-1">
            Read more &rarr;
          </a>
        </div>

        <div className="md:col-span-2 bg-surface border border-border p-8 rounded-sm flex flex-col justify-between">
          <div>
            <span className="font-mono text-[11px] text-accent tracking-wider block mb-3">F.04</span>
            <h3 className="font-display font-semibold text-xl mb-3 text-fg">Stateful Sessions</h3>
            <p className="text-muted text-sm leading-relaxed mb-6">
              Secure, token-based auth with scoped query permissions and per-session isolation.
            </p>
          </div>
          <a href="/docs#auth-sessions" className="font-mono text-xs text-accent hover:underline inline-flex items-center gap-1">
            Read more &rarr;
          </a>
        </div>
      </div>
    </section>
  );
};
