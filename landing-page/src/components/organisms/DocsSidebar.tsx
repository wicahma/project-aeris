import React from 'react';

export const DocsSidebar: React.FC = () => {
  return (
    <aside className="w-64 border-r border-border p-6 bg-surface hidden lg:block sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto font-mono text-xs">
      <div className="mb-6">
        <div className="text-faint uppercase tracking-wider text-[11px] mb-3">Getting Started</div>
        <ul className="space-y-2">
          <li><a href="#overview" className="sidebar-link text-accent block hover:underline">Overview</a></li>
          <li><a href="#installation" className="sidebar-link text-muted hover:text-fg block">Installation</a></li>
          <li><a href="#quickstart" className="sidebar-link text-muted hover:text-fg block">Quick Start</a></li>
          <li><a href="#architecture" className="sidebar-link text-muted hover:text-fg block">Architecture</a></li>
        </ul>
      </div>

      <div className="mb-6">
        <div className="text-faint uppercase tracking-wider text-[11px] mb-3">Core Engine</div>
        <ul className="space-y-2">
          <li><a href="#storage-engine" className="sidebar-link text-muted hover:text-fg block">Storage &amp; WAL</a></li>
          <li><a href="#web-console" className="sidebar-link text-muted hover:text-fg block">Embedded Web Console</a></li>
          <li><a href="#auth-sessions" className="sidebar-link text-muted hover:text-fg block">Auth &amp; Permissions</a></li>
        </ul>
      </div>

      <div className="mb-6">
        <div className="text-faint uppercase tracking-wider text-[11px] mb-3">REST API</div>
        <ul className="space-y-2">
          <li><a href="#api-overview" className="sidebar-link text-muted hover:text-fg block">Overview &amp; Headers</a></li>
          <li><a href="#api-auth-login" className="sidebar-link text-muted hover:text-fg block"><code>POST /api/v1/auth/login</code></a></li>
          <li><a href="#api-query" className="sidebar-link text-muted hover:text-fg block"><code>POST /api/v1/query</code></a></li>
          <li><a href="#api-tables" className="sidebar-link text-muted hover:text-fg block"><code>GET /api/v1/tables</code></a></li>
          <li><a href="#api-health" className="sidebar-link text-muted hover:text-fg block"><code>GET /api/v1/health</code></a></li>
        </ul>
      </div>

      <div>
        <div className="text-faint uppercase tracking-wider text-[11px] mb-3">CLI Reference</div>
        <ul className="space-y-2">
          <li><a href="#cli-server" className="sidebar-link text-muted hover:text-fg block"><code>aeris server</code></a></li>
          <li><a href="#cli-backup" className="sidebar-link text-muted hover:text-fg block"><code>aeris backup</code></a></li>
          <li><a href="#cli-restore" className="sidebar-link text-muted hover:text-fg block"><code>aeris restore</code></a></li>
        </ul>
      </div>
    </aside>
  );
};
