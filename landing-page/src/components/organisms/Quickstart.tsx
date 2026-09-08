import React, { useState } from 'react';

export const Quickstart: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = 'aeris server --port 9090 --data-dir ./data';
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      });
    }
  };

  return (
    <section id="quickstart" className="py-[96px] border-b border-border">
      <div className="mb-14">
        <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-faint mb-5 block">
          <span className="text-accent">05</span> / Quick Start
        </span>
        <h2 className="font-display font-semibold text-3xl sm:text-4xl text-fg mb-4">
          Running in one command.
        </h2>
        <p className="text-muted max-w-[65ch] leading-relaxed">
          Local eval or production deploy - no runtime configuration required.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="bg-code-bg border border-border-strong rounded-sm p-5 flex justify-between items-center font-mono text-sm">
          <span className="text-fg">
            <span className="text-accent mr-2">$</span> aeris server --port 9090 --data-dir ./data
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="bg-transparent border border-border text-muted font-mono text-xs px-3 py-1.5 rounded-sm hover:text-fg hover:border-border-strong transition-colors cursor-pointer"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div className="space-y-3">
          <a
            href="https://github.com/wicahma/project-aeris/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="flex justify-between items-center p-4 bg-surface border border-border rounded-sm hover:border-border-strong transition-colors"
          >
            <span className="font-mono text-sm text-fg">
              <strong className="font-semibold mr-2">Homebrew</strong>
              <span className="text-faint text-xs">macOS / Linux</span>
            </span>
            <span className="font-mono text-xs text-accent">brew install aeris &rarr;</span>
          </a>

          <a
            href="https://github.com/wicahma/project-aeris/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="flex justify-between items-center p-4 bg-surface border border-border rounded-sm hover:border-border-strong transition-colors"
          >
            <span className="font-mono text-sm text-fg">
              <strong className="font-semibold mr-2">APT</strong>
              <span className="text-faint text-xs">Debian / Ubuntu</span>
            </span>
            <span className="font-mono text-xs text-accent">apt install aeris &rarr;</span>
          </a>

          <a
            href="https://github.com/wicahma/project-aeris/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="flex justify-between items-center p-4 bg-surface border border-border rounded-sm hover:border-border-strong transition-colors"
          >
            <span className="font-mono text-sm text-fg">
              <strong className="font-semibold mr-2">Binary</strong>
              <span className="text-faint text-xs">single file</span>
            </span>
            <span className="font-mono text-xs text-accent">download &rarr;</span>
          </a>
        </div>
      </div>
    </section>
  );
};
