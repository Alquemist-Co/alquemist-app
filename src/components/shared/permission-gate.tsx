"use client";

import { useAuth } from "@/hooks/use-auth";

interface PermissionGateProps {
  action: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({
  action,
  children,
  fallback = null,
}: PermissionGateProps) {
  const { hasPermission } = useAuth();
  if (!hasPermission(action)) return <>{fallback}</>;
  return <>{children}</>;
}
