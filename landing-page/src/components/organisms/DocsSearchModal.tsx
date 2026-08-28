import React, { useState, useEffect } from 'react';
import { Search, X, BookOpen, Terminal, ArrowRight } from 'lucide-react';

interface DocResult {
  title: string;
  category: string;
  url: string;
  snippet: string;
}

export const DocsSearchModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const docItems: DocResult[] = [
    {
      title: 'Introduction to Project Aeris',
      category: 'Getting Started',
      url: '/docs/introduction',
      snippet: 'Overview of Project Aeris: Zero-dependency single-binary DBMS with embedded web IDE.'
    },
    {
      title: 'Installation Guide (4 Methods)',
      category: 'Getting Started',
      url: '/docs/installation',
      snippet: 'Step-by-step installation via Shell Script, Homebrew, APT, and Windows Winget.'
    },
    {
      title: 'Shell Script One-Liner (get.diama.dev)',
      category: 'Installation',
      url: '/docs/installation#shell-installer',
      snippet: 'Quick automated bash installation script: curl -fsSL https://get.diama.dev/dbms.sh | sh'
    },
    {
      title: 'Homebrew Tap Setup',
      category: 'Installation',
      url: '/docs/installation#homebrew',
      snippet: 'Install via Homebrew on macOS or Linux: brew install wicahma/tap/dbms'
    },
    {
      title: 'Debian/Ubuntu APT Repository',
      category: 'Installation',
      url: '/docs/installation#apt-repo',
      snippet: 'Official .deb packages with systemd integration: apt install dbms'
    },
    {
      title: 'Windows Winget & Chocolatey',
      category: 'Installation',
      url: '/docs/installation#windows',
      snippet: 'Windows Package Manager setup: winget install wicahma.dbms'
    }
  ];

  const filteredResults = docItems.filter(
    item =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.snippet.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDownInModal = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredResults.length - 1));
    } else if (e.key === 'Enter' && filteredResults[selectedIndex]) {
      window.location.href = filteredResults[selectedIndex].url;
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-700 hover:border-brand-primary text-zinc-400 hover:text-white rounded-md text-xs font-mono transition-all"
        aria-label="Search documentation"
      >
        <Search className="w-3.5 h-3.5 text-brand-primary" />
        <span>Search docs...</span>
        <kbd className="hidden sm:inline-block px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-[10px] text-zinc-300">
          ⌘K
        </kbd>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-20 px-4">
          <div
            className="bg-dark-bg border-2 border-zinc-700 rounded-xl w-full max-w-2xl shadow-neubrutalism overflow-hidden font-sans"
            onKeyDown={handleKeyDownInModal}
          >
            <div className="p-4 border-b border-zinc-800 flex items-center gap-3">
              <Search className="w-5 h-5 text-brand-primary" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search documentation, guides, CLI commands..."
                className="w-full bg-transparent text-white placeholder-zinc-500 focus:outline-none font-mono text-sm"
                autoFocus
              />
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-zinc-400 hover:text-white rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto p-2 space-y-1">
              {filteredResults.length > 0 ? (
                filteredResults.map((item, idx) => (
                  <a
                    key={idx}
                    href={item.url}
                    onClick={() => setIsOpen(false)}
                    className={`block p-3 rounded-lg border transition-all ${
                      idx === selectedIndex
                        ? 'bg-brand-primary/10 border-brand-primary text-white'
                        : 'border-transparent text-zinc-300 hover:bg-zinc-900'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono text-xs text-brand-accent mb-1">
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" />
                        {item.category}
                      </span>
                      {idx === selectedIndex && <ArrowRight className="w-3.5 h-3.5 text-brand-primary" />}
                    </div>
                    <div className="font-bold text-sm text-white mb-0.5">{item.title}</div>
                    <div className="text-xs text-zinc-400 line-clamp-1 font-sans">{item.snippet}</div>
                  </a>
                ))
              ) : (
                <div className="p-8 text-center text-zinc-500 font-mono text-xs">
                  No matching documentation pages found for "{query}".
                </div>
              )}
            </div>

            <div className="p-3 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between text-[11px] font-mono text-zinc-400">
              <div className="flex items-center gap-3">
                <span><kbd className="px-1 bg-zinc-800 rounded">↑↓</kbd> navigate</span>
                <span><kbd className="px-1 bg-zinc-800 rounded">↵</kbd> select</span>
                <span><kbd className="px-1 bg-zinc-800 rounded">ESC</kbd> close</span>
              </div>
              <span>Project Aeris Docs</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};