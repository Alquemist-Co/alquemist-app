export const roleBadgeStyles: Record<string, string> = {
  admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  supervisor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  operator: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  viewer: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
}

export const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  manager: 'Manager',
  supervisor: 'Supervisor',
  operator: 'Operador',
  viewer: 'Visualizador',
}

export const allRoles = ['admin', 'manager', 'supervisor', 'operator', 'viewer'] as const
