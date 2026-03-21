import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";

interface Params {
  params: Promise<{ id: string; lotId: string }>;
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, lotId } = await params;

  const lot = await prisma.lot.findUnique({ where: { id: lotId } });
  if (!lot || lot.itemId !== id) {
    return NextResponse.json({ error: "Lot not found" }, { status: 404 });
  }

  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const quantityBefore = Number(item.quantity);
  const lotQty = Number(lot.quantity);

  await prisma.$transaction([
    prisma.lot.delete({ where: { id: lotId } }),
    prisma.transaction.create({
      data: {
        itemId: id,
        type: "OUT",
        quantity: lotQty,
        quantityBefore,
        notes: "Lot removed",
        createdById: session.user.id,
      },
    }),
    prisma.item.update({
      where: { id },
      data: { quantity: quantityBefore - lotQty },
    }),
  ]);

  return NextResponse.json({ success: true });
}
