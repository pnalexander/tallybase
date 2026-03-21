import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownCircle, ArrowUpCircle, SlidersHorizontal } from "lucide-react";
import QRSection from "./QRSection";
import TransactionButtons from "./TransactionButtons";
import EditItemDrawer from "./EditItemDrawer";

interface Params {
  params: Promise<{ id: string }>;
}

export default async function ItemDetailPage({ params }: Params) {
  const { id } = await params;

  const [item, categories, units] = await Promise.all([
    prisma.item.findUnique({
      where: { id },
      include: {
        category: true,
        unitOfMeasure: true,
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { createdBy: true },
        },
      },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.unitOfMeasure.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!item) notFound();

  const attrs = item.attributes as Record<string, unknown> | null;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{item.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge
              variant="secondary"
              style={
                item.category.color
                  ? {
                      backgroundColor: item.category.color + "20",
                      color: item.category.color,
                    }
                  : undefined
              }
            >
              {item.category.name}
            </Badge>
            {item.sku && (
              <span className="text-xs text-muted-foreground">SKU: {item.sku}</span>
            )}
          </div>
        </div>
        <div className="flex items-start gap-3 shrink-0">
          <div className="text-right">
            <p className="text-3xl font-bold">
              {Number(item.quantity).toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">{item.unitOfMeasure.name}</p>
            {item.lowStockThreshold &&
              Number(item.quantity) <= Number(item.lowStockThreshold) && (
                <p className="text-xs text-orange-500">Low stock</p>
              )}
          </div>
          <EditItemDrawer item={item} categories={categories} units={units} />
        </div>
      </div>

      <TransactionButtons itemId={item.id} unitAbbr={item.unitOfMeasure.abbreviation} />

      {attrs && Object.keys(attrs).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Attributes</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {Object.entries(attrs).map(([key, val]) => (
                <div key={key}>
                  <dt className="text-muted-foreground capitalize">
                    {key.replace(/_/g, " ")}
                  </dt>
                  <dd className="font-medium">
                    {key.includes("quarters")
                      ? `${val}/4`
                      : typeof val === "boolean"
                      ? val
                        ? "Yes"
                        : "No"
                      : String(val)}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      )}

      {item.notes && (
        <p className="text-sm text-muted-foreground">{item.notes}</p>
      )}

      <QRSection itemId={item.id} itemName={item.name} />

      <div>
        <h2 className="text-lg font-semibold mb-3">Transaction History</h2>
        {item.transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions yet.</p>
        ) : (
          <div className="space-y-2">
            {item.transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card text-sm"
              >
                <div className="flex items-center gap-2">
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
                    <Badge variant="outline" className="text-xs">
                      {tx.type}
                    </Badge>
                    {tx.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5">{tx.notes}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    {tx.type === "OUT" ? "-" : tx.type === "IN" ? "+" : "→"}
                    {Number(tx.quantity).toLocaleString()} {item.unitOfMeasure.abbreviation}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(tx.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
