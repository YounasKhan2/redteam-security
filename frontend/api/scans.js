import supabase from './db-client.js';
import { getAuthUser, unauthorized } from './auth.js';

async function ensureEvent(scanId, phaseKey, level, message) {
  const { data } = await supabase
    .from('scan_events')
    .select('id')
    .eq('scan_id', scanId)
    .eq('phase_key', phaseKey)
    .limit(1);
  if (data && data.length) return false;
  await supabase.from('scan_events').insert({ scan_id: scanId, phase_key: phaseKey, level, message });
  return true;
}

async function advance(scan) {
  // Read only the real findings discovered for this scan
  const { data: realFindings } = await supabase
    .from('findings')
    .select('severity')
    .eq('scan_id', scan.id);

  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  (realFindings || []).forEach((f) => {
    const sev = (f.severity || 'low').toLowerCase();
    if (counts[sev] !== undefined) counts[sev]++;
  });

  const gate = counts.critical + counts.high > 0 ? 'fail' : 'pass';

  return {
    ...scan,
    critical_count: counts.critical,
    high_count: counts.high,
    medium_count: counts.medium,
    low_count: counts.low,
    gate_status: scan.status === 'completed' ? gate : scan.gate_status,
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const user = await getAuthUser(req);
  if (!user) return unauthorized(res);

  if (req.method === 'GET') {
    const { id } = req.query;
    if (id) {
      const { data, error } = await supabase.from('scans').select('*').eq('id', id).single();
      if (error || !data) return res.status(404).json({ error: 'Scan not found' });
      const advanced = await advance(data);
      return res.status(200).json(advanced);
    }
    const { data, error } = await supabase.from('scans').select('*').order('started_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    const list = await Promise.all((data || []).map((s) => advance(s)));
    return res.status(200).json(list);
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const {
      name = 'Staging API Sweep',
      target_url,
      spec_type = 'generic_url',
      environment = 'staging',
      modules = ['p-auth', 'p-rate', 'p-inject', 'p-logic', 'p-ssrf'],
    } = body;
    if (!target_url) return res.status(400).json({ error: 'target_url is required' });

    const newScan = {
      name,
      target_url,
      spec_type,
      environment,
      status: 'running',
      progress: 0,
      modules,
      started_at: new Date().toISOString(),
      requests_sent: 0,
      critical_count: 0,
      high_count: 0,
      medium_count: 0,
      low_count: 0,
      gate_status: null,
    };

    const { data, error } = await supabase.from('scans').insert(newScan).select().single();
    if (error) return res.status(500).json({ error: error.message });

    await ensureEvent(data.id, 'p-init', 'INFO', 'Scan requested by ' + (user.email || 'authenticated user'));
    return res.status(201).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
