import { getTodayActivities } from "@/lib/actions/scheduled-activities";
import { TodayActivitiesView } from "./today-activities-view";

export default async function ActivitiesPage() {
  const activities = await getTodayActivities();

  return <TodayActivitiesView activities={activities} />;
}
