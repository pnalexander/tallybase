"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Lot {
  id: string;
  quantity: number;
  attributes: Record<string, unknown> | null;
  notes: string | null;
}

interface LotGroup {
  key: string;
  quantityEach: number;
  attributes: Record<string, unknown> | null;
  count: number;
  totalQuantity: number;
  lots: Lot[]; // individual lots in this group, oldest first
}

function groupLots(lots: Lot[]): LotGroup[] {
  const map = new Map<string, LotGroup>();
  for (const lot of lots) {
    const key = `${lot.quantity}::${JSON.stringify(lot.attributes ?? {})}`;
    const existing = map.get(key);
    if (existing) {
      existing.count++;
      existing.totalQuantity += lot.quantity;
      existing.lots.push(lot);
    } else {
      map.set(key, {
        key,
        quantityEach: lot.quantity,
        attributes: lot.attributes,
        count: 1,
        totalQuantity: lot.quantity,
        lots: [lot],
      });
    }
  }
  return Array.from(map.values());
}

function formatAttributes(attrs: Record<string, unknown> | null): string {
  if (!attrs || Object.keys(attrs).length === 0) return "";
  return Object.entries(attrs)
    .map(([k, v]) => {
      if (k.includes("quarters")) return `${v}/4`;
      if (k.includes("inches")) return `${v}"`;
      if (k.includes("feet")) return `${v}ft`;
      return String(v);
    })
    .join(" × ");
}

export default function LotList({
  itemId,
  lots: rawLots,
  unitAbbr,
}: {
  itemId: string;
  lots: Lot[];
  unitAbbr: string;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [removing, setRemoving] = useState<string | null>(null);

  const groups = groupLots(rawLots);

  function toggleGroup(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  async function removeLot(lotId: string) {
    setRemoving(lotId);
    const res = await fetch(`/api/items/${itemId}/lots/${lotId}`, {
      method: "DELETE",
    });
    setRemoving(null);
    if (!res.ok) {
      toast.error("Failed to remove lot");
      return;
    }
    toast.success("Lot removed");
    router.refresh();
  }

  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No lots yet. Use &ldquo;Add Lot&rdquo; to track individual pieces.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {groups.map((group) => {
        const isExpanded = expanded.has(group.key);
        const attrSummary = formatAttributes(group.attributes);

        return (
          <div key={group.key} className="border rounded-lg overflow-hidden">
            {/* Group header row */}
            <div className="flex items-center justify-between px-3 py-2.5 bg-card">
              <div className="flex items-center gap-2 min-w-0">
                {group.count > 1 && (
                  <Badge variant="secondary" className="shrink-0 tabular-nums">
                    {group.count}×
                  </Badge>
                )}
                <div className="min-w-0">
                  {attrSummary && (
                    <p className="text-sm font-medium truncate">{attrSummary}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {group.count > 1
                      ? `${group.quantityEach.toLocaleString()} ${unitAbbr} each · ${group.totalQuantity.toLocaleString()} ${unitAbbr} total`
                      : `${group.totalQuantity.toLocaleString()} ${unitAbbr}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                {group.count === 1 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeLot(group.lots[0].id)}
                    disabled={removing === group.lots[0].id}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground"
                    onClick={() => toggleGroup(group.key)}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Expanded individual lots */}
            {isExpanded && group.count > 1 && (
              <div className="border-t divide-y">
                {group.lots.map((lot, i) => (
                  <div
                    key={lot.id}
                    className="flex items-center justify-between px-3 py-2 bg-muted/30"
                  >
                    <span className="text-xs text-muted-foreground">
                      Lot {i + 1} · {lot.quantity.toLocaleString()} {unitAbbr}
                      {lot.notes && ` · ${lot.notes}`}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeLot(lot.id)}
                      disabled={removing === lot.id}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
