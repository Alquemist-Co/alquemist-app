"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth-store";
import {
  getUserFacilities,
  switchFacility,
  type FacilityOption,
} from "@/lib/actions/facility-switch";
import { toast } from "@/lib/utils/toast-store";

export function FacilitySelector() {
  const router = useRouter();
  const facilityId = useAuthStore((s) => s.facilityId);
  const setAuth = useAuthStore((s) => s.setAuth);
  const storeState = useAuthStore();
  const [facilities, setFacilities] = useState<FacilityOption[] | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    getUserFacilities().then(setFacilities);
  }, []);

  // Don't render if still loading or only 1 facility
  if (!facilities || facilities.length <= 1) return null;

  const currentName =
    facilities.find((f) => f.id === facilityId)?.name ?? "Todas";

  async function handleChange(newId: string) {
    const newFacilityId = newId || null;
    const result = await switchFacility({ facilityId: newFacilityId });
    if (!result.success) {
      toast.error(result.error);
      return;
    }

    // Update store
    if (storeState.userId && storeState.email && storeState.role && storeState.companyId) {
      setAuth({
        userId: storeState.userId,
        email: storeState.email,
        fullName: storeState.fullName ?? "",
        role: storeState.role,
        companyId: storeState.companyId,
        facilityId: newFacilityId,
      });
    }

    router.refresh();
  }

  return (
    <div className="flex items-center gap-1.5">
      <Building2 className="size-4 text-text-secondary" strokeWidth={1.5} />
      <select
        value={facilityId ?? ""}
        onChange={(e) => handleChange(e.target.value)}
        className={cn(
          "h-7 rounded border-none bg-transparent px-1 text-xs font-medium text-text-primary",
          "focus:outline-none focus:ring-1 focus:ring-brand cursor-pointer",
        )}
      >
        <option value="">Todas las facilities</option>
        {facilities.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>
    </div>
  );
}
