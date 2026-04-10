import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type Props = {
  params: Promise<{ id: string }>
}

export default async function ZoneDetailRedirectPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: zone } = await supabase
    .from('zones')
    .select('facility_id')
    .eq('id', id)
    .single()

  if (!zone) {
    notFound()
  }

  redirect(`/areas/facilities/${zone.facility_id}/zones/${id}`)
}
