import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EnvironmentalClient } from '@/components/operations/environmental-client'

type SearchParams = Promise<{
  facility?: string
  zone?: string
  period?: string
}>

export default async function EnvironmentalPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) redirect('/login')

  const { data: currentUser } = await supabase
    .from('users')
    .select('id, role, company_id')
    .eq('id', authUser.id)
    .single()

  if (!currentUser) redirect('/login')

  // Fetch facilities with their zones
  const { data: facilities } = await supabase
    .from('facilities')
    .select('id, name')
    .eq('company_id', currentUser.company_id!)
    .order('name')

  const { data: zones } = await supabase
    .from('zones')
    .select('id, name, facility_id')
    .eq('status', 'active')
    .order('name')

  const facilitiesData = (facilities ?? []).map((f) => ({
    id: f.id,
    name: f.name,
  }))

  const zonesData = (zones ?? []).map((z) => ({
    id: z.id,
    name: z.name,
    facility_id: z.facility_id,
  }))

  // Determine initial facility and zone from URL or defaults
  const initialFacilityId = params.facility || facilitiesData[0]?.id || ''
  const initialZoneId =
    params.zone ||
    zonesData.find((z) => z.facility_id === initialFacilityId)?.id ||
    ''
  const initialPeriod = params.period || '24h'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Monitor Ambiental
        </h2>
        <p className="text-sm text-muted-foreground">
          Condiciones en tiempo real y tendencias históricas por zona.
        </p>
      </div>

      <EnvironmentalClient
        facilities={facilitiesData}
        zones={zonesData}
        initialFacilityId={initialFacilityId}
        initialZoneId={initialZoneId}
        initialPeriod={initialPeriod}
      />
    </div>
  )
}
