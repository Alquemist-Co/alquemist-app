import { getStockByProduct, getStockByZone, getLowStockAlerts } from "@/lib/actions/inventory";
import { StockView } from "./stock-view";

export default async function InventoryPage() {
  const [stockByProduct, stockByZone, alerts] = await Promise.all([
    getStockByProduct(),
    getStockByZone(),
    getLowStockAlerts(),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-6 lg:py-8">
      <StockView
        stockByProduct={stockByProduct}
        stockByZone={stockByZone}
        alerts={alerts}
      />
    </div>
  );
}
