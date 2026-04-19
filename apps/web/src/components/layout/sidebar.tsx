import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  Users,
  Building2,
  BarChart3,
  Settings,
  ChevronLeft,
  Search,
  Truck,
  ShoppingCart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { UserRole } from '@prams/shared';
import { usePendingCount } from '@/hooks/use-approvals';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const navigation: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Purchase Requests',
    href: '/purchase-requests',
    icon: FileText,
  },
  {
    label: 'Suppliers',
    href: '/suppliers',
    icon: Truck,
    roles: [UserRole.ADMIN, UserRole.ACCOUNTING, UserRole.PROCUREMENT],
  },
  {
    label: 'Purchase Orders',
    href: '/purchase-orders',
    icon: ShoppingCart,
    roles: [UserRole.ADMIN, UserRole.PROCUREMENT, UserRole.COO, UserRole.CEO],
  },
  {
    label: 'Search & Monitor',
    href: '/search',
    icon: Search,
  },
  {
    label: 'Approvals',
    href: '/approvals',
    icon: CheckSquare,
    roles: [UserRole.DEPT_HEAD, UserRole.COO, UserRole.CEO],
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: BarChart3,
  },
];

const adminNavigation: NavItem[] = [
  {
    label: 'Users',
    href: '/users',
    icon: Users,
    roles: [UserRole.ADMIN],
  },
  {
    label: 'Departments',
    href: '/departments',
    icon: Building2,
    roles: [UserRole.ADMIN],
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: [UserRole.ADMIN],
  },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);

  const filterByRole = (items: NavItem[]) =>
    items.filter((item) => {
      if (!item.roles) return true;
      return user && item.roles.includes(user.role);
    });

  const approverRoles: string[] = [UserRole.DEPT_HEAD, UserRole.COO, UserRole.CEO];
  const isApprover = user && approverRoles.includes(user.role);
  const { data: pendingCountData } = usePendingCount();
  const pendingCount = isApprover ? (pendingCountData as unknown as { count?: number })?.count ?? 0 : 0;

  const visibleNav = filterByRole(navigation);
  const visibleAdmin = filterByRole(adminNavigation);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r bg-sidebar transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <FileText className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">PRAMS</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className={cn('h-8 w-8', collapsed && 'mx-auto')}
        >
          <ChevronLeft
            className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')}
          />
        </Button>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {visibleNav.map((item) => {
          const isActive = location.pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                collapsed && 'justify-center px-0',
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && (
                <span className="flex flex-1 items-center justify-between">
                  {item.label}
                  {item.href === '/approvals' && pendingCount > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                      {pendingCount}
                    </span>
                  )}
                </span>
              )}
              {collapsed && item.href === '/approvals' && pendingCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}

        {visibleAdmin.length > 0 && (
          <>
            <Separator className="my-3" />
            {!collapsed && (
              <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Administration
              </p>
            )}
            {visibleAdmin.map((item) => {
              const isActive = location.pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                    collapsed && 'justify-center px-0',
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </>
        )}
      </nav>
    </aside>
  );
}
