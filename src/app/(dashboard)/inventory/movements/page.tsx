import { getTransactions } from "@/lib/actions/inventory";
import { TransactionList } from "./transaction-list";

export default async function MovementsPage() {
  const { items, nextCursor } = await getTransactions();

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-6 lg:py-8">
      <TransactionList initialItems={items} initialCursor={nextCursor} />
    </div>
  );
}
