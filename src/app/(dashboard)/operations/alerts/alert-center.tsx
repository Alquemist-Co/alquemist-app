"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils/cn";
import {
  getAlerts,
  type AlertItem,
  type AlertCounts,
} from "@/lib/actions/alerts";
import { AlertCard } from "./alert-card";

type Props = {
  initialItems: AlertItem[];
  initialCounts: AlertCounts;
};

type Tab = "pending" | "acknowledged" | "resolved";

const TABS: { key: Tab; label: string }[] = [
  { key: "pending", label: "Pendientes" },
  { key: "acknowledged", label: "Reconocidas" },
  { key: "resolved", label: "Resueltas" },
];

export function AlertCenter({ initialItems, initialCounts }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("pending");
  const [items, setItems] = useState(initialItems);
  const [counts, setCounts] = useState(initialCounts);
  const [loading, setLoading] = useState(false);

  const switchTab = useCallback(
    async (tab: Tab) => {
      if (tab === activeTab) return;
      setActiveTab(tab);
      setLoading(true);

      const { items: newItems } = await getAlerts(tab);
      setItems(newItems);
      setLoading(false);
    },
    [activeTab],
  );

  const handleAction = useCallback(() => {
    router.refresh();
  }, [router]);

  const currentCount = (tab: Tab): number => {
    return counts[tab] ?? 0;
  };

  return (
    <>
      <h1 className="mb-4 font-sans text-xl font-bold text-text-primary">
        Centro de Alertas
      </h1>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-lg bg-surface p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => switchTab(tab.key)}
            className={cn(
              "flex-1 rounded-md px-3 py-2 text-sm font-bold transition-colors cursor-pointer",
              activeTab === tab.key
                ? "bg-surface-card text-text-primary shadow-sm"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            {tab.label}
            {currentCount(tab.key) > 0 && (
              <span
                className={cn(
                  "ml-1.5 inline-flex size-5 items-center justify-center rounded-full text-[10px] font-bold",
                  activeTab === tab.key
                    ? "bg-brand text-white"
                    : "bg-border text-text-secondary",
                )}
              >
                {currentCount(tab.key)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="size-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={
            activeTab === "pending"
              ? "Sin alertas pendientes"
              : activeTab === "acknowledged"
                ? "Sin alertas reconocidas"
                : "Sin alertas resueltas"
          }
          description="No hay alertas en esta categoria."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <AlertCard
              key={item.id}
              alert={item}
              tab={activeTab}
              onAction={handleAction}
            />
          ))}
        </div>
      )}
    </>
  );
}
