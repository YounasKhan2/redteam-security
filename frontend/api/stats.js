import supabase from './db-client.js';
import { getAuthUser, unauthorized } from './auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const user = await getAuthUser(req);
  if (!user) return unauthorized(res);

  try {
    const [scansRes, findingsRes] = await Promise.all([
      supabase.from('scans').select('*'),
      supabase.from('findings').select('*'),
    ]);
    const scans = scansRes.data || [];
    const findings = findingsRes.data || [];

    const open = findings.filter((f) => f.status === 'open' || f.status === 'in_review');
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
    open.forEach((f) => {
      bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
    });

    const catMap = {};
    open.forEach((f) => {
      catMap[f.category] = (catMap[f.category] || 0) + 1;
    });
    const byCategory = Object.entries(catMap)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    const completed = scans.filter((s) => s.status === 'completed');
    const passed = completed.filter((s) => s.gate_status === 'pass').length;
    const dismissed = findings.filter((f) => f.status === 'dismissed').length;
    const avgCvss = open.length ? open.reduce((a, f) => a + Number(f.cvss), 0) / open.length : 0;

    const scanName = {};
    scans.forEach((s) => {
      scanName[s.id] = s.name;
    });
    const recent = [...findings]
      .sort((a, b) => new Date(b.discovered_at) - new Date(a.discovered_at))
      .slice(0, 6)
      .map((f) => ({ ...f, scan_name: scanName[f.scan_id] || '' }));

    return res.status(200).json({
      total_scans: scans.length,
      running_scans: scans.filter((s) => s.status === 'running').length,
      completed_scans: completed.length,
      total_findings: findings.length,
      open_findings: open.length,
      dismissed_findings: dismissed,
      by_severity: bySeverity,
      by_category: byCategory,
      gate_pass_rate: completed.length ? Math.round((passed / completed.length) * 100) : 0,
      false_positive_rate: findings.length ? Math.round((dismissed / findings.length) * 100) : 0,
      avg_cvss: Math.round(avgCvss * 10) / 10,
      recent_findings: recent,
    });
  } catch (err) {
    console.error('stats error:', err);
    res.status(500).json({ error: err.message });
  }
}
