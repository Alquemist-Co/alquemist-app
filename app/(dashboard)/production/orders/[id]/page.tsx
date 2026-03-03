import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type Params = Promise<{ id: string }>

export default async function OrderDetailPage({
  params,
}: {
  params: Params
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) redirect('/login')

  const { data: order } = await supabase
    .from('production_orders')
    .select('id, code, status')
    .eq('id', id)
    .single()

  if (!order) redirect('/production/orders')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Orden {order.code}
        </h2>
        <p className="text-sm text-muted-foreground">
          Detalle de la orden de producción. Próximamente en PRD 23.
        </p>
      </div>

      <div className="rounded-md border p-8 text-center text-muted-foreground">
        <p>La vista de detalle se implementará en PRD 23.</p>
      </div>
    </div>
  )
}
