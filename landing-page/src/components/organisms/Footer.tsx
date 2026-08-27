import React from 'react';
import { Github, BookOpen, Shield } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-dark-bg py-12 border-t border-dark-border font-mono text-xs text-dark-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white text-sm">🚀 Project Aeris</span>
          <span>— Zero-Dependency Drop-in Database</span>
        </div>

        <div className="flex items-center gap-6">
          <a
            href="https://github.com/wicahma/project-aeris"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-zinc-300 hover:text-brand-primary transition-colors"
          >
            <Github className="w-4 h-4" />
            <span>GitHub</span>
          </a>
          <a
            href="/docs"
            className="flex items-center gap-1.5 text-zinc-300 hover:text-brand-primary transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            <span>Documentation</span>
          </a>
          <span className="flex items-center gap-1 text-zinc-400">
            <Shield className="w-4 h-4 text-brand-accent" />
            <span>MIT License</span>
          </span>
        </div>

        <div className="text-zinc-400">
          © {new Date().getFullYear()} diama.dev. All rights reserved.
        </div>
      </div>
    </footer>
  );
};