import { getScheduleWizardData } from "@/lib/actions/cultivation-schedules";
import { ScheduleWizard } from "./schedule-wizard";

export default async function NewSchedulePage() {
  const wizardData = await getScheduleWizardData();
  return <ScheduleWizard wizardData={wizardData} />;
}
