import { Sprout } from 'lucide-react'

import { SidebarNav } from './sidebar-nav'
import { SidebarUser } from './sidebar-user'

export function Sidebar() {
  return (
    <aside className="hidden w-64 flex-col border-r md:flex">
      <div className="flex h-14 items-center gap-2 px-6 font-semibold">
        <Sprout className="h-5 w-5 text-primary" />
        <span>Alquemist</span>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <SidebarNav />
      </div>
      <div className="pb-4">
        <SidebarUser />
      </div>
    </aside>
  )
}
