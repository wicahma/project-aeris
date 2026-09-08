import React, { useState } from 'react';

export const Footer: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [commits, setCommits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const openChangelog = async () => {
    setModalOpen(true);
    if (commits.length === 0) {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch('https://api.github.com/repos/wicahma/aeris-app/commits?per_page=5');
        const data = await res.json();
        setCommits(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
  };

  React.useEffect(() => {
    const handler = () => openChangelog();
    document.addEventListener('aeris:open-changelog', handler);
    return () => document.removeEventListener('aeris:open-changelog', handler);
  }, [commits]);

  return (
    <>
      <footer className="py-12 border-t border-border">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
          <div>
            <div className="font-mono font-medium text-sm text-fg tracking-tight mb-1">
              AERIS_DBMS
            </div>
            <div className="font-mono text-xs text-faint">
              Single-binary embedded DBMS &middot; built with Golang &amp; React
            </div>
          </div>
          <div className="flex gap-6 font-mono text-xs uppercase tracking-wider text-muted">
            <a href="https://github.com/wicahma/aeris-app" target="_blank" rel="noopener noreferrer" className="hover:text-fg transition-colors">
              GitHub
            </a>
            <a href="/docs" className="hover:text-fg transition-colors">
              Docs
            </a>
            <button
              type="button"
              onClick={openChangelog}
              className="bg-transparent border-0 p-0 font-mono text-xs uppercase tracking-wider text-muted hover:text-fg transition-colors cursor-pointer"
            >
              Changelog
            </button>
          </div>
        </div>
      </footer>

      {modalOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-surface border border-border-strong rounded-sm p-6 w-full max-w-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6 border-b border-border pb-3">
              <h3 className="font-display font-semibold text-lg text-fg">Latest Commits</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-muted hover:text-fg text-xl leading-none bg-transparent border-0 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4">
              {loading && (
                <p className="font-mono text-xs text-faint">Fetching latest commits...</p>
              )}
              {error && (
                <p className="font-mono text-xs text-accent">Failed to fetch commits.</p>
              )}
              {!loading && !error && commits.map((c) => (
                <div key={c.sha} className="border-b border-border/60 pb-3 last:border-0 last:pb-0">
                  <div className="flex justify-between items-center font-mono text-xs text-faint mb-1">
                    <span className="text-accent">{c.sha.substring(0, 7)}</span>
                    <span>{new Date(c.commit.author.date).toLocaleDateString()}</span>
                  </div>
                  <p className="font-mono text-xs text-muted leading-relaxed">
                    {c.commit.message.split('\n')[0]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
