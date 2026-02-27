'use client'

import type { ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type Props = {
  templatesTab: ReactNode
  schedulesTab: ReactNode
}

export function ActivityTemplatesTabs({ templatesTab, schedulesTab }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const currentTab = searchParams.get('tab') || 'templates'

  function setTab(tab: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.push(`?${params.toString()}`, { scroll: false })
  }

  return (
    <Tabs value={currentTab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="templates">Templates</TabsTrigger>
        <TabsTrigger value="schedules">Planes de Cultivo</TabsTrigger>
      </TabsList>

      <TabsContent value="templates" className="mt-4">
        {templatesTab}
      </TabsContent>

      <TabsContent value="schedules" className="mt-4">
        {schedulesTab}
      </TabsContent>
    </Tabs>
  )
}
