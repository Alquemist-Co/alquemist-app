import { getCultivationSchedules } from "@/lib/actions/cultivation-schedules";
import { ScheduleList } from "./schedule-list";

export default async function SchedulesPage() {
  const schedules = await getCultivationSchedules();
  return <ScheduleList initialData={schedules} />;
}
