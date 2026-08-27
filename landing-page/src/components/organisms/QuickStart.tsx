import React from 'react';
import { CodeBlock } from '../atoms/CodeBlock';
import { Terminal, ShieldCheck } from 'lucide-react';

export const QuickStart: React.FC = () => {
  const quickStartScript = `curl -fsSL https://get.diama.dev/dbms.sh | sh`;
  const runCommand = `aeris serve --port 8080`;

  return (
    <section id="quickstart" className="py-20 border-b border-dark-border bg-dark-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <h2 className="text-xs font-mono font-bold tracking-widest text-brand-primary uppercase">
            Instant Developer Onboarding
          </h2>
          <p className="text-3xl font-black font-sans text-white">
            Up and Running in 5 Seconds.
          </p>
          <p className="text-sm text-dark-muted">
            Run the automated installation script or download pre-compiled release binaries.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-mono font-bold text-white">
              <Terminal className="w-4 h-4 text-brand-accent" />
              <span>1. Install via One-Line Shell Installer</span>
            </div>
            <CodeBlock code={quickStartScript} language="bash" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-mono font-bold text-white">
              <ShieldCheck className="w-4 h-4 text-brand-primary" />
              <span>2. Launch Server & Web Console</span>
            </div>
            <CodeBlock code={runCommand} language="bash" />
          </div>
        </div>
      </div>
    </section>
  );
};