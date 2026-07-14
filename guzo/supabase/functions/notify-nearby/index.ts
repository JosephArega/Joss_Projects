// Supabase Edge Function: notify-nearby
//
// Wire a Database Webhook (Dashboard → Database → Webhooks) on
// INSERT into public.reports pointing at this function. For every
// new report it pushes an Expo notification to opted-in devices
// whose last known location is within their alert radius (2 km
// default), localized to the device language.
//
// Deploy: supabase functions deploy notify-nearby

import { createClient } from 'npm:@supabase/supabase-js@2';

const TYPE_LABELS: Record<string, { en: string; am: string; emoji: string }> = {
  traffic: { en: 'Heavy traffic', am: 'የትራፊክ መጨናነቅ', emoji: '🚗' },
  police: { en: 'Traffic police', am: 'የትራፊክ ፖሊስ', emoji: '👮' },
  blocked: { en: 'Road blocked', am: 'የተዘጋ መንገድ', emoji: '🚧' },
  pothole: { en: 'Pothole', am: 'ጉድጓድ', emoji: '🕳️' },
  flood: { en: 'Flooded road', am: 'ጎርፍ', emoji: '🌊' },
  accident: { en: 'Accident', am: 'አደጋ', emoji: '💥' },
  fuel: { en: 'Fuel queue', am: 'የነዳጅ ወረፋ', emoji: '⛽' },
  tip: { en: 'Driver tip', am: 'የአሽከርካሪ ምክር', emoji: '💬' },
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

Deno.serve(async (req) => {
  const payload = await req.json().catch(() => null);
  const report = payload?.record;
  if (!report?.lat || !report?.lng) {
    return new Response('no report record', { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: devices, error } = await supabase
    .from('devices')
    .select('device_key, expo_push_token, last_lat, last_lng, notify_radius_km, language')
    .eq('notify_enabled', true)
    .not('expo_push_token', 'is', null)
    .not('last_lat', 'is', null);

  if (error) return new Response(error.message, { status: 500 });

  const label = TYPE_LABELS[report.type] ?? TYPE_LABELS.traffic;

  const messages = (devices ?? [])
    .filter((d) => d.device_key !== report.device_key)
    .map((d) => ({
      device: d,
      km: haversineKm(d.last_lat, d.last_lng, report.lat, report.lng),
    }))
    .filter(({ device, km }) => km <= Number(device.notify_radius_km ?? 2))
    .map(({ device, km }) => {
      const am = device.language === 'am';
      return {
        to: device.expo_push_token,
        sound: 'default',
        title: am
          ? `${label.emoji} ${label.am} በአቅራቢያዎ`
          : `${label.emoji} ${label.en} near you`,
        body: am
          ? `${km.toFixed(1)} ኪ.ሜ ርቀት · ${report.neighborhood ?? ''}`
          : `${km.toFixed(1)} km away · ${report.neighborhood ?? ''}`,
        data: { reportId: report.id },
      };
    });

  // Expo push API accepts batches of up to 100 messages.
  for (let i = 0; i < messages.length; i += 100) {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages.slice(i, i + 100)),
    });
  }

  return new Response(JSON.stringify({ notified: messages.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
