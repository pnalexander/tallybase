import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const addLotSchema = z.object({
  quantity: z.number().positive(),
  attributes: z.record(z.string(), z.unknown()).optional(),
  notes: z.string().nullable().optional(),
  count: z.number().int().min(1).default(1),
});

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = addLotSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { quantity, attributes, notes, count } = parsed.data;
  const totalAdded = quantity * count;

  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const quantityBefore = Number(item.quantity);

  await prisma.$transaction([
    // Create N identical lots
    ...Array.from({ length: count }, () =>
      prisma.lot.create({
        data: {
          itemId: id,
          quantity,
          attributes: attributes
            ? (attributes as Prisma.InputJsonValue)
            : undefined,
          notes: notes ?? null,
        },
      })
    ),
    // Log a single IN transaction for the total added
    prisma.transaction.create({
      data: {
        itemId: id,
        type: "IN",
        quantity: totalAdded,
        quantityBefore,
        notes:
          count > 1
            ? `Added ${count} lots × ${quantity}`
            : notes ?? undefined,
        createdById: session.user.id,
      },
    }),
    // Update item quantity
    prisma.item.update({
      where: { id },
      data: { quantity: quantityBefore + totalAdded },
    }),
  ]);

  return NextResponse.json({ success: true }, { status: 201 });
}
