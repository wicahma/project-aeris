import React, { useState } from 'react';

export const Hero: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = 'curl -fsSL https://get.diama.dev/aeris.sh | sh';
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      });
    }
  };

  return (
    <section className="hero py-[96px] border-b border-border">
      <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-16 items-center">
        <div>
          <span className="inline-block font-mono text-[12px] uppercase tracking-[0.12em] text-accent border border-border-strong px-3 py-1.5 rounded-sm mb-7">
            Zero-Dependency Lightweight DBMS
          </span>
          <h1 className="font-display font-semibold text-4xl sm:text-5xl lg:text-[62px] leading-[1.04] tracking-[-0.025em] mb-6">
            One binary. <em className="not-italic text-accent">Zero</em> infrastructure.
          </h1>
          <p className="text-lg text-muted max-w-[46ch] mb-9 leading-relaxed">
            A unified storage engine and reactive web console compiled into a single standalone Golang executable. No external services, no config files, no client tooling.
          </p>
          <div className="flex gap-4 items-center mb-10 flex-wrap">
            <a
              href="#quickstart"
              className="inline-flex items-center gap-2.5 bg-accent text-accent-ink font-display font-semibold text-[15px] px-[26px] py-[13px] border border-accent rounded-sm hover:bg-[oklch(0.88_0.16_140)] transition-colors"
            >
              Get Aeris
            </a>
            <a
              href="https://aeris-app.diama.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[13px] tracking-wider text-muted px-1 py-[13px] border-b border-transparent hover:text-fg hover:border-border-strong transition-all"
            >
              Try Live Demo &rarr;
            </a>
          </div>
          <div className="bg-code-bg border border-border-strong rounded-sm p-[14px_18px] flex justify-between items-center font-mono text-[13px] max-w-[540px]">
            <span className="text-fg">
              <span className="text-accent mr-2">$</span> curl -fsSL https://get.diama.dev/aeris.sh | sh
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="bg-transparent border border-border text-muted font-mono text-[11px] px-2.5 py-1 rounded-sm hover:text-fg hover:border-border-strong transition-colors cursor-pointer"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="bg-surface border border-border-strong rounded-sm overflow-hidden">
          <div className="flex justify-between items-center px-4 py-3 border-b border-border font-mono text-[11px] text-faint uppercase tracking-wider">
            <span>aeris daemon</span>
            <span className="inline-flex items-center gap-2 text-accent before:content-[''] before:w-[7px] before:h-[7px] before:rounded-full before:bg-accent before:shadow-[0_0_8px_var(--accent)]">
              online
            </span>
          </div>
          <div className="p-4 font-mono text-[12.5px] leading-[1.9] text-muted space-y-0.5">
            <div><span className="text-faint inline-block w-20">pid</span> <span className="text-fg">4821</span></div>
            <div><span className="text-faint inline-block w-20">listen</span> <span className="text-fg">:9090/tcp</span></div>
            <div><span className="text-faint inline-block w-20">engine</span> <span className="text-fg">bbolt + wal</span></div>
            <div><span className="text-faint inline-block w-20">deps</span> <span className="text-accent">0 external</span></div>
            <div><span className="text-faint inline-block w-20">uptime</span> <span className="text-fg">00:00:01</span></div>
          </div>
          <div className="grid grid-cols-3 border-t border-border text-center">
            <div className="p-3 border-r border-border">
              <div className="font-mono text-xl font-semibold text-fg">1</div>
              <div className="font-mono text-[10.5px] uppercase tracking-wider text-faint">File</div>
            </div>
            <div className="p-3 border-r border-border">
              <div className="font-mono text-xl font-semibold text-fg">0</div>
              <div className="font-mono text-[10.5px] uppercase tracking-wider text-faint">Deps</div>
            </div>
            <div className="p-3">
              <div className="font-mono text-xl font-semibold text-fg">1</div>
              <div className="font-mono text-[10.5px] uppercase tracking-wider text-faint">Cmd</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
