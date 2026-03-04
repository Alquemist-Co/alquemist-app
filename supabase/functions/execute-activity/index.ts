import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user }, error: authError } = await anonClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Validate input
    const body = await req.json()
    const {
      scheduled_activity_id,
      activity_type_id,
      zone_id,
      batch_id,
      phase_id,
      performed_by,
      duration_minutes,
      measurement_data,
      notes,
      checklist_results,
      activity_resources,
      activity_observations,
    } = body

    if (!scheduled_activity_id || !activity_type_id || !zone_id || !batch_id || !performed_by || !duration_minutes) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: scheduled_activity_id, activity_type_id, zone_id, batch_id, performed_by, duration_minutes' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 3. Call stored function
    const { data, error } = await supabase.rpc('fn_execute_activity', {
      p_scheduled_activity_id: scheduled_activity_id,
      p_activity_type_id: activity_type_id,
      p_zone_id: zone_id,
      p_batch_id: batch_id,
      p_phase_id: phase_id || null,
      p_performed_by: performed_by,
      p_duration_minutes: duration_minutes,
      p_measurement_data: measurement_data ? JSON.stringify(measurement_data) : null,
      p_notes: notes || null,
      p_checklist_results: checklist_results ? JSON.stringify(checklist_results) : null,
      p_resources: JSON.stringify(activity_resources || []),
      p_observations: JSON.stringify(activity_observations || []),
    })

    if (error) {
      const status = error.message.includes('already') || error.message.includes('ya fue')
        ? 409
        : 400
      return new Response(JSON.stringify({ error: error.message }), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. Return result
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
