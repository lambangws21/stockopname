// app/hybrideUi/page.tsx
import KpiCards from "@/components/dashboard/KpiCard";
import StockTablePremium from "@/components/TableDesktop";

export default function Page() {
  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">📊 Stock Management</h1>

      <KpiCards sheet="Sheet1" />

      <StockTablePremium sheet="Sheet1" />

    </main>
  );
}
 