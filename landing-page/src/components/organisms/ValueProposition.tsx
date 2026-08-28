import React from 'react';
import { ValueCard } from '../molecules/ValueCard';
import { Cpu, Code2, Database, Zap } from 'lucide-react';

export const ValueProposition: React.FC = () => {
  const features = [
    {
      icon: Cpu,
      title: 'Single Binary Execution',
      description: 'Zero external dependencies or runtimes. Web UI assets embedded directly into compiled Go execution binary.',
      badgeText: 'Pure Go'
    },
    {
      icon: Code2,
      title: 'Embedded Web IDE',
      description: 'CodeMirror 6 query editor built-in with real-time SQL syntax highlighting, schema autocomplete, and multi-query support.',
      badgeText: 'CodeMirror 6'
    },
    {
      icon: Database,
      title: 'Hot-Swappable Storage',
      description: 'Plug-and-play modular database files (.db) with WAL mode, or run entirely in-memory for testing and caching.',
      badgeText: 'WAL & Memory'
    },
    {
      icon: Zap,
      title: 'Instant API & Webhooks',
      description: 'Auto-generated RESTful & GraphQL CRUD endpoints for every table, plus asynchronous HTTP event webhooks.',
      badgeText: 'Auto-CRUD'
    }
  ];

  return (
    <section id="features" className="py-20 border-b border-dark-border bg-dark-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-xs font-mono font-bold tracking-widest text-brand-primary uppercase">
            Built for High-Performance Engineering
          </h2>
          <p className="text-3xl sm:text-4xl font-black font-sans text-white">
            Everything You Need in One Executable.
          </p>
          <p className="text-base text-dark-muted font-sans">
            Designed from the ground up for minimal overhead, extreme speed, and developer joy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => (
            <ValueCard key={idx} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
};