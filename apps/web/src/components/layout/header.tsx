import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, CheckCheck, Search, FileText, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useUnreadCount, useNotifications, useMarkAsRead, useMarkAllAsRead } from '@/hooks/use-notifications';
import { usePurchaseRequests } from '@/hooks/use-purchase-requests';
import { Button } from '@/components/ui/button';
import { PR_STATUS_LABELS, type PrStatus } from '@prams/shared';
import { cn } from '@/lib/utils';
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

  const hasSearchQuery = debouncedQuery.trim().length >= 2;
  const { data, isLoading } = usePurchaseRequests(
    hasSearchQuery ? { search: debouncedQuery.trim(), limit: 5 } : {},
    { enabled: hasSearchQuery },
  );
  const results = hasSearchQuery ? (data?.data ?? []) : [];

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
      <div className="relative group/search">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[oklch(0.44_0_0)] transition-colors duration-200 group-focus-within/search:text-[oklch(0.65_0_0)]" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search PRs... (Ctrl+K)"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="header-search"
        />
      </div>

      {open && hasSearchQuery && (
        <div className="absolute left-0 top-full z-50 mt-2 w-full min-w-[320px] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.12)] animate-in fade-in-0 zoom-in-95">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
            </div>
          ) : results.length === 0 ? (
            <div className="py-6 text-center text-[13px] text-zinc-400">
              No results found
            </div>
          ) : (
            <>
              {results.map((pr) => (
                <div
                  key={pr._id}
                  className="flex cursor-pointer items-center gap-3 border-b border-zinc-100 px-4 py-3 last:border-0 hover:bg-zinc-50 transition-colors duration-150"
                  onClick={() => {
                    navigate(`/purchase-requests/${pr._id}`);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  <FileText className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-zinc-800">{pr.title}</p>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                      <span className="font-mono">{pr.prNumber || 'Draft'}</span>
                      <span>·</span>
                      <span>{PR_STATUS_LABELS[pr.status as PrStatus]}</span>
                    </div>
                  </div>
                </div>
              ))}
              <div
                className="cursor-pointer border-t border-zinc-100 bg-zinc-50/50 px-4 py-2.5 text-center text-[12px] font-medium text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50 transition-colors duration-150"
                onClick={() => {
                  navigate(`/search?search=${encodeURIComponent(query.trim())}`);
                  setOpen(false);
                  setQuery('');
                }}
              >
                View all results →
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
  const queryClient = useQueryClient();

  const { data: unreadData } = useUnreadCount();
  const unreadCount = (unreadData as unknown as { data?: { count: number } })?.data?.count ?? 0;

  const [notifOpen, setNotifOpen] = useState(false);
  const { data: notifData } = useNotifications({ page: 1, limit: 15 });
  const notifications = ((notifData as unknown as { data?: NotificationItem[] })?.data ?? []) as NotificationItem[];

  useEffect(() => {
    if (notifOpen) {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  }, [notifOpen, queryClient]);

  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const handleNotificationClick = (notif: NotificationItem) => {
    if (!notif.isRead) {
      markAsRead.mutate(notif._id);
    }
    if (notif.purchaseRequestId) {
      navigate(`/purchase-requests/${notif.purchaseRequestId}`);
      setNotifOpen(false);
    }
  };

  return (
    <header
      className={cn(
        'fixed right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-sidebar-border bg-sidebar px-6 transition-all duration-300',
        sidebarCollapsed ? 'left-16' : 'left-64',
      )}
    >
      <QuickSearch />

      <div className="flex items-center gap-2">
        {/* Notification Bell */}
        <Popover.Root open={notifOpen} onOpenChange={setNotifOpen}>
          <Popover.Trigger asChild>
            <Button variant="ghost" size="icon" className="relative h-9 w-9 text-sidebar-foreground/50 hover:bg-white/[0.06] hover:text-sidebar-foreground">
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

      </div>
    </header>
  );
}
