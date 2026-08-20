import supabase from './db-client.js';

const MAP = {
  features: { table: 'features', order: 'sort_order' },
  workflow: { table: 'workflow_steps', order: 'step_number' },
  modules: { table: 'test_modules', order: 'id' },
  roadmap: { table: 'roadmap_phases', order: 'id' },
  deployments: { table: 'deployment_options', order: 'sort_order' },
  personas: { table: 'personas', order: 'sort_order' },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const type = req.query.type || 'all';
    if (type === 'all') {
      const entries = Object.entries(MAP);
      const results = await Promise.all(
        entries.map(([, cfg]) =>
          supabase.from(cfg.table).select('*').order(cfg.order, { ascending: true })
        )
      );
      const out = {};
      entries.forEach(([key], i) => {
        out[key] = results[i].data || [];
      });
      return res.status(200).json(out);
    }
    const cfg = MAP[type];
    if (!cfg) return res.status(400).json({ error: 'Unknown content type' });
    const { data, error } = await supabase.from(cfg.table).select('*').order(cfg.order, { ascending: true });
    if (error) throw error;
    return res.status(200).json(data);
  } catch (err) {
    console.error('content error:', err);
    return res.status(500).json({ error: err.message });
  }
}
