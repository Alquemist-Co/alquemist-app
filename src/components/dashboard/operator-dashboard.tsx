"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DashboardHeader } from "./dashboard-header";
import { DashboardStats } from "./dashboard-stats";
import { DashboardActivities } from "./dashboard-activities";
import { DashboardAlerts } from "./dashboard-alerts";
import { PullToRefresh } from "./pull-to-refresh";
import { QuickActionsFab } from "./quick-actions-fab";
import type { TodayActivityItem } from "@/lib/actions/scheduled-activities";
import type { AlertItem } from "@/lib/actions/alerts";

export type DashboardFilter = "all" | "pending" | "completed" | "alerts";

type OperatorDashboardProps = {
  firstName: string;
  facilityName: string | null;
  activities: TodayActivityItem[];
  alerts: AlertItem[];
  alertCount: number;
};

export function OperatorDashboard({
  firstName,
  facilityName,
  activities,
  alerts,
  alertCount,
}: OperatorDashboardProps) {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<DashboardFilter>("all");

  const pendingCount = activities.filter(
    (a) => a.status === "pending" || a.status === "overdue",
  ).length;
  const completedCount = activities.filter(
    (a) => a.status === "completed",
  ).length;

  const handleRefresh = useCallback(async () => {
    router.refresh();
  }, [router]);

  return (
    <div className="relative p-4 lg:p-6">
      <PullToRefresh onRefresh={handleRefresh}>
        <DashboardHeader firstName={firstName} facilityName={facilityName} />

        <DashboardStats
          pending={pendingCount}
          completed={completedCount}
          alerts={alertCount}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />

        <DashboardAlerts alerts={alerts} totalCount={alertCount} />

        <DashboardActivities
          activities={activities}
          filter={activeFilter}
        />
      </PullToRefresh>

      <QuickActionsFab />
    </div>
  );
}
