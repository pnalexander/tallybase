"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";

interface AttributeField {
  key: string;
  label: string;
  type: "string" | "number" | "quarters" | "boolean";
  required?: boolean;
  options?: string[];
  hint?: string;
}

interface Category {
  id: string;
  name: string;
  attributeSchema: unknown;
}

interface UnitOfMeasure {
  id: string;
  name: string;
  abbreviation: string;
}

interface Item {
  id: string;
  name: string;
  sku: string | null;
  notes: string | null;
  lowStockThreshold: unknown;
  categoryId: string;
  unitOfMeasureId: string;
  attributes: unknown;
}

export default function EditItemDrawer({
  item,
  categories,
  units,
}: {
  item: Item;
  categories: Category[];
  units: UnitOfMeasure[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState(item.name);
  const [categoryId, setCategoryId] = useState(item.categoryId);
  const [unitOfMeasureId, setUnitOfMeasureId] = useState(item.unitOfMeasureId);
  const [sku, setSku] = useState(item.sku ?? "");
  const [notes, setNotes] = useState(item.notes ?? "");
  const [lowStockThreshold, setLowStockThreshold] = useState(
    item.lowStockThreshold != null ? String(item.lowStockThreshold) : ""
  );
  const [attributes, setAttributes] = useState<Record<string, unknown>>(
    (item.attributes as Record<string, unknown>) ?? {}
  );

  const selectedCategory = categories.find((c) => c.id === categoryId) ?? null;
  const attrFields = selectedCategory
    ? (selectedCategory.attributeSchema as AttributeField[] | null) ?? []
    : [];

  function handleCategoryChange(id: string) {
    if (id !== categoryId) {
      setCategoryId(id);
      // Only reset attributes if category actually changed
      setAttributes({});
    }
  }

  function handleAttrChange(key: string, value: unknown) {
    setAttributes((prev) => ({ ...prev, [key]: value }));
  }

  function resetAndClose() {
    // Reset to current item values on cancel
    setName(item.name);
    setCategoryId(item.categoryId);
    setUnitOfMeasureId(item.unitOfMeasureId);
    setSku(item.sku ?? "");
    setNotes(item.notes ?? "");
    setLowStockThreshold(
      item.lowStockThreshold != null ? String(item.lowStockThreshold) : ""
    );
    setAttributes((item.attributes as Record<string, unknown>) ?? {});
    setOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);

    const res = await fetch(`/api/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        categoryId,
        unitOfMeasureId,
        sku: sku.trim() || null,
        notes: notes.trim() || null,
        lowStockThreshold: lowStockThreshold ? Number(lowStockThreshold) : null,
        attributes,
      }),
    });

    setSubmitting(false);

    if (!res.ok) {
      toast.error("Failed to save changes");
      return;
    }

    toast.success("Item updated");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4 mr-1.5" />
        Edit
      </Button>

      <Drawer open={open} onOpenChange={(v) => { if (!v) resetAndClose(); else setOpen(true); }}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Edit Item</DrawerTitle>
          </DrawerHeader>

          <form onSubmit={handleSubmit}>
            <div className="px-4 pb-2 space-y-4 overflow-y-auto max-h-[60vh]">
              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={categoryId} onValueChange={handleCategoryChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Unit of Measure */}
              <div className="space-y-1.5">
                <Label>Unit of Measure</Label>
                <Select value={unitOfMeasureId} onValueChange={setUnitOfMeasureId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.abbreviation})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dynamic attributes */}
              {attrFields.length > 0 && (
                <div className="space-y-4 border rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {selectedCategory?.name} attributes
                  </p>
                  {attrFields.map((field) => (
                    <div key={field.key} className="space-y-1.5">
                      <Label htmlFor={`edit-attr-${field.key}`}>
                        {field.label}
                        {field.required && (
                          <span className="text-destructive ml-1">*</span>
                        )}
                      </Label>
                      {field.hint && (
                        <p className="text-xs text-muted-foreground">{field.hint}</p>
                      )}
                      {field.type === "boolean" ? (
                        <input
                          id={`edit-attr-${field.key}`}
                          type="checkbox"
                          className="h-4 w-4"
                          checked={Boolean(attributes[field.key])}
                          onChange={(e) =>
                            handleAttrChange(field.key, e.target.checked)
                          }
                        />
                      ) : field.options ? (
                        <Select
                          value={String(attributes[field.key] ?? "")}
                          onValueChange={(v) => handleAttrChange(field.key, v)}
                        >
                          <SelectTrigger id={`edit-attr-${field.key}`}>
                            <SelectValue placeholder={`Select ${field.label}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id={`edit-attr-${field.key}`}
                          type={
                            field.type === "number" || field.type === "quarters"
                              ? "number"
                              : "text"
                          }
                          min={field.type === "quarters" ? 1 : undefined}
                          step={field.type === "quarters" ? 1 : undefined}
                          value={
                            attributes[field.key] != null
                              ? String(attributes[field.key])
                              : ""
                          }
                          onChange={(e) =>
                            handleAttrChange(
                              field.key,
                              field.type === "number" || field.type === "quarters"
                                ? Number(e.target.value)
                                : e.target.value
                            )
                          }
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Low stock threshold */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-threshold">Low Stock Threshold (optional)</Label>
                <Input
                  id="edit-threshold"
                  type="number"
                  step="0.0001"
                  min="0"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                  placeholder="e.g. 10"
                />
              </div>

              {/* SKU */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-sku">SKU (optional)</Label>
                <Input
                  id="edit-sku"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-notes">Notes (optional)</Label>
                <Input
                  id="edit-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <DrawerFooter>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Save changes"}
              </Button>
              <DrawerClose asChild>
                <Button type="button" variant="outline" onClick={resetAndClose}>
                  Cancel
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    </>
  );
}
