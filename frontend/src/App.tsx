import React from 'react';
import { X, CheckCircle2, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { TitleBar } from './components/TitleBar';
import { NavRail } from './components/NavRail';
import { SkillDrawer } from './components/SkillDrawer';
import { CommandPalette } from './components/CommandPalette';
import { DashboardPage } from './pages/DashboardPage';
import { MatrixPage } from './pages/MatrixPage';
import { LibraryPage } from './pages/LibraryPage';
import { WorkflowsPage } from './pages/WorkflowsPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ReposPage } from './pages/ReposPage';
import { AgentsPage } from './pages/AgentsPage';
import { DocsPage } from './pages/DocsPage';
import { SettingsPage } from './pages/SettingsPage';

const ToastOverlay: React.FC = () => {
  const { toasts, dismissToast } = useApp();
  if (toasts.length === 0) return null;

  const iconMap = {
    info: <Info size={15} className="text-[var(--accent)]" />,
    success: <CheckCircle2 size={15} className="text-[var(--success)]" />,
    warning: <AlertTriangle size={15} className="text-[var(--warning)]" />,
    error: <AlertCircle size={15} className="text-[var(--danger)]" />,
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-[360px]">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="px-3.5 py-2.5 rounded-lg border border-[var(--card-border)] shadow-xl flex items-center gap-2.5 text-[12.5px]"
          style={{ background: 'var(--drawer-bg)', backdropFilter: 'blur(16px)' }}
        >
          <span className="shrink-0">{iconMap[toast.kind]}</span>
          <span className="flex-1 text-[var(--text-primary)]">{toast.message}</span>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            className="p-0.5 rounded hover:bg-[var(--card-subtle)] text-[var(--text-secondary)] cursor-pointer"
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
};

const MainShell: React.FC = () => {
  const { activeTab, loading } = useApp();

  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage />;
      case 'matrix':
        return <MatrixPage />;
      case 'library':
        return <LibraryPage />;
      case 'workflows':
        return <WorkflowsPage />;
      case 'projects':
        return <ProjectsPage />;
      case 'repos':
        return <ReposPage />;
      case 'agents':
        return <AgentsPage />;
      case 'docs':
        return <DocsPage />;
      case 'settings':
        return <SettingsPage />;
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col fluent-shell overflow-hidden">
      <TitleBar />
      <div className="flex-1 flex min-h-0">
        <NavRail />
        <main className="flex-1 min-w-0 fluent-canvas p-6 overflow-y-auto fluent-scroll">
          {loading ? (
            <div className="h-full flex items-center justify-center text-[13px] text-[var(--text-secondary)]">
              Loading SkillsMan...
            </div>
          ) : (
            renderPage()
          )}
        </main>
      </div>
      <SkillDrawer />
      <CommandPalette />
      <ToastOverlay />
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <MainShell />
    </AppProvider>
  );
}

export default App;
