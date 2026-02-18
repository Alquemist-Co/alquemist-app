import { getSuppliers } from "@/lib/actions/suppliers";
import { SupplierList } from "./supplier-list";

export default async function SuppliersPage() {
  const suppliers = await getSuppliers();
  return <SupplierList initialData={suppliers} />;
}
