import { getFacilities } from "@/lib/actions/facilities";
import { FacilityList } from "./facility-list";

export default async function FacilitiesPage() {
  const facilities = await getFacilities();
  return <FacilityList initialData={facilities} />;
}
