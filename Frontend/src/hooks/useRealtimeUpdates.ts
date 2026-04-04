import { useState, useEffect, useCallback } from "react";

export interface CacheEvent {
  type: string;
  file_path: string;
  line?: number;
  pattern_name?: string;
  one_liner?: string;
  confidence: string;
  timestamp: string;
}

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const sec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec} seconds ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const h = Math.floor(min / 60);
  return `${h} hour${h === 1 ? "" : "s"} ago`;
}

export function formatCacheEventTime(iso: string): string {
  return timeAgo(iso);
}

/**
 * SSE feed for new cached explanations (Mongo change stream on explanations_cache).
 */
export function useRealtimeUpdates(repo: string | null) {
  const [events, setEvents] = useState<CacheEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  useEffect(() => {
    setEvents([]);
    setConnected(false);
    setStreamError(null);

    if (!repo) {
      return;
    }

    const eventSource = new EventSource(
      `/api/events/stream?repo=${encodeURIComponent(repo)}`,
      { withCredentials: true }
    );

    eventSource.addEventListener("connected", () => {
      setConnected(true);
      setStreamError(null);
    });

    eventSource.addEventListener("explanation_cached", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as CacheEvent;
        setEvents((prev) => [data, ...prev].slice(0, 50));
      } catch {
        /* ignore */
      }
    });

    eventSource.addEventListener("stream_error", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as { error?: string };
        setStreamError(data.error || "Stream unavailable");
      } catch {
        setStreamError("Stream unavailable");
      }
      setConnected(false);
    });

    eventSource.addEventListener("ping", () => {});

    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => {
      eventSource.close();
      setConnected(false);
    };
  }, [repo]);

  const clearEvents = useCallback(() => setEvents([]), []);

  return { events, connected, clearEvents, streamError };
}
