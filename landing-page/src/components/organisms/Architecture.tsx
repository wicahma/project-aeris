import React from 'react';

export const Architecture: React.FC = () => {
  return (
    <section id="architecture" className="py-[96px] border-b border-border">
      <div className="mb-14">
        <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-faint mb-5 block">
          <span className="text-accent">04</span> / Architecture
        </span>
        <h2 className="font-display font-semibold text-3xl sm:text-4xl text-fg mb-4">
          Zero external runtimes.
        </h2>
        <p className="text-muted max-w-[65ch] leading-relaxed">
          Pure Go backend with an embedded React static distribution compiled into one executable.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-4 items-center bg-surface border border-border p-8 rounded-sm">
        <div className="bg-surface-2 border border-border p-4 rounded-sm text-center">
          <div className="font-mono font-medium text-fg text-sm mb-1">Golang Core</div>
          <div className="font-mono text-[11px] text-faint">Engine &amp; API</div>
        </div>
        <div className="text-center font-mono text-muted text-lg hidden md:block">&rarr;</div>
        <div className="bg-surface-2 border border-border p-4 rounded-sm text-center">
          <div className="font-mono font-medium text-fg text-sm mb-1">go:embed</div>
          <div className="font-mono text-[11px] text-faint">UI Bundle</div>
        </div>
        <div className="text-center font-mono text-muted text-lg hidden md:block">&rarr;</div>
        <div className="bg-surface-2 border border-border p-4 rounded-sm text-center">
          <div className="font-mono font-medium text-fg text-sm mb-1">React / TS</div>
          <div className="font-mono text-[11px] text-faint">Console</div>
        </div>
        <div className="text-center font-mono text-muted text-lg hidden md:block">&rarr;</div>
        <div className="bg-surface-2 border border-accent p-4 rounded-sm text-center">
          <div className="font-mono font-semibold text-accent text-sm mb-1">aeris</div>
          <div className="font-mono text-[11px] text-accent">1 Binary</div>
        </div>
      </div>
    </section>
  );
};
