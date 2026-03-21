"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowDownCircle, ArrowUpCircle, SlidersHorizontal, X } from "lucide-react";

type TxType = "IN" | "OUT" | "ADJUSTMENT";

export default function ScanTransactionForm({
  itemId,
  unitAbbr,
}: {
  itemId: string;
  unitAbbr: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"pick" | "form">("pick");
  const [txType, setTxType] = useState<TxType>("IN");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function pick(type: TxType) {
    setTxType(type);
    setQuantity("");
    setNotes(type === "ADJUSTMENT" ? "Manual count adjustment" : "");
    setStep("form");
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
      toast.error(data.error ?? "Transaction failed");
      return;
    }
    toast.success("Done!");
    router.refresh();
    setStep("pick");
  }

  if (step === "pick") {
    return (
      <div className="space-y-3 pb-8">
        <Button
          size="lg"
          className="w-full h-16 text-lg bg-green-600 hover:bg-green-700 text-white"
          onClick={() => pick("IN")}
        >
          <ArrowDownCircle className="h-6 w-6 mr-2" />
          Add Stock
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="w-full h-16 text-lg border-orange-300 text-orange-700 hover:bg-orange-50"
          onClick={() => pick("OUT")}
        >
          <ArrowUpCircle className="h-6 w-6 mr-2" />
          Use Stock
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="w-full h-16 text-lg border-blue-300 text-blue-700 hover:bg-blue-50"
          onClick={() => pick("ADJUSTMENT")}
        >
          <SlidersHorizontal className="h-6 w-6 mr-2" />
          Adjust
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-8">
      <div className="flex items-center justify-between mb-2">
        <p className="font-semibold text-lg">
          {txType === "IN"
            ? "Add Stock"
            : txType === "OUT"
            ? "Use Stock"
            : "Adjust Quantity"}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setStep("pick")}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-1">
        <Label htmlFor="scan-qty" className="text-base">
          {txType === "ADJUSTMENT"
            ? `Actual quantity (${unitAbbr})`
            : `Quantity (${unitAbbr})`}
        </Label>
        <Input
          id="scan-qty"
          type="number"
          inputMode="decimal"
          step="0.0001"
          min="0"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
          autoFocus
          className="text-2xl h-14 text-center"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="scan-notes" className="text-base">
          Notes (optional)
        </Label>
        <Input
          id="scan-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="h-12"
        />
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full h-16 text-lg mt-4"
        disabled={submitting || !quantity}
      >
        {submitting ? "Saving…" : "Confirm"}
      </Button>
    </form>
  );
}
