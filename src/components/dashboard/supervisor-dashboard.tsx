"use client";

import { useState, useCallback, useTransition } from "react";
import { SupervisorHeader } from "./supervisor-header";
import { SupervisorStats, type SupervisorFilter } from "./supervisor-stats";
import { ZoneGrid } from "./zone-grid";
import { TeamPanel } from "./team-panel";
import { ActivitySummary } from "./activity-summary";
import { QuickActionsBar } from "./quick-actions-bar";
import { PullToRefresh } from "./pull-to-refresh";
import {
  getSupervisorDashboardData,
  type SupervisorDashboardData,
} from "@/lib/actions/dashboard";

type SupervisorDashboardProps = {
  initialData: SupervisorDashboardData;
};

export function SupervisorDashboard({
  initialData,
}: SupervisorDashboardProps) {
  const [data, setData] = useState(initialData);
  const [selectedFacilityId, setSelectedFacilityId] = useState<
    string | undefined
  >(undefined);
  const [activeFilter, setActiveFilter] = useState<SupervisorFilter>("all");
  const [isPending, startTransition] = useTransition();

  const handleFacilityChange = useCallback(
    (facilityId: string | undefined) => {
      setSelectedFacilityId(facilityId);
      setActiveFilter("all");
      startTransition(async () => {
        const newData = await getSupervisorDashboardData(facilityId);
        setData(newData);
      });
    },
    [],
  );

  const handleRefresh = useCallback(async () => {
    const newData = await getSupervisorDashboardData(selectedFacilityId);
    setData(newData);
  }, [selectedFacilityId]);

  const completedCount = data.activities.filter(
    (a) => a.status === "completed",
  ).length;
  const overdueCount = data.activities.filter(
    (a) => a.status === "overdue",
  ).length;

  return (
    <div className={`relative p-4 lg:p-6 ${isPending ? "opacity-70" : ""}`}>
      <PullToRefresh onRefresh={handleRefresh}>
        <SupervisorHeader
          zoneCount={data.zones.length}
          batchCount={data.activeBatchCount}
          facilities={data.facilities}
          selectedFacilityId={selectedFacilityId}
          onFacilityChange={handleFacilityChange}
        />

        <SupervisorStats
          activeBatches={data.activeBatchCount}
          todayTotal={data.activities.length}
          completed={completedCount}
          overdue={overdueCount}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />

        <ZoneGrid
          zones={data.zones}
          conditions={data.conditions}
          alertCounts={data.alertCountsByZone}
        />

        <TeamPanel operators={data.operators} />

        <ActivitySummary
          activities={data.activities}
          filter={activeFilter}
        />

        <QuickActionsBar />
      </PullToRefresh>
    </div>
  );
}
