import React from 'react';
import { BookOpen, Terminal, Download, ShieldCheck, Layers, Cpu } from 'lucide-react';

interface DocsSidebarProps {
  currentPath?: string;
}

export const DocsSidebar: React.FC<DocsSidebarProps> = ({ currentPath = '/docs/introduction' }) => {
  const sections = [
    {
      title: 'Getting Started',
      items: [
        { label: 'Introduction', href: '/docs/introduction', icon: BookOpen },
        { label: 'Installation', href: '/docs/installation', icon: Download }
      ]
    },
    {
      title: 'Architecture & Engine',
      items: [
        { label: 'Single-Binary Go Engine', href: '/docs/introduction#architecture', icon: Cpu },
        { label: 'Embedded Web Console', href: '/docs/introduction#web-console', icon: Layers }
      ]
    },
    {
      title: 'CLI & Distribution',
      items: [
        { label: 'CLI Subcommands', href: '/docs/installation#cli-reference', icon: Terminal },
        { label: 'Systemd Integration', href: '/docs/installation#systemd', icon: ShieldCheck }
      ]
    }
  ];

  return (
    <aside className="w-64 shrink-0 font-mono text-xs space-y-6">
      {sections.map((section, idx) => (
        <div key={idx} className="space-y-2">
          <div className="text-[11px] font-bold tracking-wider text-brand-primary uppercase px-2">
            {section.title}
          </div>
          <ul className="space-y-1">
            {section.items.map((item, itemIdx) => {
              const Icon = item.icon;
              const isActive = currentPath === item.href;
              return (
                <li key={itemIdx}>
                  <a
                    href={item.href}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-colors ${
                      isActive
                        ? 'bg-brand-primary/10 text-brand-primary font-bold border border-brand-primary/30'
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </aside>
  );
};