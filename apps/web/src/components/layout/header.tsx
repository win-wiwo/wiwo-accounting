import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, CheckCheck, Search, FileText, Loader2, CheckCircle2, XCircle, RotateCcw, Send, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useUnreadCount, useNotifications, useMarkAsRead, useMarkAllAsRead } from '@/hooks/use-notifications';
import { useNotificationStream } from '@/hooks/use-notification-stream';
import { usePurchaseRequests } from '@/hooks/use-purchase-requests';
import { Button } from '@/components/ui/button';
import { PR_STATUS_LABELS, type PrStatus, UserRole } from '@prams/shared';
import { cn } from '@/lib/utils';
import * as Popover from '@radix-ui/react-popover';
import { useAuthStore } from '@/stores/auth.store';

interface HeaderProps {
  sidebarCollapsed: boolean;
}

interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type: string;
  purchaseRequestId: string | null;
  purchaseOrderId: string | null;
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

function getNotificationConfig(type: string) {
  switch (type) {
    case 'approval_approved':
      return { icon: CheckCircle2, bgClass: 'bg-emerald-50', iconClass: 'text-emerald-600' };
    case 'approval_rejected':
      return { icon: XCircle, bgClass: 'bg-red-50', iconClass: 'text-red-500' };
    case 'approval_returned':
      return { icon: RotateCcw, bgClass: 'bg-amber-50', iconClass: 'text-amber-600' };
    case 'pr_submitted':
      return { icon: Send, bgClass: 'bg-blue-50', iconClass: 'text-blue-500' };
    case 'pr_needs_action':
      return { icon: AlertCircle, bgClass: 'bg-blue-50', iconClass: 'text-blue-600' };
    default:
      return { icon: Bell, bgClass: 'bg-zinc-100', iconClass: 'text-zinc-500' };
  }
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
        <div className="absolute left-0 top-full z-50 mt-2 w-full min-w-[320px] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-popover animate-in fade-in-0 zoom-in-95">
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
  const user = useAuthStore((s) => s.user);

  useNotificationStream();

  const { data: unreadData } = useUnreadCount();
  const unreadCount = (unreadData as unknown as { data?: { count: number } })?.data?.count ?? 0;

  // Update browser tab title with unread count
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\+?\)\s*/, '');
    document.title = unreadCount > 0
      ? `(${unreadCount > 99 ? '99+' : unreadCount}) ${base}`
      : base;
  }, [unreadCount]);

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
    if ((notif.type === 'po_ordered' || notif.type === 'po_received' || notif.type === 'po_cancelled') && notif.purchaseOrderId) {
      navigate(`/purchase-orders/${notif.purchaseOrderId}`);
      setNotifOpen(false);
      return;
    }
    if (notif.purchaseRequestId) {
      if (notif.type === 'pr_needs_action') {
        if (user?.role === UserRole.PROCUREMENT) {
          navigate(`/procurement/${notif.purchaseRequestId}`);
        } else if (user?.role === UserRole.DEPT_HEAD || user?.role === UserRole.COO || user?.role === UserRole.CEO) {
          navigate(`/approvals?pr=${notif.purchaseRequestId}`);
        } else {
          navigate(`/purchase-requests/${notif.purchaseRequestId}`);
        }
      } else {
        navigate(`/purchase-requests/${notif.purchaseRequestId}`);
      }
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
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground tabular-nums">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Button>
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Content
              className="z-50 w-[360px] overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-popover animate-in fade-in-0 zoom-in-95 slide-in-from-top-2"
              align="end"
              sideOffset={8}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-[13px] font-semibold text-zinc-900 tracking-tight">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-900 px-1.5 text-[10px] font-bold text-white tabular-nums">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    className="flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-zinc-700 transition-colors duration-150"
                    onClick={() => markAllAsRead.mutate()}
                  >
                    <CheckCheck className="h-3 w-3" />
                    Mark all read
                  </button>
                )}
              </div>

              {/* Notification list */}
              <div className="max-h-[400px] overflow-y-auto overscroll-contain scrollbar-modern py-1">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-50 mb-3">
                      <Bell className="h-4 w-4 text-zinc-300" />
                    </div>
                    <p className="text-[13px] font-medium text-zinc-400">No notifications yet</p>
                    <p className="text-[11px] text-zinc-300 mt-0.5">You're all caught up</p>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const config = getNotificationConfig(notif.type);
                    return (
                      <div
                        key={notif._id}
                        className={cn(
                          'group relative flex items-start gap-3 mx-1.5 my-0.5 px-3.5 py-3 cursor-pointer rounded-lg transition-all duration-150',
                          !notif.isRead
                            ? 'bg-zinc-50 hover:bg-zinc-100/80 active:bg-zinc-100'
                            : 'hover:bg-zinc-50 active:bg-zinc-100/60',
                        )}
                        onClick={() => handleNotificationClick(notif)}
                      >
                        {/* Icon badge */}
                        <div className={cn(
                          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                          config.bgClass,
                        )}>
                          <config.icon className={cn('h-3.5 w-3.5', config.iconClass)} />
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <p className={cn(
                            'text-[13px] leading-snug text-zinc-800 truncate',
                            !notif.isRead ? 'font-semibold' : 'font-medium',
                          )}>
                            {notif.title}
                          </p>
                          <p className="text-[12px] text-zinc-400 truncate mt-0.5">
                            {notif.message} <span className="text-zinc-300">&middot;</span> <span className="text-zinc-300">{timeAgo(notif.createdAt)}</span>
                          </p>
                        </div>

                        {/* Unread dot */}
                        {!notif.isRead && (
                          <div className="mt-3 flex shrink-0">
                            <span className="h-1.5 w-1.5 rounded-full bg-zinc-900" />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

      </div>
    </header>
  );
}
