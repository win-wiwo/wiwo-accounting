import { Link, useLocation, useNavigate } from "react-router-dom";
import wiwoLogo from "@/assets/wilsonworks.png";
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
  ClipboardList,
  FolderOpen,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";
import { UserRole, ROLE_LABELS } from "@prams/shared";
import { usePendingCount } from "@/hooks/use-approvals";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolvePhotoUrl } from "@/lib/utils";
import apiClient from "@/lib/api-client";

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
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Purchase Requests",
    href: "/purchase-requests",
    icon: FileText,
  },
  {
    label: "Approvals",
    href: "/approvals",
    icon: CheckSquare,
    roles: [UserRole.DEPT_HEAD, UserRole.COO, UserRole.CEO],
  },
  {
    label: "Procurement Queue",
    href: "/procurement",
    icon: ClipboardList,
    roles: [UserRole.PROCUREMENT, UserRole.ADMIN],
  },
  {
    label: "Suppliers",
    href: "/suppliers",
    icon: Truck,
    roles: [UserRole.ADMIN, UserRole.ACCOUNTING, UserRole.PROCUREMENT],
  },
  {
    label: "Purchase Orders",
    href: "/purchase-orders",
    icon: ShoppingCart,
    roles: [UserRole.ADMIN, UserRole.PROCUREMENT, UserRole.COO, UserRole.CEO, UserRole.STAFF, UserRole.DEPT_HEAD],
  },
  {
    label: "Search & Monitor",
    href: "/search",
    icon: Search,
    roles: [
      UserRole.ADMIN,
      UserRole.DEPT_HEAD,
      UserRole.COO,
      UserRole.CEO,
      UserRole.ACCOUNTING,
      UserRole.PROCUREMENT,
    ],
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
  },
];

const adminNavigation: NavItem[] = [
  {
    label: "Projects",
    href: "/projects",
    icon: FolderOpen,
    roles: [UserRole.ADMIN, UserRole.CEO, UserRole.COO],
  },
  {
    label: "Users",
    href: "/users",
    icon: Users,
    roles: [UserRole.ADMIN],
  },
  {
    label: "Departments",
    href: "/departments",
    icon: Building2,
    roles: [UserRole.ADMIN],
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    roles: [UserRole.ADMIN],
  },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const filterByRole = (items: NavItem[]) =>
    items.filter((item) => {
      if (!item.roles) return true;
      return user && item.roles.includes(user.role);
    });

  const approverRoles: string[] = [
    UserRole.DEPT_HEAD,
    UserRole.COO,
    UserRole.CEO,
  ];
  const isApprover = user && approverRoles.includes(user.role);
  const { data: pendingCountData } = usePendingCount();
  const pendingCount = isApprover
    ? ((pendingCountData as unknown as { count?: number })?.count ?? 0)
    : 0;

  const visibleNav = filterByRole(navigation);
  const visibleAdmin = filterByRole(adminNavigation);

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : "??";

  const handleLogout = async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // proceed with logout even if API call fails
    }
    logout();
    navigate("/login");
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex h-16 items-center px-4",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <img src={wiwoLogo} alt="WIWO" className="h-7 rounded" />
            {/*<span className="text-base font-bold tracking-tight text-sidebar-foreground">WIWO PR</span>*/}
          </div>
        )}
        <button
          onClick={onToggle}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg text-[oklch(0.55_0_0)] transition-colors hover:bg-white/5 hover:text-sidebar-foreground",
            collapsed && "mx-auto",
          )}
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform duration-300",
              collapsed && "rotate-180",
            )}
          />
        </button>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-sidebar-border" />

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {visibleNav.map((item) => {
          const isActive = location.pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-xs"
                  : "text-[oklch(0.72_0_0)] hover:bg-white/[0.08] hover:text-sidebar-foreground",
                collapsed && "justify-center px-0",
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  isActive ? "text-sidebar-primary-foreground" : "",
                )}
              />
              {!collapsed && (
                <span className="flex flex-1 items-center justify-between text-[13px]">
                  {item.label}
                  {item.href === "/approvals" && pendingCount > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground/10 px-1.5 text-[10px] font-bold text-sidebar-primary-foreground bg-[oklch(0.577_0.245_27.325)]">
                      {pendingCount}
                    </span>
                  )}
                </span>
              )}
              {collapsed && item.href === "/approvals" && pendingCount > 0 && (
                <span className="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[oklch(0.577_0.245_27.325)] px-0.5 text-[8px] font-bold text-white">
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}

        {visibleAdmin.length > 0 && (
          <>
            <div className="my-3 flex items-center gap-2">
              <div className="h-px flex-1 bg-sidebar-border" />
              {!collapsed && (
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[oklch(0.52_0_0)]">
                  Admin
                </span>
              )}
              <div className="h-px flex-1 bg-sidebar-border" />
            </div>
            {visibleAdmin.map((item) => {
              const isActive = location.pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-xs"
                      : "text-[oklch(0.72_0_0)] hover:bg-white/[0.08] hover:text-sidebar-foreground",
                    collapsed && "justify-center px-0",
                  )}
                >
                  {isActive && !collapsed && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-white/70" />
                  )}
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && (
                    <span className="text-[13px]">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* User Profile Section */}
      <div className="mx-4 h-px bg-sidebar-border" />
      <div
        className={cn(
          "px-3 py-5",
          collapsed ? "flex flex-col items-center gap-2.5" : "",
        )}
      >
        <div
          className={cn(
            !collapsed &&
              "rounded-xl border border-white/[0.06] bg-white/[0.04] p-1.5 space-y-0.5",
            collapsed && "flex flex-col items-center gap-2.5",
          )}
        >
          {/* Profile link */}
          <Link
            to="/profile"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 hover:bg-white/[0.07]",
              collapsed && "justify-center px-0",
            )}
          >
            <Avatar className="h-7 w-7 shrink-0 ring-1 ring-white/10">
              <AvatarImage
                src={resolvePhotoUrl(user?.photoUrl)}
                alt={initials}
              />
              <AvatarFallback className="bg-white/10 text-sidebar-foreground text-[11px] font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-sidebar-foreground">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="truncate text-[11px] text-[oklch(0.58_0_0)]">
                  {ROLE_LABELS[user?.role as UserRole] || user?.role}
                </p>
              </div>
            )}
          </Link>

          {/* Logout */}
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "sm"}
            onClick={handleLogout}
            className={cn(
              "text-[oklch(0.60_0_0)] hover:bg-white/[0.07] hover:text-sidebar-foreground transition-all duration-200",
              collapsed
                ? "h-9 w-9"
                : "w-full justify-start gap-3 px-3 text-[13px]",
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && "Sign out"}
          </Button>
        </div>
      </div>
    </aside>
  );
}
