export function getRoleRedirect(role: string): string {
  switch (role) {
    case 'supervisor':
      return '/activities/schedule'
    case 'operator':
      return '/field/today'
    default:
      return '/'
  }
}
