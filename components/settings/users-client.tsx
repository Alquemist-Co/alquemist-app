'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  inviteUserSchema,
  type InviteUserInput,
  editUserSchema,
  type EditUserInput,
} from '@/schemas/users'
import { roleBadgeStyles, roleLabels, allRoles } from '@/lib/data/roles'
import { toast } from 'sonner'
import {
  MoreHorizontal,
  Plus,
  Send,
  Pencil,
  UserX,
  UserCheck,
  Users,
  Search,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select as SelectUI,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

import {
  inviteUser,
  editUser,
  toggleUserActive,
  resendInvite,
} from '@/app/(dashboard)/settings/users/actions'
import { DataTablePagination } from '@/components/shared/data-table-pagination'
import { FilterPopover } from './filter-popover'

// ---------- Constants ----------

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring'

// ---------- Types ----------

type Permissions = {
  can_approve_orders?: boolean
  can_adjust_inventory?: boolean
  can_delete?: boolean
}

type UserRow = {
  id: string
  email: string
  full_name: string
  role: string
  is_active: boolean
  last_login_at: string | null
  assigned_facility_id: string | null
  permissions: Permissions | null
  created_at: string
}

type Props = {
  users: UserRow[]
  currentUserId: string
  currentUserRole: string
  totalPages: number
  totalCount: number
  currentPage: number
  pageSize: number
  statusCounts: { all: number; active: number; inactive: number }
  filters: { role: string; status: string; search: string }
}

// ---------- Helpers ----------

function getStatusBadge(user: UserRow) {
  if (user.last_login_at === null) {
    return (
      <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
        Pendiente
      </Badge>
    )
  }
  if (user.is_active) {
    return (
      <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
        Activo
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
      Inactivo
    </Badge>
  )
}

function formatRelativeTime(dateStr: string | null) {
  if (!dateStr) return 'Nunca'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Hace un momento'
  if (diffMins < 60) return `Hace ${diffMins} min`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `Hace ${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `Hace ${diffDays}d`
  return date.toLocaleDateString('es-CL')
}

function getAllowedRoles(currentUserRole: string) {
  if (currentUserRole === 'admin') return [...allRoles]
  // Manager can only assign supervisor, operator, viewer
  return allRoles.filter((r) => r !== 'admin' && r !== 'manager')
}

// ---------- Main Component ----------

export function UsersClient({
  users,
  currentUserId,
  currentUserRole,
  totalPages,
  totalCount,
  currentPage,
  pageSize,
  statusCounts,
  filters,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Filter state
  const [searchValue, setSearchValue] = useState(filters.search)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Dialog state
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserRow | null>(null)
  const [toggleUser, setToggleUser] = useState<UserRow | null>(null)

  // Update URL search params
  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      }
      // Reset to page 1 on filter change
      if (!('page' in updates)) {
        params.delete('page')
      }
      router.push(`/settings/users?${params.toString()}`)
    },
    [router, searchParams]
  )

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (searchValue !== filters.search) {
        updateParams({ search: searchValue })
      }
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchValue, filters.search, updateParams])

  function goToPage(page: number) {
    updateParams({ page: page > 1 ? String(page) : '' })
  }

  function changePageSize(size: number) {
    updateParams({ pageSize: String(size), page: '' })
  }

  // Resend invite handler
  async function handleResendInvite(userId: string) {
    const result = await resendInvite(userId)
    if (result.success) {
      toast.success('Invitación reenviada correctamente.')
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="space-y-4">
      {/* Status tabs */}
      <Tabs
        value={filters.status || 'all'}
        onValueChange={(v) => updateParams({ status: v === 'all' ? '' : v })}
      >
        {/* Mobile: Select dropdown */}
        <SelectUI
          value={filters.status || 'all'}
          onValueChange={(v) => updateParams({ status: v === 'all' ? '' : v })}
        >
          <SelectTrigger className="w-fit sm:hidden" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos ({statusCounts.all})</SelectItem>
            <SelectItem value="active">Activos ({statusCounts.active})</SelectItem>
            <SelectItem value="inactive">Inactivos ({statusCounts.inactive})</SelectItem>
          </SelectContent>
        </SelectUI>

        {/* Desktop: TabsList */}
        <TabsList variant="line" className="hidden sm:inline-flex">
          <TabsTrigger value="all">
            Todos
            <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 rounded-full px-1.5 text-xs">
              {statusCounts.all}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="active">
            Activos
            <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 rounded-full px-1.5 text-xs">
              {statusCounts.active}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="inactive">
            Inactivos
            <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 rounded-full px-1.5 text-xs">
              {statusCounts.inactive}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Toolbar: search + filters + invite button */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-sm:w-full">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Nombre o email..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="h-9 w-full pl-8 sm:w-[200px] lg:w-[280px]"
          />
        </div>

        <FilterPopover activeCount={filters.role ? 1 : 0}>
          <div>
            <label className="mb-1 block text-xs font-medium">Rol</label>
            <select
              value={filters.role}
              onChange={(e) => updateParams({ role: e.target.value })}
              className={selectClass}
            >
              <option value="">Todos los roles</option>
              {allRoles.map((r) => (
                <option key={r} value={r}>
                  {roleLabels[r]}
                </option>
              ))}
            </select>
          </div>
        </FilterPopover>

        <Button size="sm" className="ml-auto" onClick={() => setInviteOpen(true)}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Invitar</span>
        </Button>
      </div>

      {/* Users table */}
      <div className="overflow-hidden rounded-lg border">
        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Users className="mb-3 h-10 w-10" />
            <p className="text-sm">No se encontraron usuarios.</p>
          </div>
        ) : (
          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Último acceso</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={roleBadgeStyles[user.role] ?? ''}
                      >
                        {roleLabels[user.role] ?? user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(user)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatRelativeTime(user.last_login_at)}
                    </TableCell>
                    <TableCell>
                      {user.id !== currentUserId && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Acciones</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingUser(user)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            {user.last_login_at === null && (
                              <DropdownMenuItem onClick={() => handleResendInvite(user.id)}>
                                <Send className="mr-2 h-4 w-4" />
                                Reenviar invitación
                              </DropdownMenuItem>
                            )}
                            {currentUserRole === 'admin' && (
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setToggleUser(user)}
                              >
                                {user.is_active ? (
                                  <>
                                    <UserX className="mr-2 h-4 w-4" />
                                    Desactivar
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="mr-2 h-4 w-4" />
                                    Reactivar
                                  </>
                                )}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
        )}
      </div>

      {/* Pagination */}
      <DataTablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={goToPage}
        onPageSizeChange={changePageSize}
      />

      {/* Invite Dialog */}
      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        currentUserRole={currentUserRole}
        onSuccess={() => router.refresh()}
      />

      {/* Edit Dialog */}
      <EditDialog
        user={editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
        currentUserRole={currentUserRole}
        onSuccess={() => router.refresh()}
      />

      {/* Toggle Active AlertDialog */}
      <ToggleActiveDialog
        user={toggleUser}
        onOpenChange={(open) => !open && setToggleUser(null)}
        onSuccess={() => router.refresh()}
      />
    </div>
  )
}

// ---------- Invite Dialog ----------

function InviteDialog({
  open,
  onOpenChange,
  currentUserRole,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUserRole: string
  onSuccess: () => void
}) {
  const [isLoading, setIsLoading] = useState(false)
  const allowedRoles = getAllowedRoles(currentUserRole)

  const form = useForm<InviteUserInput>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      email: '',
      full_name: '',
      role: allowedRoles[0],
      assigned_facility_id: null,
      permissions: {
        can_approve_orders: false,
        can_adjust_inventory: false,
        can_delete: false,
      },
    },
  })

  async function onSubmit(values: InviteUserInput) {
    setIsLoading(true)
    try {
      const result = await inviteUser(values)
      if (result.success) {
        toast.success('Invitación enviada correctamente.')
        form.reset()
        onOpenChange(false)
        onSuccess()
      } else {
        if (result.field) {
          form.setError(result.field as keyof InviteUserInput, { message: result.error })
        } else {
          toast.error(result.error)
        }
      }
    } catch {
      toast.error('Error inesperado. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!isLoading) { onOpenChange(o); if (!o) form.reset() } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invitar usuario</DialogTitle>
          <DialogDescription>
            Envía una invitación por email para unirse a tu empresa.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="usuario@ejemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Juan Pérez" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol</FormLabel>
                  <FormControl>
                    <select
                      value={field.value}
                      onChange={field.onChange}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {allowedRoles.map((r) => (
                        <option key={r} value={r}>
                          {roleLabels[r]}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <label className="text-sm font-medium">Permisos</label>
              <FormField
                control={form.control}
                name="permissions.can_approve_orders"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">Aprobar órdenes</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="permissions.can_adjust_inventory"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">Ajustar inventario</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="permissions.can_delete"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">Eliminar registros</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Enviando...' : 'Enviar invitación'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Edit Dialog ----------

function EditDialog({
  user,
  onOpenChange,
  currentUserRole,
  onSuccess,
}: {
  user: UserRow | null
  onOpenChange: (open: boolean) => void
  currentUserRole: string
  onSuccess: () => void
}) {
  const [isLoading, setIsLoading] = useState(false)
  const allowedRoles = getAllowedRoles(currentUserRole)

  const permissions = user?.permissions ?? {
    can_approve_orders: false,
    can_adjust_inventory: false,
    can_delete: false,
  }

  const form = useForm<EditUserInput>({
    resolver: zodResolver(editUserSchema),
    values: {
      full_name: user?.full_name ?? '',
      role: (user?.role as EditUserInput['role']) ?? allowedRoles[0],
      assigned_facility_id: user?.assigned_facility_id ?? null,
      permissions: {
        can_approve_orders: permissions.can_approve_orders ?? false,
        can_adjust_inventory: permissions.can_adjust_inventory ?? false,
        can_delete: permissions.can_delete ?? false,
      },
    },
  })

  async function onSubmit(values: EditUserInput) {
    if (!user) return
    setIsLoading(true)
    try {
      const result = await editUser(user.id, values)
      if (result.success) {
        toast.success('Usuario actualizado correctamente.')
        onOpenChange(false)
        onSuccess()
      } else {
        if (result.field) {
          form.setError(result.field as keyof EditUserInput, { message: result.error })
        } else {
          toast.error(result.error)
        }
      }
    } catch {
      toast.error('Error inesperado. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={!!user} onOpenChange={(o) => { if (!isLoading) onOpenChange(o) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar usuario</DialogTitle>
          <DialogDescription>
            Modifica el rol, permisos o información del usuario.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Email read-only */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input value={user?.email ?? ''} disabled />
            </div>

            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Juan Pérez" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol</FormLabel>
                  <FormControl>
                    <select
                      value={field.value}
                      onChange={field.onChange}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {allowedRoles.map((r) => (
                        <option key={r} value={r}>
                          {roleLabels[r]}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <label className="text-sm font-medium">Permisos</label>
              <FormField
                control={form.control}
                name="permissions.can_approve_orders"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">Aprobar órdenes</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="permissions.can_adjust_inventory"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">Ajustar inventario</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="permissions.can_delete"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">Eliminar registros</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Toggle Active AlertDialog ----------

function ToggleActiveDialog({
  user,
  onOpenChange,
  onSuccess,
}: {
  user: UserRow | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [isLoading, setIsLoading] = useState(false)
  const willActivate = user ? !user.is_active : false

  async function handleConfirm() {
    if (!user) return
    setIsLoading(true)
    try {
      const result = await toggleUserActive(user.id, willActivate)
      if (result.success) {
        toast.success(
          willActivate
            ? 'Usuario reactivado correctamente.'
            : 'Usuario desactivado correctamente.'
        )
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error('Error inesperado. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AlertDialog open={!!user} onOpenChange={(o) => { if (!isLoading) onOpenChange(o) }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {willActivate ? 'Reactivar usuario' : 'Desactivar usuario'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {willActivate
              ? `¿Estás seguro de que deseas reactivar a ${user?.full_name}? Podrá volver a acceder al sistema.`
              : `¿Estás seguro de que deseas desactivar a ${user?.full_name}? No podrá acceder al sistema hasta que sea reactivado.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isLoading}>
            {isLoading
              ? 'Procesando...'
              : willActivate
                ? 'Reactivar'
                : 'Desactivar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
