import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
  unitOfMeasureId: z.string().min(1).optional(),
  sku: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  lowStockThreshold: z.number().min(0).nullable().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
});

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { attributes, sku, notes, lowStockThreshold, ...rest } = parsed.data;

  const item = await prisma.item.update({
    where: { id },
    data: {
      ...rest,
      ...(sku !== undefined && { sku }),
      ...(notes !== undefined && { notes }),
      ...(lowStockThreshold !== undefined && { lowStockThreshold }),
      ...(attributes !== undefined && {
        attributes: attributes as Prisma.InputJsonValue,
      }),
    },
  });

  return NextResponse.json(item);
}
