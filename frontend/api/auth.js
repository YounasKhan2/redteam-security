import supabase from './db-client.js';

// Verifies the Bearer token on an incoming request against Supabase Auth.
// Returns the authenticated user, or null when the token is missing/invalid.
export async function getAuthUser(req) {
  const header = req.headers.authorization || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data || !data.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

export function unauthorized(res) {
  return res.status(401).json({ error: 'Authentication required — please sign in.' });
}
