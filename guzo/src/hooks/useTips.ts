import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getDeviceKey } from '../lib/identity';
import { cacheTips, loadCachedTips } from '../lib/offlineCache';
import { SAMPLE_TIPS } from '../constants/sampleData';
import { Tip } from '../types';

interface PostInput {
  body: string;
  neighborhood: string;
  lat?: number;
  lng?: number;
  nickname?: string;
}

export function useTips() {
  const [tips, setTips] = useState<Tip[]>([]);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!supabase) {
        setTips(SAMPLE_TIPS);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('tips')
          .select('id, body, neighborhood, lat, lng, nickname, upvotes, created_at')
          .order('created_at', { ascending: false })
          .limit(100);
        if (error) throw error;
        if (!cancelled) {
          setTips(data as Tip[]);
          setOffline(false);
          cacheTips(data as Tip[]);
        }
      } catch {
        const cached = await loadCachedTips();
        if (!cancelled) {
          if (cached) setTips(cached);
          setOffline(true);
        }
      }
    }
    load();

    if (!supabase) return;
    const channel = supabase
      .channel('tips-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tips' },
        (payload) => {
          const row = payload.new as Tip;
          setTips((prev) => [row, ...prev.filter((x) => x.id !== row.id)]);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase?.removeChannel(channel);
    };
  }, []);

  const postTip = useCallback(async (input: PostInput): Promise<void> => {
    const deviceKey = await getDeviceKey();
    if (!supabase) {
      const local: Tip = {
        id: `local-${Date.now()}`,
        body: input.body,
        neighborhood: input.neighborhood,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
        nickname: input.nickname || null,
        upvotes: 0,
        created_at: new Date().toISOString(),
      };
      setTips((prev) => [local, ...prev]);
      return;
    }
    const { data, error } = await supabase.rpc('post_tip', {
      p_body: input.body,
      p_neighborhood: input.neighborhood,
      p_device_key: deviceKey,
      p_lat: input.lat ?? null,
      p_lng: input.lng ?? null,
      p_nickname: input.nickname || null,
    });
    if (error) throw error;
    const row = (Array.isArray(data) ? data[0] : data) as Tip;
    setTips((prev) => [row, ...prev.filter((x) => x.id !== row.id)]);
  }, []);

  const upvoteTip = useCallback(async (tipId: string): Promise<void> => {
    setTips((prev) =>
      prev.map((x) => (x.id === tipId ? { ...x, upvotes: x.upvotes + 1 } : x))
    );
    if (!supabase) return;
    const deviceKey = await getDeviceKey();
    await supabase
      .rpc('upvote_tip', { p_tip_id: tipId, p_voter_key: deviceKey })
      .then(() => {});
  }, []);

  return { tips, offline, postTip, upvoteTip };
}
