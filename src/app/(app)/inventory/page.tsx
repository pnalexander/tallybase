import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

export default async function InventoryPage() {
  const items = await prisma.item.findMany({
    orderBy: { name: "asc" },
    include: {
      category: true,
      unitOfMeasure: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-muted-foreground text-sm">{items.length} items</p>
        </div>
        <Link href="/inventory/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Item
          </Button>
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="mb-4">No items yet.</p>
          <Link href="/inventory/new">
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              Add your first item
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <Link key={item.id} href={`/inventory/${item.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-tight">{item.name}</CardTitle>
                    <Badge
                      variant="secondary"
                      style={
                        item.category.color
                          ? { backgroundColor: item.category.color + "20", color: item.category.color }
                          : undefined
                      }
                      className="shrink-0 text-xs"
                    >
                      {item.category.name}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {Number(item.quantity).toLocaleString()}
                    <span className="text-base font-normal text-muted-foreground ml-1">
                      {item.unitOfMeasure.abbreviation}
                    </span>
                  </p>
                  {item.lowStockThreshold &&
                    Number(item.quantity) <= Number(item.lowStockThreshold) && (
                      <p className="text-xs text-orange-500 mt-1">Low stock</p>
                    )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
