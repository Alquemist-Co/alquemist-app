import { getOrders } from "@/lib/actions/orders";
import { OrderList } from "./order-list";

export default async function OrdersPage() {
  const orders = await getOrders();

  return (
    <div className="flex flex-1 flex-col">
      <OrderList orders={orders} />
    </div>
  );
}
