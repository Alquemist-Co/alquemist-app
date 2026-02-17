import { getAlerts, getAlertCounts } from "@/lib/actions/alerts";
import { AlertCenter } from "./alert-center";

export default async function AlertsPage() {
  const [{ items }, counts] = await Promise.all([
    getAlerts("pending"),
    getAlertCounts(),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-6 lg:py-8">
      <AlertCenter initialItems={items} initialCounts={counts} />
    </div>
  );
}
