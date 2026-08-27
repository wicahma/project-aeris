import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-dark-bg py-12 border-t-2 border-zinc-800 font-mono text-xs text-zinc-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <span className="font-black text-white text-sm tracking-tight uppercase">PROJECT AERIS</span>
          <span className="text-zinc-600">|</span>
          <span>Zero-Dependency Drop-in Database</span>
        </div>

        <div className="flex items-center gap-8">
          <a
            href="https://github.com/wicahma/project-aeris"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-300 hover:text-white font-bold transition-colors uppercase tracking-wider"
          >
            GitHub
          </a>
          <a
            href="/docs/introduction"
            className="text-zinc-300 hover:text-white font-bold transition-colors uppercase tracking-wider"
          >
            Documentation
          </a>
          <span className="text-zinc-500 uppercase tracking-wider">
            MIT License
          </span>
        </div>

        <div className="text-zinc-500">
          © {new Date().getFullYear()} diama.dev
        </div>
      </div>
    </footer>
  );
};