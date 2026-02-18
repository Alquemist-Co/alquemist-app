import {
  getStockByProduct,
  getStockByZone,
  getLowStockAlerts,
  getLotOptions,
  getZoneOptions,
} from "@/lib/actions/inventory";
import { StockView } from "./stock-view";
import { StockActions } from "./stock-actions";

export default async function InventoryPage() {
  const [stockByProduct, stockByZone, alerts, lots, zones] = await Promise.all([
    getStockByProduct(),
    getStockByZone(),
    getLowStockAlerts(),
    getLotOptions(),
    getZoneOptions(),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-6 lg:py-8">
      <div className="mb-4">
        <StockActions lots={lots} zones={zones} />
      </div>
      <StockView
        stockByProduct={stockByProduct}
        stockByZone={stockByZone}
        alerts={alerts}
      />
    </div>
  );
}
