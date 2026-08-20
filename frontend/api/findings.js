import supabase from './db-client.js';
import { getAuthUser, unauthorized } from './auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const user = await getAuthUser(req);
  if (!user) return unauthorized(res);

  try {
    if (req.method === 'GET') {
      const { scan_id, severity, status, category, limit } = req.query;
      let q = supabase.from('findings').select('*');
      if (scan_id) q = q.eq('scan_id', Number(scan_id));
      if (severity && severity !== 'all') q = q.eq('severity', severity);
      if (status && status !== 'all') q = q.eq('status', status);
      if (category && category !== 'all') q = q.eq('category', category);
      q = q
        .order('cvss', { ascending: false })
        .order('discovered_at', { ascending: false })
        .limit(limit ? Number(limit) : 500);
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'PUT') {
      const { id, status } = req.body || {};
      const allowed = ['open', 'in_review', 'fixed', 'dismissed'];
      if (!id || !allowed.includes(status)) {
        return res.status(400).json({ error: 'Invalid id or status' });
      }
      const { data, error } = await supabase
        .from('findings')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('findings error:', err);
    res.status(500).json({ error: err.message });
  }
}
