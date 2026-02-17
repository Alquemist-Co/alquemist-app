import { notFound } from "next/navigation";
import { getOrder } from "@/lib/actions/orders";
import { OrderDetailView } from "./order-detail-view";

type Props = {
  params: Promise<{ orderId: string }>;
};

export default async function OrderDetailPage({ params }: Props) {
  const { orderId } = await params;
  const order = await getOrder(orderId);

  if (!order) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col">
      <OrderDetailView order={order} />
    </div>
  );
}
