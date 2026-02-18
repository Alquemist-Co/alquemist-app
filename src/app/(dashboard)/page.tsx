import { requireAuth } from "@/lib/auth/require-auth";
import { getTodayActivities } from "@/lib/actions/scheduled-activities";
import { getAlerts, getAlertCounts } from "@/lib/actions/alerts";
import { getFacilityNameById } from "@/lib/actions/areas";
import {
  getSupervisorDashboardData,
  getManagerDashboardData,
  getViewerDashboardData,
} from "@/lib/actions/dashboard";
import { OperatorDashboard } from "@/components/dashboard/operator-dashboard";
import { SupervisorDashboard } from "@/components/dashboard/supervisor-dashboard";
import { ManagerDashboard } from "@/components/dashboard/manager-dashboard";
import { ViewerDashboard } from "@/components/dashboard/viewer-dashboard";

export default async function DashboardPage() {
  const claims = await requireAuth();

  if (claims.role === "operator") {
    const [activities, alertsResult, alertCounts, facilityName] =
      await Promise.all([
        getTodayActivities(),
        getAlerts("pending"),
        getAlertCounts(),
        getFacilityNameById(claims.facilityId),
      ]);

    const firstName = claims.fullName?.split(" ")[0] || "Operador";

    return (
      <OperatorDashboard
        firstName={firstName}
        facilityName={facilityName}
        activities={activities}
        alerts={alertsResult.items.slice(0, 3)}
        alertCount={alertCounts.pending}
      />
    );
  }

  if (claims.role === "supervisor") {
    const data = await getSupervisorDashboardData();
    return <SupervisorDashboard initialData={data} />;
  }

  if (claims.role === "manager" || claims.role === "admin") {
    const data = await getManagerDashboardData();
    return <ManagerDashboard initialData={data} />;
  }

  if (claims.role === "viewer") {
    const data = await getViewerDashboardData();
    return <ViewerDashboard initialData={data} />;
  }

  // Fallback — should not happen with 5 known roles
  const data = await getViewerDashboardData();
  return <ViewerDashboard initialData={data} />;
}
