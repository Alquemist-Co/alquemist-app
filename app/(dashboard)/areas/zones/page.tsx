import { redirect } from 'next/navigation'

type SearchParams = Promise<{
  facility?: string
}>

export default async function ZonesRedirectPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams

  if (params.facility) {
    redirect(`/areas/facilities/${params.facility}?tab=zones`)
  }

  redirect('/areas/facilities')
}
