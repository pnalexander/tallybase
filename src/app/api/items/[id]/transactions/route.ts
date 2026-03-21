import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { z } from "zod";

const txSchema = z.object({
  type: z.enum(["IN", "OUT", "ADJUSTMENT"]),
  // ADJUSTMENT allows 0 (set quantity to zero); IN/OUT require positive
  quantity: z.number().min(0),
  notes: z.string().optional(),
});

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;

  // Scan page is public — allow unauthenticated transactions in MVP
  const session = await getAuthSession();

  const body = await req.json();
  const parsed = txSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { type, quantity, notes } = parsed.data;

  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const quantityBefore = Number(item.quantity);

  let newQuantity: number;
  if (type === "IN") {
    newQuantity = quantityBefore + quantity;
  } else if (type === "OUT") {
    newQuantity = quantityBefore - quantity;
  } else {
    // ADJUSTMENT: quantity param is the new absolute value
    newQuantity = quantity;
  }

  await prisma.$transaction([
    prisma.transaction.create({
      data: {
        itemId: id,
        type,
        quantity,
        adjustedTo: type === "ADJUSTMENT" ? quantity : undefined,
        quantityBefore,
        notes: notes || undefined,
        createdById: session?.user.id ?? undefined,
      },
    }),
    prisma.item.update({
      where: { id },
      data: { quantity: newQuantity },
    }),
  ]);

  return NextResponse.json({ success: true, quantity: newQuantity });
}
