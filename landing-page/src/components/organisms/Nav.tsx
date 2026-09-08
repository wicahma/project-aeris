import React, { useState } from 'react';

export const Nav: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="flex justify-between items-center py-[22px] border-b border-border sticky top-0 bg-[color-mix(in_oklch,var(--bg)_92%,transparent)] backdrop-blur-md z-50">
      <div className="font-mono font-medium text-[15px] tracking-tight">
        AERIS<b className="text-accent font-medium">_</b>DBMS
      </div>

      <button
        type="button"
        className="md:hidden bg-transparent border border-border text-muted p-2 rounded-sm cursor-pointer"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        &#9776;
      </button>

      <div
        className={`${
          mobileOpen ? 'flex' : 'hidden'
        } md:flex flex-col md:flex-row absolute md:static top-full left-0 right-0 bg-[var(--bg)] md:bg-transparent p-6 md:p-0 border-b md:border-b-0 border-border gap-6 md:gap-7 font-mono text-[12.5px] tracking-wider uppercase z-50`}
      >
        <a href="#philosophy" className="text-muted hover:text-fg transition-colors">Philosophy</a>
        <a href="#features" className="text-muted hover:text-fg transition-colors">Features</a>
        <a href="https://aeris-app.diama.dev" target="_blank" rel="noopener noreferrer" className="text-muted hover:text-fg transition-colors">Demo</a>
        <a href="#architecture" className="text-muted hover:text-fg transition-colors">Architecture</a>
        <a href="/docs" className="text-muted hover:text-fg transition-colors">Docs</a>
        <button
          type="button"
          onClick={() => {
            document.dispatchEvent(new CustomEvent('aeris:open-changelog'));
          }}
          className="text-muted hover:text-fg transition-colors cursor-pointer bg-transparent border-0 p-0 font-inherit"
        >
          Changelog
        </button>
        <a href="https://github.com/wicahma/aeris-app" target="_blank" rel="noopener noreferrer" className="text-muted hover:text-fg transition-colors">GitHub</a>
      </div>
    </nav>
  );
};
