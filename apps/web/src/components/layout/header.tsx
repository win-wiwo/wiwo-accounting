import { useState, useRef, useEffect, useCallback } from 'react';
import { LogOut, User, KeyRound, Bell, CheckCheck, Search, FileText, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { useUnreadCount, useNotifications, useMarkAsRead, useMarkAllAsRead } from '@/hooks/use-notifications';
import { usePurchaseRequests } from '@/hooks/use-purchase-requests';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ROLE_LABELS, PR_STATUS_LABELS, type UserRole, type PrStatus } from '@prams/shared';
import { Badge } from '@/components/ui/badge';
import apiClient from '@/lib/api-client';
import { cn } from '@/lib/utils';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Popover from '@radix-ui/react-popover';

interface HeaderProps {
  sidebarCollapsed: boolean;
}

interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type: string;
  purchaseRequestId: string | null;
  isRead: boolean;
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function QuickSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isLoading } = usePurchaseRequests(
    debouncedQuery.length >= 2
      ? { search: debouncedQuery, limit: 5 }
      : { limit: 0 },
  );
  const results = debouncedQuery.length >= 2 ? (data?.data ?? []) : [];

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      navigate(`/search?search=${encodeURIComponent(query.trim())}`);
      setOpen(false);
      setQuery('');
    }
    if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  }, [query, navigate]);

  // Keyboard shortcut: Ctrl+K or Cmd+K to focus
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative hidden md:block">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search PRs... (Ctrl+K)"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="h-8 w-56 rounded-md border border-input bg-muted/40 pl-8 pr-3 text-sm placeholder:text-muted-foreground/60 focus:bg-background focus:outline-none focus:ring-1 focus:ring-ring lg:w-72"
        />
      </div>

      {open && debouncedQuery.length >= 2 && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[320px] overflow-hidden rounded-lg border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : results.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No results found
            </div>
          ) : (
            <>
              {results.map((pr) => (
                <div
                  key={pr._id}
                  className="flex cursor-pointer items-center gap-3 border-b px-3 py-2.5 last:border-0 hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    navigate(`/purchase-requests/${pr._id}`);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{pr.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">{pr.prNumber || 'Draft'}</span>
                      <span>&middot;</span>
                      <span>{PR_STATUS_LABELS[pr.status as PrStatus]}</span>
                    </div>
                  </div>
                </div>
              ))}
              <div
                className="cursor-pointer border-t bg-muted/30 px-3 py-2 text-center text-xs font-medium text-primary hover:bg-muted/50 transition-colors"
                onClick={() => {
                  navigate(`/search?search=${encodeURIComponent(query.trim())}`);
                  setOpen(false);
                  setQuery('');
                }}
              >
                View all results
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function Header({ sidebarCollapsed }: HeaderProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const { data: unreadData } = useUnreadCount();
  const unreadCount = (unreadData as unknown as { count?: number })?.count ?? 0;

  const [notifOpen, setNotifOpen] = useState(false);
  const { data: notifData } = useNotifications({ page: 1, limit: 10 });
  const notifications = ((notifData as unknown as { data?: NotificationItem[] })?.data ?? []) as NotificationItem[];

  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // proceed with logout even if API call fails
    }
    logout();
    navigate('/login');
  };

  const handleNotificationClick = (notif: NotificationItem) => {
    if (!notif.isRead) {
      markAsRead.mutate(notif._id);
    }
    if (notif.purchaseRequestId) {
      navigate(`/purchase-requests/${notif.purchaseRequestId}`);
      setNotifOpen(false);
    }
  };

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : '??';

  return (
    <header
      className={cn(
        'fixed right-0 top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-300',
        sidebarCollapsed ? 'left-16' : 'left-64',
      )}
    >
      <QuickSearch />

      <div className="flex items-center gap-2">
        {/* Notification Bell */}
        <Popover.Root open={notifOpen} onOpenChange={setNotifOpen}>
          <Popover.Trigger asChild>
            <Button variant="ghost" size="icon" className="relative h-9 w-9">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Button>
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Content
              className="z-50 w-80 overflow-hidden rounded-lg border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95"
              align="end"
              sideOffset={8}
            >
              <div className="flex items-center justify-between border-b px-4 py-3">
                <h3 className="text-sm font-semibold">Notifications</h3>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => markAllAsRead.mutate()}
                  >
                    <CheckCheck className="h-3.5 w-3.5 mr-1" /> Mark all read
                  </Button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Bell className="h-8 w-8 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">No notifications</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif._id}
                      className={cn(
                        'flex gap-3 border-b px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50 last:border-0',
                        !notif.isRead && 'bg-primary/[0.03]',
                      )}
                      onClick={() => handleNotificationClick(notif)}
                    >
                      <div className={cn('mt-0.5 h-2 w-2 shrink-0 rounded-full', !notif.isRead ? 'bg-primary' : 'bg-transparent')} />
                      <div className="min-w-0 flex-1">
                        <p className={cn('text-sm truncate', !notif.isRead && 'font-medium')}>
                          {notif.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {notif.message}
                        </p>
                        <p className="text-[11px] text-muted-foreground/70 mt-1">
                          {timeAgo(notif.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        {/* User Menu */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button variant="ghost" className="relative h-9 gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-col items-start text-left md:flex">
                <span className="text-sm font-medium">
                  {user?.firstName} {user?.lastName}
                </span>
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                  {ROLE_LABELS[user?.role as UserRole] || user?.role}
                </Badge>
              </div>
            </Button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="z-50 min-w-[200px] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
              align="end"
              sideOffset={8}
            >
              <DropdownMenu.Label className="px-2 py-1.5 text-sm font-semibold">
                {user?.email}
              </DropdownMenu.Label>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />

              <DropdownMenu.Item
                className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent"
                onSelect={() => navigate('/profile')}
              >
                <User className="h-4 w-4" />
                Profile
              </DropdownMenu.Item>

              <DropdownMenu.Item
                className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent"
                onSelect={() => navigate('/change-password')}
              >
                <KeyRound className="h-4 w-4" />
                Change Password
              </DropdownMenu.Item>

              <DropdownMenu.Separator className="my-1 h-px bg-border" />

              <DropdownMenu.Item
                className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive outline-none transition-colors hover:bg-destructive/10"
                onSelect={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Log out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
