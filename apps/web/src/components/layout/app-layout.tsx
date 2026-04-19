import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Sidebar } from './sidebar';
import { Header } from './header';

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <Header sidebarCollapsed={collapsed} />
      <main
        className={cn(
          'min-h-[calc(100vh-4rem)] pt-16 transition-all duration-300',
          collapsed ? 'ml-16' : 'ml-64',
        )}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
