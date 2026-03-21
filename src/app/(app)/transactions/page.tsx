import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowDownCircle, ArrowUpCircle, SlidersHorizontal } from "lucide-react";

export default async function TransactionsPage() {
  const transactions = await prisma.transaction.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      item: { include: { unitOfMeasure: true } },
      createdBy: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transactions</h1>
        <p className="text-muted-foreground text-sm">
          All inventory movements — {transactions.length} shown
        </p>
      </div>

      {transactions.length === 0 ? (
        <p className="text-muted-foreground text-sm">No transactions yet.</p>
      ) : (
        <div className="space-y-2">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card text-sm"
            >
              <div className="flex items-center gap-3">
                {tx.type === "IN" && (
                  <ArrowDownCircle className="h-4 w-4 text-green-600 shrink-0" />
                )}
                {tx.type === "OUT" && (
                  <ArrowUpCircle className="h-4 w-4 text-orange-500 shrink-0" />
                )}
                {tx.type === "ADJUSTMENT" && (
                  <SlidersHorizontal className="h-4 w-4 text-blue-500 shrink-0" />
                )}
                <div>
                  <Link
                    href={`/inventory/${tx.itemId}`}
                    className="font-medium hover:underline"
                  >
                    {tx.item.name}
                  </Link>
                  {tx.notes && (
                    <p className="text-xs text-muted-foreground">{tx.notes}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Badge
                  variant={
                    tx.type === "IN"
                      ? "default"
                      : tx.type === "OUT"
                      ? "secondary"
                      : "outline"
                  }
                  className="text-xs"
                >
                  {tx.type === "IN" ? "+" : tx.type === "OUT" ? "-" : "→"}
                  {Number(tx.quantity).toLocaleString()}{" "}
                  {tx.item.unitOfMeasure.abbreviation}
                </Badge>
                <span className="text-xs text-muted-foreground hidden sm:block">
                  {new Date(tx.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
