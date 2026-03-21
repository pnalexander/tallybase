import { prisma } from "@/lib/prisma";
import NewItemForm from "./NewItemForm";

export default async function NewItemPage() {
  const [categories, units] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.unitOfMeasure.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Item</h1>
        <p className="text-muted-foreground text-sm">Add an item to your inventory</p>
      </div>
      <NewItemForm categories={categories} units={units} />
    </div>
  );
}
