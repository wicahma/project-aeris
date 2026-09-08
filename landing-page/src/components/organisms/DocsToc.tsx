import React from 'react';

export const DocsToc: React.FC = () => {
  return (
    <aside className="w-56 p-6 hidden xl:block sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto font-mono text-xs">
      <div className="text-faint uppercase tracking-wider text-[11px] mb-3 font-semibold">On This Page</div>
      <ul className="space-y-2 text-muted">
        <li><a href="#overview" className="hover:text-fg hover:underline block">Overview</a></li>
        <li><a href="#installation" className="hover:text-fg hover:underline block">Installation</a></li>
        <li><a href="#quickstart" className="hover:text-fg hover:underline block">Quick Start</a></li>
        <li><a href="#architecture" className="hover:text-fg hover:underline block">Architecture</a></li>
        <li><a href="#storage-engine" className="hover:text-fg hover:underline block">Storage &amp; WAL</a></li>
        <li><a href="#web-console" className="hover:text-fg hover:underline block">Embedded Console</a></li>
        <li><a href="#auth-sessions" className="hover:text-fg hover:underline block">Auth &amp; Permissions</a></li>
        <li><a href="#api-overview" className="hover:text-fg hover:underline block">REST API Overview</a></li>
        <li><a href="#api-auth-login" className="hover:text-fg hover:underline block">POST /auth/login</a></li>
        <li><a href="#api-query" className="hover:text-fg hover:underline block">POST /query</a></li>
        <li><a href="#api-tables" className="hover:text-fg hover:underline block">GET /tables</a></li>
        <li><a href="#api-health" className="hover:text-fg hover:underline block">GET /health</a></li>
        <li><a href="#cli-server" className="hover:text-fg hover:underline block">aeris server</a></li>
        <li><a href="#cli-cli" className="hover:text-fg hover:underline block">aeris cli</a></li>
        <li><a href="#cli-backup" className="hover:text-fg hover:underline block">aeris backup</a></li>
      </ul>
    </aside>
  );
};
