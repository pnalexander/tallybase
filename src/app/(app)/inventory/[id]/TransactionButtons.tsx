"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowDownCircle, ArrowUpCircle, SlidersHorizontal } from "lucide-react";

type TxType = "IN" | "OUT" | "ADJUSTMENT";

export default function TransactionButtons({
  itemId,
  unitAbbr,
}: {
  itemId: string;
  unitAbbr: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [txType, setTxType] = useState<TxType>("IN");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function openDialog(type: TxType) {
    setTxType(type);
    setQuantity("");
    setNotes(type === "ADJUSTMENT" ? "Manual count adjustment" : "");
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!quantity) return;
    setSubmitting(true);
    const res = await fetch(`/api/items/${itemId}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: txType, quantity: Number(quantity), notes }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(typeof data.error === "string" ? data.error : "Transaction failed");
      return;
    }
    toast.success(
      txType === "IN"
        ? "Stock added"
        : txType === "OUT"
        ? "Stock used"
        : "Quantity adjusted"
    );
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <Button
          variant="outline"
          className="flex flex-col h-auto py-3 gap-1 text-green-700 border-green-200 hover:bg-green-50"
          onClick={() => openDialog("IN")}
        >
          <ArrowDownCircle className="h-5 w-5" />
          <span className="text-xs font-medium">Add Stock</span>
        </Button>
        <Button
          variant="outline"
          className="flex flex-col h-auto py-3 gap-1 text-orange-700 border-orange-200 hover:bg-orange-50"
          onClick={() => openDialog("OUT")}
        >
          <ArrowUpCircle className="h-5 w-5" />
          <span className="text-xs font-medium">Use Stock</span>
        </Button>
        <Button
          variant="outline"
          className="flex flex-col h-auto py-3 gap-1 text-blue-700 border-blue-200 hover:bg-blue-50"
          onClick={() => openDialog("ADJUSTMENT")}
        >
          <SlidersHorizontal className="h-5 w-5" />
          <span className="text-xs font-medium">Adjust</span>
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {txType === "IN"
                ? "Add Stock"
                : txType === "OUT"
                ? "Use Stock"
                : "Adjust Quantity"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="qty">
                {txType === "ADJUSTMENT"
                  ? `Actual quantity (${unitAbbr})`
                  : `Quantity (${unitAbbr})`}
              </Label>
              <Input
                id="qty"
                type="number"
                step="0.0001"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Saving…" : "Confirm"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
