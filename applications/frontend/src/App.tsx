import React from 'react';
import { Header } from './shared/components/Header';
import { Sidebar } from './shared/components/Sidebar';
import { QueryEditor } from './features/query-editor/QueryEditor';
import { SchemaBuilder } from './features/schema-builder/SchemaBuilder';
import { DataExplorer } from './features/data-explorer/DataExplorer';
import { ToastContainer } from './shared/components/ToastContainer';
import { useAerisStore } from './shared/store/useAerisStore';

const App: React.FC = () => {
  const { activeTab } = useAerisStore();

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <main className="flex-1 overflow-auto p-4 bg-zinc-950">
          {activeTab === 'query-editor' && <QueryEditor />}
          {activeTab === 'schema-builder' && <SchemaBuilder />}
          {activeTab === 'data-explorer' && <DataExplorer />}
        </main>
      </div>
      <ToastContainer />
    </div>
  );
};

export default App;