import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, ArrowDownCircle, ArrowUpCircle, SlidersHorizontal } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const [itemCount, recentTransactions] = await Promise.all([
    prisma.item.count(),
    prisma.transaction.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { item: { include: { unitOfMeasure: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Your inventory at a glance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Total Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{itemCount}</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Recent Activity</h2>
        {recentTransactions.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No transactions yet.{" "}
            <Link href="/inventory/new" className="underline">
              Add your first item
            </Link>
            .
          </p>
        ) : (
          <div className="space-y-2">
            {recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
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
                      className="font-medium text-sm hover:underline"
                    >
                      {tx.item.name}
                    </Link>
                    {tx.notes && (
                      <p className="text-xs text-muted-foreground">{tx.notes}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={tx.type === "IN" ? "default" : tx.type === "OUT" ? "secondary" : "outline"}>
                    {tx.type === "IN" ? "+" : tx.type === "OUT" ? "-" : "±"}
                    {Number(tx.quantity).toLocaleString()} {tx.item.unitOfMeasure.abbreviation}
                  </Badge>
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
