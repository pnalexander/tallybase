"use client";

import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Printer } from "lucide-react";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default function QRSection({
  itemId,
  itemName,
}: {
  itemId: string;
  itemName: string;
}) {
  const qrValue = `${APP_URL}/scan/${itemId}`;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          QR Code
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.print()}
            className="h-7 px-2 text-xs"
          >
            <Printer className="h-3.5 w-3.5 mr-1" />
            Print label
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3">
        <div className="p-3 bg-white rounded-lg">
          <QRCode value={qrValue} size={160} />
        </div>
        <p className="text-xs text-muted-foreground text-center break-all">{qrValue}</p>
        <div className="hidden print:block text-center">
          <p className="font-bold">{itemName}</p>
        </div>
      </CardContent>
    </Card>
  );
}
