import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const createItemSchema = z.object({
  name: z.string().min(1),
  categoryId: z.string().min(1),
  unitOfMeasureId: z.string().min(1),
  initialQuantity: z.number().min(0).default(0),
  sku: z.string().optional(),
  notes: z.string().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { name, categoryId, unitOfMeasureId, initialQuantity, sku, notes, attributes } =
    parsed.data;

  const item = await prisma.$transaction(async (tx) => {
    const newItem = await tx.item.create({
      data: {
        name,
        categoryId,
        unitOfMeasureId,
        quantity: initialQuantity,
        sku: sku || undefined,
        notes: notes || undefined,
        attributes: attributes as Prisma.InputJsonValue | undefined,
        qrCodeValue: "",
      },
    });

    const qrCodeValue = `${process.env.BETTER_AUTH_URL ?? "http://localhost:3000"}/scan/${newItem.id}`;

    const updated = await tx.item.update({
      where: { id: newItem.id },
      data: { qrCodeValue },
    });

    if (initialQuantity > 0) {
      await tx.transaction.create({
        data: {
          itemId: newItem.id,
          type: "IN",
          quantity: initialQuantity,
          quantityBefore: 0,
          notes: "Initial stock",
          createdById: session.user.id,
        },
      });
    }

    return updated;
  });

  return NextResponse.json(item, { status: 201 });
}
