"use client";

import { useState } from "react";
import { useLogout } from "@/hooks/use-logout";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const { logout } = useLogout();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await logout();
  }

  return (
    <Button
      variant="ghost"
      onClick={handleLogout}
      loading={loading}
      icon={LogOut}
    >
      Cerrar sesion
    </Button>
  );
}
