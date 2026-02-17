import { requireAuth } from "@/lib/auth/require-auth";
import { getTodayActivities } from "@/lib/actions/scheduled-activities";
import { getAlerts, getAlertCounts } from "@/lib/actions/alerts";
import { getFacilityNameById } from "@/lib/actions/areas";
import { OperatorDashboard } from "@/components/dashboard/operator-dashboard";
import { DashboardPlaceholder } from "@/components/dashboard/dashboard-placeholder";

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

  return <DashboardPlaceholder fullName={claims.fullName} role={claims.role} />;
}
