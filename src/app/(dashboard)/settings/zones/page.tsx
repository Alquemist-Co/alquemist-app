import { getZonesCrud } from "@/lib/actions/zones-crud";
import { getFacilities } from "@/lib/actions/facilities";
import { ZoneList } from "./zone-list";

export default async function ZonesPage() {
  const [zones, facilities] = await Promise.all([
    getZonesCrud(),
    getFacilities(),
  ]);
  return (
    <ZoneList
      initialData={zones}
      facilities={facilities.filter((f) => f.isActive)}
    />
  );
}
