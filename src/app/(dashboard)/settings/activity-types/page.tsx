import { getActivityTypes } from "@/lib/actions/activity-types";
import { ActivityTypeList } from "./activity-type-list";

export default async function ActivityTypesPage() {
  const types = await getActivityTypes();
  return <ActivityTypeList initialData={types} />;
}
