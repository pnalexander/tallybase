import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ScanTransactionForm from "./ScanTransactionForm";

interface Params {
  params: Promise<{ id: string }>;
}

export default async function ScanPage({ params }: Params) {
  const { id } = await params;

  const item = await prisma.item.findUnique({
    where: { id },
    include: { category: true, unitOfMeasure: true },
  });

  if (!item) notFound();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col justify-between p-6 max-w-sm mx-auto w-full">
        <div className="text-center pt-8 pb-6">
          <p className="text-sm text-muted-foreground uppercase tracking-wide mb-1">
            {item.category.name}
          </p>
          <h1 className="text-2xl font-bold mb-4">{item.name}</h1>
          <div className="text-5xl font-bold tabular-nums">
            {Number(item.quantity).toLocaleString()}
          </div>
          <p className="text-lg text-muted-foreground mt-1">
            {item.unitOfMeasure.name}
          </p>
          {item.lowStockThreshold &&
            Number(item.quantity) <= Number(item.lowStockThreshold) && (
              <p className="text-sm text-orange-500 mt-2 font-medium">Low stock</p>
            )}
        </div>

        <ScanTransactionForm
          itemId={item.id}
          unitAbbr={item.unitOfMeasure.abbreviation}
        />
      </div>
    </div>
  );
}
