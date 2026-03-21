"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";

function calcBoardFeet(
  thicknessQuarters: string,
  widthInches: string,
  lengthFeet: string
): number | null {
  const t = parseFloat(thicknessQuarters);
  const w = parseFloat(widthInches);
  const l = parseFloat(lengthFeet);
  if (!t || !w || !l) return null;
  return parseFloat(((t / 4) * (w / 12) * l).toFixed(4));
}

export default function AddLotDrawer({
  itemId,
  unitAbbr,
  isBoardFeet,
}: {
  itemId: string;
  unitAbbr: string;
  isBoardFeet: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // BF calculator fields (lumber)
  const [thicknessQuarters, setThicknessQuarters] = useState("");
  const [widthInches, setWidthInches] = useState("");
  const [lengthFeet, setLengthFeet] = useState("");

  // Direct quantity (non-lumber or manual override)
  const [manualQty, setManualQty] = useState("");

  const [count, setCount] = useState("1");
  const [notes, setNotes] = useState("");

  const calculatedBF = isBoardFeet
    ? calcBoardFeet(thicknessQuarters, widthInches, lengthFeet)
    : null;

  // The quantity to submit: BF calc result for lumber, manual entry otherwise
  const quantity = isBoardFeet
    ? (calculatedBF ?? (manualQty ? parseFloat(manualQty) : null))
    : manualQty
    ? parseFloat(manualQty)
    : null;

  const countNum = parseInt(count) || 1;
  const totalQty = quantity != null ? quantity * countNum : null;

  function reset() {
    setThicknessQuarters("");
    setWidthInches("");
    setLengthFeet("");
    setManualQty("");
    setCount("1");
    setNotes("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (quantity == null || quantity <= 0) return;

    const attributes: Record<string, unknown> = {};
    if (isBoardFeet && thicknessQuarters)
      attributes.thickness_quarters = parseFloat(thicknessQuarters);
    if (isBoardFeet && widthInches)
      attributes.width_inches = parseFloat(widthInches);
    if (isBoardFeet && lengthFeet)
      attributes.length_feet = parseFloat(lengthFeet);

    setSubmitting(true);
    const res = await fetch(`/api/items/${itemId}/lots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quantity,
        attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
        notes: notes.trim() || null,
        count: countNum,
      }),
    });
    setSubmitting(false);

    if (!res.ok) {
      toast.error("Failed to add lot");
      return;
    }

    const plural = countNum > 1 ? `${countNum} lots` : "1 lot";
    toast.success(`Added ${plural} · ${totalQty?.toLocaleString()} ${unitAbbr} total`);
    reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-1.5" />
        Add Lot
      </Button>

      <Drawer open={open} onOpenChange={(v) => { if (!v) { reset(); } setOpen(v); }}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Add Lot</DrawerTitle>
          </DrawerHeader>

          <form onSubmit={handleSubmit}>
            <div className="px-4 pb-2 space-y-4 overflow-y-auto max-h-[65vh]">

              {isBoardFeet && (
                <div className="space-y-3 border rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <Calculator className="h-3.5 w-3.5" />
                    Board Feet Calculator
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="lot-thickness" className="text-xs">
                        Thickness
                      </Label>
                      <div className="relative">
                        <Input
                          id="lot-thickness"
                          type="number"
                          inputMode="decimal"
                          step="1"
                          min="1"
                          placeholder="8"
                          value={thicknessQuarters}
                          onChange={(e) => setThicknessQuarters(e.target.value)}
                          className="pr-6"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                          /4
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="lot-width" className="text-xs">
                        Width
                      </Label>
                      <div className="relative">
                        <Input
                          id="lot-width"
                          type="number"
                          inputMode="decimal"
                          step="0.25"
                          min="0"
                          placeholder="10"
                          value={widthInches}
                          onChange={(e) => setWidthInches(e.target.value)}
                          className="pr-4"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                          &quot;
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="lot-length" className="text-xs">
                        Length
                      </Label>
                      <div className="relative">
                        <Input
                          id="lot-length"
                          type="number"
                          inputMode="decimal"
                          step="0.5"
                          min="0"
                          placeholder="8"
                          value={lengthFeet}
                          onChange={(e) => setLengthFeet(e.target.value)}
                          className="pr-5"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                          ft
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Live result */}
                  <div className="flex items-center justify-between text-sm pt-1">
                    <span className="text-muted-foreground">Board feet per lot</span>
                    <span className="font-semibold tabular-nums">
                      {calculatedBF != null
                        ? `${calculatedBF.toLocaleString()} bf`
                        : "—"}
                    </span>
                  </div>
                </div>
              )}

              {/* Manual quantity — shown for non-BF items, or as fallback for BF */}
              {(!isBoardFeet || calculatedBF == null) && (
                <div className="space-y-1.5">
                  <Label htmlFor="lot-qty">
                    {isBoardFeet ? "Or enter BF directly" : `Quantity (${unitAbbr})`}
                  </Label>
                  <Input
                    id="lot-qty"
                    type="number"
                    inputMode="decimal"
                    step="0.0001"
                    min="0"
                    value={manualQty}
                    onChange={(e) => setManualQty(e.target.value)}
                    placeholder="0"
                  />
                </div>
              )}

              {/* Count */}
              <div className="space-y-1.5">
                <Label htmlFor="lot-count">Number of identical lots</Label>
                <Input
                  id="lot-count"
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min="1"
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                />
                {countNum > 1 && totalQty != null && (
                  <p className="text-xs text-muted-foreground">
                    {countNum} lots × {quantity?.toLocaleString()} {unitAbbr} ={" "}
                    <span className="font-medium text-foreground">
                      {totalQty.toLocaleString()} {unitAbbr} total
                    </span>
                  </p>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="lot-notes">Notes (optional)</Label>
                <Input
                  id="lot-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Source, condition, etc."
                />
              </div>
            </div>

            <DrawerFooter>
              <Button type="submit" disabled={submitting || quantity == null}>
                {submitting
                  ? "Adding…"
                  : totalQty != null
                  ? `Add ${countNum > 1 ? `${countNum} lots · ` : ""}${totalQty.toLocaleString()} ${unitAbbr}`
                  : "Add Lot"}
              </Button>
              <DrawerClose asChild>
                <Button type="button" variant="outline" onClick={reset}>
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
