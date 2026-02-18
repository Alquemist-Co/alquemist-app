import { getUnitsOfMeasure } from "@/lib/actions/units";
import { UnitList } from "./unit-list";

export default async function UnitsPage() {
  const units = await getUnitsOfMeasure();
  return <UnitList initialData={units} />;
}
