import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function showBrowserNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const n = new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'prams-notification',
      });
      // Auto-close after 5 seconds
      setTimeout(() => n.close(), 5000);
      // Focus the window when clicked
      n.onclick = () => {
        window.focus();
        n.close();
      };
    } catch {
      // Notification constructor may fail in some environments
    }
  }
}

function playChime() {
  try {
    const ctx = new AudioContext();

    // Two-tone chime: a higher note followed by a lower note
    const notes = [
      { freq: 880, startAt: 0, duration: 0.15 },
      { freq: 660, startAt: 0.15, duration: 0.25 },
    ];

    notes.forEach(({ freq, startAt, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startAt);

      gain.gain.setValueAtTime(0, ctx.currentTime + startAt);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + startAt + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startAt + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + startAt);
      osc.stop(ctx.currentTime + startAt + duration);
    });

    // Close the context after the chime finishes to free resources
    setTimeout(() => ctx.close(), 600);
  } catch {
    // AudioContext may be unavailable in some environments — fail silently
  }
}

/**
 * Opens a Server-Sent Events connection to /notifications/stream.
 * Whenever the server pushes an event (a new notification was created),
 * it invalidates the React Query notification cache so the UI updates instantly
 * and plays a short chime.
 *
 * EventSource does not support custom request headers, so the JWT is passed
 * as a query parameter — the backend validates it manually on the SSE endpoint.
 */
export function useNotificationStream() {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    requestNotificationPermission();

    const baseUrl = import.meta.env.VITE_API_URL || '/api';
    const url = `${baseUrl}/notifications/stream?token=${encodeURIComponent(accessToken)}`;

    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (event) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      playChime();

      // Show browser notification if tab is not focused
      if (document.hidden) {
        try {
          const data = JSON.parse(event.data);
          if (data.title) {
            showBrowserNotification(data.title, data.message || '');
          }
        } catch {
          showBrowserNotification('PRAMS', 'You have a new notification.');
        }
      }
    };

    es.onerror = () => {
      // EventSource auto-reconnects on network errors — no manual handling needed.
      // On auth failure the server closes the connection and reconnection stops.
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [accessToken, queryClient]);
}
