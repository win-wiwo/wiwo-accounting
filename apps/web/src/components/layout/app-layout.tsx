import * as React from 'react';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Sidebar } from './sidebar';
import { Header } from './header';

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-sidebar">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <Header sidebarCollapsed={collapsed} />
      <main
        className={cn(
          'pt-16 transition-all duration-300',
          collapsed ? 'ml-16' : 'ml-64',
        )}
        style={{ '--sidebar-w': collapsed ? '4rem' : '16rem' } as React.CSSProperties}
      >
        {/* White rounded content panel — the signature DEMURE-style inner card */}
        <div className="p-3">
          <div className="min-h-[calc(100vh-4rem-1.5rem)] rounded-2xl bg-background">
            <div className="p-6 lg:p-8">
              <Outlet />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
