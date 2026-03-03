import { createClient } from '@supabase/supabase-js'

// Well-known local Supabase keys (deterministic, same for every `supabase start`)
const SUPABASE_URL = 'http://127.0.0.1:15432'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const SUPABASE_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`

const TEST_USER = {
  email: 'admin@test.com',
  password: 'password123',
}

/** Sign in as the test user and return the access_token (JWT). */
export async function getTestJwt(): Promise<string> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data, error } = await supabase.auth.signInWithPassword(TEST_USER)
  if (error) throw new Error(`Auth failed: ${error.message}`)
  return data.session.access_token
}

/**
 * Call an Edge Function via HTTP POST.
 * - `token: null` — omit both apikey and Authorization (tests "Missing authorization")
 * - `token: 'invalid'` — send invalid Bearer token (tests "Unauthorized")
 * - `token: '<jwt>'` — send valid user JWT
 */
export async function callFunction(
  name: string,
  opts: {
    body?: Record<string, unknown>
    token?: string | null
  } = {},
): Promise<{ status: number; data: unknown }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (opts.token === null) {
    // No apikey, no auth — tests the "Missing authorization" path
  } else {
    headers['apikey'] = SUPABASE_ANON_KEY
    if (opts.token !== undefined) {
      headers['Authorization'] = `Bearer ${opts.token}`
    }
  }
  const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(opts.body ?? {}),
  })
  const data = await res.json()
  return { status: res.status, data }
}

/** Supabase client with service_role key — bypasses RLS for DB assertions. */
export function createServiceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
}
