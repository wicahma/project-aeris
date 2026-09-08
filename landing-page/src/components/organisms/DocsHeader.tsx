import React from 'react';

export const DocsHeader: React.FC = () => {
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value.toLowerCase().trim();
    const links = document.querySelectorAll('.sidebar-link');
    links.forEach((l) => {
      const el = l as HTMLElement;
      const text = el.textContent?.toLowerCase() || '';
      el.style.display = !q || text.includes(q) ? '' : 'none';
    });
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-surface border-b border-border flex justify-between items-center px-4 sm:px-6 z-40">
      <div className="flex items-center gap-4 sm:gap-6 flex-1 max-w-xl">
        <a href="/" className="font-mono font-medium text-sm text-fg tracking-tight whitespace-nowrap">
          AERIS<b className="text-accent font-medium">_</b>DBMS
        </a>
        <span className="hidden sm:inline-block font-mono text-[11px] text-accent border border-accent/40 bg-accent/10 px-2 py-0.5 rounded-sm whitespace-nowrap">
          DOCS v1.0.0
        </span>
        <div className="relative flex-1 max-w-xs">
          <input
            type="text"
            className="w-full bg-code-bg border border-border text-fg font-mono text-xs px-3 py-1.5 pl-7 rounded-sm focus:outline-none focus:border-accent"
            placeholder="Search docs..."
            onChange={handleSearch}
          />
          <span className="absolute left-2.5 top-1.5 text-faint font-mono text-xs">/</span>
        </div>
      </div>

      <div className="flex items-center gap-4 sm:gap-6 font-mono text-xs uppercase tracking-wider text-muted">
        <a href="/" className="hover:text-fg transition-colors">Landing</a>
        <a href="https://github.com/wicahma/aeris-app" target="_blank" rel="noopener noreferrer" className="hover:text-fg transition-colors">GitHub</a>
        <a href="/#quickstart" className="hidden sm:inline-block bg-accent text-accent-ink font-semibold px-3 py-1 rounded-sm hover:bg-[oklch(0.88_0.16_140)] transition-colors">
          Install
        </a>
      </div>
    </header>
  );
};
