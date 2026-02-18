import {
  getScheduleDetail,
  getScheduleWizardData,
} from "@/lib/actions/cultivation-schedules";
import { notFound } from "next/navigation";
import { ScheduleEditor } from "./schedule-editor";

type Props = { params: Promise<{ scheduleId: string }> };

export default async function ScheduleDetailPage({ params }: Props) {
  const { scheduleId } = await params;
  const [schedule, wizardData] = await Promise.all([
    getScheduleDetail(scheduleId),
    getScheduleWizardData(),
  ]);

  if (!schedule) notFound();

  return <ScheduleEditor schedule={schedule} wizardData={wizardData} />;
}
