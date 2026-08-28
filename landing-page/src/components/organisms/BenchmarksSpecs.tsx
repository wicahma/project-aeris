import React from 'react';
import { SpecRow } from '../molecules/SpecRow';

export const BenchmarksSpecs: React.FC = () => {
  const specs = [
    { metric: 'Binary Footprint Size', aerisValue: '< 18.5 MB', competitorValue: '> 150 MB (Electron/Docker)', highlight: true },
    { metric: 'Idle Memory Consumption (RAM)', aerisValue: '11.4 MB', competitorValue: '> 450 MB', highlight: true },
    { metric: 'Cold Startup Time', aerisValue: '1.2 ms', competitorValue: '> 3,500 ms', highlight: true },
    { metric: 'CGO Dependency', aerisValue: 'Zero (Pure Go)', competitorValue: 'Requires C Compiler / GCC' },
    { metric: 'Embedded Web UI', aerisValue: 'Yes (go:embed)', competitorValue: 'Separate Web Server Needed' },
    { metric: 'Auto-Generated APIs', aerisValue: 'REST & GraphQL', competitorValue: 'Manual Backend Coding Needed' }
  ];

  return (
    <section id="benchmarks" className="py-20 border-b border-dark-border bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <h2 className="text-xs font-mono font-bold tracking-widest text-brand-accent uppercase">
            Technical Efficiency
          </h2>
          <p className="text-3xl font-black font-sans text-white">
            Unmatched Performance & Footprint.
          </p>
          <p className="text-sm text-dark-muted">
            Engineered to run natively on resource-constrained homelab hardware or high-throughput servers.
          </p>
        </div>

        <div className="max-w-4xl mx-auto bg-dark-bg border-2 border-zinc-700 rounded-xl overflow-hidden shadow-neubrutalism">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-900 border-b border-zinc-700 font-mono text-xs uppercase tracking-wider text-zinc-400">
                <tr>
                  <th className="py-3.5 px-4">Metric / Specification</th>
                  <th className="py-3.5 px-4 text-brand-accent">Project Aeris</th>
                  <th className="py-3.5 px-4 text-dark-muted">Traditional Tools</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {specs.map((spec, idx) => (
                  <SpecRow key={idx} {...spec} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};