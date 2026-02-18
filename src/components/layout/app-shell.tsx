"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/hooks/use-auth";
import { useSidebarStore } from "@/stores/sidebar-store";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { BottomBar } from "./bottom-bar";
import { MoreMenu } from "./more-menu";
import { OfflineBanner } from "@/components/shared/offline-banner";
import { RealtimeProvider } from "@/components/shared/realtime-provider";
import { SearchModal } from "@/components/shared/search-modal";

export function AppShell({ children }: { children: ReactNode }) {
  const { isHydrated } = useAuth();
  const isExpanded = useSidebarStore((s) => s.isExpanded);
  const [moreOpen, setMoreOpen] = useState(false);

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 rounded-badge bg-brand animate-pulse" />
          <div className="h-3 w-24 rounded bg-border animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <RealtimeProvider>
      <div className="min-h-screen bg-surface">
        <Sidebar />

        <div
          className={cn(
            "flex flex-col min-h-screen transition-all duration-250",
            "lg:ml-(--width-sidebar-collapsed)",
            isExpanded && "lg:ml-(--width-sidebar-expanded)"
          )}
        >
          <TopBar />
          <OfflineBanner />

          <main className="flex-1 pb-(--height-bottombar) lg:pb-0">
            {children}
          </main>
        </div>

        <BottomBar onMorePress={() => setMoreOpen(true)} />
        <MoreMenu open={moreOpen} onClose={() => setMoreOpen(false)} />
        <SearchModal />
      </div>
    </RealtimeProvider>
  );
}
