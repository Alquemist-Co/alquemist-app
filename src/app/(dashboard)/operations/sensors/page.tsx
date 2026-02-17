import { getSensors, getSensorFormData } from "@/lib/actions/sensors";
import { SensorList } from "./sensor-list";

export default async function SensorsPage() {
  const [sensors, formData] = await Promise.all([
    getSensors(),
    getSensorFormData(),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-6 lg:py-8">
      <SensorList initialData={sensors} formData={formData} />
    </div>
  );
}
