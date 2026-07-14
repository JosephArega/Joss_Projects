import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getDeviceKey } from '../lib/identity';
import { cacheReports, loadCachedReports } from '../lib/offlineCache';
import { SAMPLE_REPORTS } from '../constants/sampleData';
import { Report, ReportType } from '../types';

interface SubmitInput {
  type: ReportType;
  lat: number;
  lng: number;
  note?: string;
  neighborhood?: string;
}

interface Options {
  onNewReport?: (report: Report) => void;
}

const isVisible = (r: Report) =>
  (r.status === 'active' || r.status === 'high_priority') &&
  new Date(r.expires_at).getTime() > Date.now();

const prune = (list: Report[]) => list.filter(isVisible);

const upsert = (list: Report[], row: Report) =>
  prune([row, ...list.filter((r) => r.id !== row.id)]).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

export function useReports(opts: Options = {}) {
  const [reports, setReports] = useState<Report[]>([]);
  const [offline, setOffline] = useState(false);
  const onNewRef = useRef(opts.onNewReport);
  onNewRef.current = opts.onNewReport;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!supabase) {
        setReports(prune(SAMPLE_REPORTS));
        return;
      }
      try {
        const { data, error } = await supabase
          .from('active_reports')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (!cancelled) {
          setReports(prune(data as Report[]));
          setOffline(false);
          cacheReports(data as Report[]);
        }
      } catch {
        const cached = await loadCachedReports();
        if (!cancelled) {
          if (cached) setReports(prune(cached));
          setOffline(true);
        }
      }
    }
    load();

    if (!supabase) return;
    const channel = supabase
      .channel('reports-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reports' },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const old = payload.old as { id?: string };
            if (old.id) setReports((prev) => prev.filter((r) => r.id !== old.id));
            return;
          }
          const row = payload.new as Report;
          setReports((prev) => upsert(prev, row));
          if (payload.eventType === 'INSERT' && isVisible(row)) {
            onNewRef.current?.(row);
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase?.removeChannel(channel);
    };
  }, []);

  // Auto-fade: sweep expired reports off the map every 30 s.
  useEffect(() => {
    const id = setInterval(() => setReports((prev) => prune(prev)), 30000);
    return () => clearInterval(id);
  }, []);

  const submitReport = useCallback(async (input: SubmitInput): Promise<Report> => {
    const deviceKey = await getDeviceKey();
    if (!supabase) {
      const local: Report = {
        id: `local-${Date.now()}`,
        type: input.type,
        lat: input.lat,
        lng: input.lng,
        note: input.note ?? null,
        neighborhood: input.neighborhood ?? null,
        confirmations: 0,
        dismissals: 0,
        status: 'active',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 60000).toISOString(),
      };
      setReports((prev) => upsert(prev, local));
      return local;
    }
    const { data, error } = await supabase.rpc('submit_report', {
      p_type: input.type,
      p_lat: input.lat,
      p_lng: input.lng,
      p_device_key: deviceKey,
      p_note: input.note ?? null,
      p_neighborhood: input.neighborhood ?? null,
    });
    if (error) throw error;
    const row = (Array.isArray(data) ? data[0] : data) as Report;
    setReports((prev) => upsert(prev, row));
    return row;
  }, []);

  const vote = useCallback(async (reportId: string, value: 1 | -1): Promise<void> => {
    const deviceKey = await getDeviceKey();
    if (!supabase) {
      setReports((prev) =>
        prune(
          prev.map((r) => {
            if (r.id !== reportId) return r;
            const confirmations = r.confirmations + (value === 1 ? 1 : 0);
            const dismissals = r.dismissals + (value === -1 ? 1 : 0);
            let status = r.status;
            if (dismissals >= 3 && dismissals > confirmations) status = 'dismissed';
            else if (confirmations >= 3) status = 'high_priority';
            return { ...r, confirmations, dismissals, status };
          })
        )
      );
      return;
    }
    const { data, error } = await supabase.rpc('vote_report', {
      p_report_id: reportId,
      p_voter_key: deviceKey,
      p_vote: value,
    });
    if (error) throw error;
    const row = (Array.isArray(data) ? data[0] : data) as Report | undefined;
    setReports((prev) =>
      row ? upsert(prev, row) : prev.filter((r) => r.id !== reportId)
    );
  }, []);

  return { reports, offline, submitReport, vote };
}
