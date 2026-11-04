import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json' };
const reply = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers });
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return reply(405, { error: 'Method not allowed' });
  const token = req.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return reply(401, { error: 'Sign in first' });
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (error || !user || user.is_anonymous) return reply(401, { error: 'Sign in again' });
    const body = await req.json();
    if (body.confirm !== 'DELETE MY ACCOUNT') return reply(400, { error: 'Explicit confirmation required' });
    // The caller cannot choose an account ID. Revoke refresh sessions before removal.
    const { error: signOutError } = await admin.auth.admin.signOut(token, 'global');
    if (signOutError) return reply(503, { error: 'Could not revoke sessions. Please retry.' });
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) return reply(503, { error: 'Account deletion did not complete. Sign in again and retry.' });
    // ON DELETE CASCADE removes the backup. Old tokens cannot recreate rows due to the FK.
    return reply(200, { deleted: true });
  } catch { return reply(400, { error: 'Could not process account deletion' }); }
});
