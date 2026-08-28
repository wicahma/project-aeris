import React from 'react';
import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';
import { TerminalBox } from '../molecules/TerminalBox';
import { Download, BookOpen, ArrowRight } from 'lucide-react';

export const HeroSection: React.FC = () => {
  return (
    <section className="relative pt-24 pb-16 md:pt-36 md:pb-24 border-b border-zinc-800 overflow-hidden bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-3">
              <Badge variant="emerald">v1.0.0 Stable</Badge>
              <Badge variant="indigo">Pure Go Engine</Badge>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black font-sans text-white tracking-tighter leading-none uppercase">
              Zero-Dependency <br />
              <span className="text-indigo-400 bg-indigo-950/80 px-3 py-1 border border-indigo-500/40 inline-block mt-2">
                Drop-in Database.
              </span>
            </h1>

            <p className="text-base sm:text-lg font-sans text-zinc-400 max-w-2xl leading-relaxed">
              Lightweight, single-binary DBMS with an embedded web IDE and auto-generated APIs. Powered by Go and React Vite.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-4">
              <Button href="#quickstart" variant="primary" size="lg" className="gap-2">
                <Download className="w-5 h-5" />
                <span>Download Aeris</span>
              </Button>
              <Button href="/docs/introduction" variant="outline" size="lg" className="gap-2">
                <BookOpen className="w-5 h-5" />
                <span>View Documentation</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="pt-6 flex flex-wrap items-center gap-6 text-xs font-mono text-zinc-400 border-t border-zinc-900">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Binary &lt; 18.5MB</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>RAM &lt; 15MB</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Zero CGO</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <TerminalBox />
          </div>
        </div>
      </div>
    </section>
  );
};