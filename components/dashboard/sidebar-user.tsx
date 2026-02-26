'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/context'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const roleBadgeVariant: Record<string, string> = {
  admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  supervisor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  operator: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  viewer: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function SidebarUser() {
  const { user } = useAuth()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="px-3">
      <Separator className="mb-3" />
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="text-xs font-medium">
            {getInitials(user.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">{user.full_name}</span>
          <Badge
            variant="secondary"
            className={`w-fit text-[10px] px-1.5 py-0 ${roleBadgeVariant[user.role] ?? ''}`}
          >
            {user.role}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          <span className="sr-only">Cerrar sesión</span>
        </Button>
      </div>
    </div>
  )
}
