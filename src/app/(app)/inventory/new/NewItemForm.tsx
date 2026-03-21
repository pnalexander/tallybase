"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod";
import { toast } from "sonner";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

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

interface AttributeField {
  key: string;
  label: string;
  type: "string" | "number" | "quarters" | "boolean";
  required?: boolean;
  options?: string[];
  hint?: string;
}

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  categoryId: z.string().min(1, "Category is required"),
  unitOfMeasureId: z.string().min(1, "Unit is required"),
  initialQuantity: z.coerce.number().min(0, "Must be 0 or greater"),
  sku: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function NewItemForm({
  categories,
  units,
}: {
  categories: Category[];
  units: UnitOfMeasure[];
}) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [attributes, setAttributes] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<FormValues>({
    resolver: standardSchemaResolver(schema) as any,
    defaultValues: { name: "", categoryId: "", unitOfMeasureId: "", initialQuantity: 0 },
  });

  function handleCategoryChange(id: string) {
    const cat = categories.find((c) => c.id === id) ?? null;
    setSelectedCategory(cat);
    setAttributes({});
    form.setValue("categoryId", id);
  }

  function handleAttributeChange(key: string, value: unknown) {
    setAttributes((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, attributes }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Failed to create item");
      return;
    }
    const item = await res.json();
    toast.success("Item created");
    router.push(`/inventory/${item.id}`);
  }

  const attrFields = selectedCategory
    ? (selectedCategory.attributeSchema as AttributeField[] | null) ?? []
    : [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="8/4 Walnut, Wood Glue — Titebond III…" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="categoryId"
          render={() => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={handleCategoryChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="unitOfMeasureId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit of Measure</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a unit" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.abbreviation})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="initialQuantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Initial Quantity</FormLabel>
              <FormControl>
                <Input type="number" step="0.0001" min="0" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {attrFields.length > 0 && (
          <div className="space-y-4 border rounded-lg p-4">
            <p className="text-sm font-medium text-muted-foreground">
              {selectedCategory?.name} attributes
            </p>
            {attrFields.map((field) => (
              <div key={field.key} className="space-y-1">
                <Label htmlFor={`attr-${field.key}`}>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {field.hint && (
                  <p className="text-xs text-muted-foreground">{field.hint}</p>
                )}
                {field.type === "boolean" ? (
                  <input
                    id={`attr-${field.key}`}
                    type="checkbox"
                    className="h-4 w-4"
                    onChange={(e) => handleAttributeChange(field.key, e.target.checked)}
                  />
                ) : field.options ? (
                  <Select
                    onValueChange={(v) => handleAttributeChange(field.key, v)}
                  >
                    <SelectTrigger id={`attr-${field.key}`}>
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
                    id={`attr-${field.key}`}
                    type={field.type === "number" || field.type === "quarters" ? "number" : "text"}
                    min={field.type === "quarters" ? 1 : undefined}
                    step={field.type === "quarters" ? 1 : undefined}
                    onChange={(e) =>
                      handleAttributeChange(
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

        <FormField
          control={form.control}
          name="sku"
          render={({ field }) => (
            <FormItem>
              <FormLabel>SKU (optional)</FormLabel>
              <FormControl>
                <Input placeholder="Internal or vendor SKU" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (optional)</FormLabel>
              <FormControl>
                <Input placeholder="Any notes about this item" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Creating…" : "Create Item"}
        </Button>
      </form>
    </Form>
  );
}
