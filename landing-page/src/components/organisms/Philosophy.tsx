import React from 'react';

export const Philosophy: React.FC = () => {
  return (
    <section id="philosophy" className="py-[96px] border-b border-border">
      <div className="mb-14">
        <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-faint mb-5 block">
          <span className="text-accent">01</span> / Philosophy
        </span>
        <h2 className="font-display font-semibold text-3xl sm:text-4xl text-fg mb-4">
          Databases shouldn't be infrastructure projects.
        </h2>
        <p className="text-muted max-w-[65ch] leading-relaxed">
          Traditional systems demand configuration, heavy services, and separate client apps. Aeris converges runtime and management into one artifact.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-surface border border-border p-7 rounded-sm relative">
          <div className="font-mono text-xs text-faint mb-4">/ 01</div>
          <h3 className="font-display font-semibold text-xl mb-3 text-fg">Single Binary</h3>
          <p className="text-muted text-sm leading-relaxed">
            The web console is embedded directly into the Go executable via <code className="font-mono text-xs text-accent">go:embed</code>. Deploy with a single file copy - no asset pipeline, no CDN.
          </p>
        </div>

        <div className="bg-surface border border-border p-7 rounded-sm relative">
          <div className="font-mono text-xs text-faint mb-4">/ 02</div>
          <h3 className="font-display font-semibold text-xl mb-3 text-fg">Embedded Web Server</h3>
          <p className="text-muted text-sm leading-relaxed">
            Open your database console in any browser. No DBeaver, no desktop GUI, no SSH tunnel just to look at a table.
          </p>
        </div>

        <div className="bg-surface border border-border p-7 rounded-sm relative">
          <div className="font-mono text-xs text-faint mb-4">/ 03</div>
          <h3 className="font-display font-semibold text-xl mb-3 text-fg">Zero External Dependencies</h3>
          <p className="text-muted text-sm leading-relaxed">
            Self-contained storage engine and HTTP services. Runs wherever Linux, macOS, or Windows can execute a native binary.
          </p>
        </div>
      </div>
    </section>
  );
};
