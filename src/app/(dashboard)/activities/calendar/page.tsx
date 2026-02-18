import { getCalendarActivities } from "@/lib/actions/scheduled-activities";
import { CalendarView } from "./calendar-view";

function getWeekBounds() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toISOString().split("T")[0],
    end: sunday.toISOString().split("T")[0],
  };
}

export default async function CalendarPage() {
  const { start, end } = getWeekBounds();
  const activities = await getCalendarActivities(start, end);
  return <CalendarView initialActivities={activities} initialStart={start} />;
}
