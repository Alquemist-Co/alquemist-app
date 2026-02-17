import { getOrderWizardData } from "@/lib/actions/orders";
import { OrderWizard } from "./order-wizard";

export default async function NewOrderPage() {
  const data = await getOrderWizardData();

  return (
    <div className="flex flex-1 flex-col">
      <OrderWizard data={data} />
    </div>
  );
}
