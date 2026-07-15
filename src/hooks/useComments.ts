import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import api from '@/services/api';
import { supabase } from '@/lib/supabase';

export interface Comment {
  id: string;
  user_id: string;
  display_name: string;
  context_type: string;
  context_id: string;
  content: string;
  created_at: string;
}

interface UseCommentsResult {
  comments: Comment[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  sendComment: (content: string, displayName: string) => Promise<void>;
  loadMore: () => void;
  hasMore: boolean;
}

export function useComments(
  contextType: 'match' | 'tip',
  contextId: string,
): UseCommentsResult {
  const [comments, setComments]   = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [cursor, setCursor]       = useState<string | null>(null);
  const [hasMore, setHasMore]     = useState(false);

  const seenIds    = useRef(new Set<string>());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const mergeComments = useCallback((incoming: Comment[]) => {
    setComments(prev => {
      const next = [...prev];
      for (const c of incoming) {
        if (!seenIds.current.has(c.id)) {
          seenIds.current.add(c.id);
          next.push(c);
        }
      }
      // Sort oldest → newest for display (newest at bottom like a chat)
      next.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      return next;
    });
  }, []);

  // Initial fetch
  useEffect(() => {
    if (!contextId) return;
    setIsLoading(true);
    setComments([]);
    seenIds.current = new Set();
    setCursor(null);
    setHasMore(false);

    api.get<{ comments: Comment[] }>(`/comments/${contextType}/${contextId}`)
      .then(data => {
        const list = data.comments ?? [];
        if (list.length === 30) {
          setHasMore(true);
          setCursor(list[list.length - 1].created_at);
        }
        mergeComments(list);
      })
      .catch(() => setError('Failed to load comments'))
      .finally(() => setIsLoading(false));
  }, [contextType, contextId, mergeComments]);

  // Unique nonce so each hook instance gets its own Supabase channel name.
  // Supabase returns the SAME channel object for the same name, which throws
  // when .on() is called after subscribe() — triggered by React Strict Mode's
  // double-effect invocation and by navigation freeze/unfreeze cycles.
  const channelNonce = useMemo(() => Math.random().toString(36).slice(2, 7), []);

  // Supabase Realtime subscription
  useEffect(() => {
    if (!contextId) return;

    const channel = supabase
      .channel(`comments:${contextType}:${contextId}:${channelNonce}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'match_comments',
          filter: `context_type=eq.${contextType}`,
        },
        (payload) => {
          const c = payload.new as Comment;
          if (c.context_id !== contextId) return;
          mergeComments([c]);
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [contextType, contextId, mergeComments]);

  const loadMore = useCallback(() => {
    if (!hasMore || !cursor) return;
    api.get<{ comments: Comment[] }>(
      `/comments/${contextType}/${contextId}?cursor=${encodeURIComponent(cursor)}`,
    ).then(data => {
      const list = data.comments ?? [];
      if (list.length === 30) {
        setCursor(list[list.length - 1].created_at);
      } else {
        setHasMore(false);
        setCursor(null);
      }
      mergeComments(list);
    }).catch(() => {});
  }, [hasMore, cursor, contextType, contextId, mergeComments]);

  const sendComment = useCallback(async (content: string, displayName: string) => {
    setIsSending(true);
    setError(null);
    try {
      const result = await api.post<{ comment: Comment }>('/comments', { contextType, contextId, content, displayName });
      // Add immediately from API response — realtime is a bonus; seenIds deduplicates if both arrive
      if (result?.comment) {
        mergeComments([result.comment]);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to send comment');
      throw e;
    } finally {
      setIsSending(false);
    }
  }, [contextType, contextId, mergeComments]);

  return { comments, isLoading, isSending, error, sendComment, loadMore, hasMore };
}
