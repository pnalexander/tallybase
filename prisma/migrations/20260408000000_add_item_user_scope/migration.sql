-- Clear existing data that has no owner (dev/test data only)
DELETE FROM "Transaction";
DELETE FROM "Lot";
DELETE FROM "Item";

-- AddColumn
ALTER TABLE "Item" ADD COLUMN "userId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
