-- AlterTable Product
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "tutorialContent" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "termsContent" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "importantNotes" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "guideVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "showGuideAfterDelivery" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "requireGuideAcknowledgement" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable OrderItem
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "guideVersionSnapshot" INTEGER;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "tutorialSnapshot" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "termsSnapshot" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "importantNotesSnapshot" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "requireGuideAcknowledgementSnapshot" BOOLEAN DEFAULT false;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "guideAcknowledgedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OrderItem_guideAcknowledgedAt_idx" ON "OrderItem"("guideAcknowledgedAt");
