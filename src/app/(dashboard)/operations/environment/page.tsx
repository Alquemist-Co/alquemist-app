import { getAllZoneConditions } from "@/lib/actions/environmental";
import { EnvDashboard } from "./env-dashboard";

export default async function EnvironmentPage() {
  const zones = await getAllZoneConditions();

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-6 lg:py-8">
      <EnvDashboard initialData={zones} />
    </div>
  );
}
