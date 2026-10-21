-- CreateEnum
CREATE TYPE "VerificationMethod" AS ENUM ('NONE', 'EXTERNAL_INBOX_URL', 'GOGOMI_MAIL', 'MANUAL');

-- CreateEnum
CREATE TYPE "VerificationRequestStatus" AS ENUM ('WAITING', 'PROCESSING', 'FOUND', 'NEEDS_REVIEW', 'NOT_FOUND', 'EXPIRED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VerificationCodeEventStatus" AS ENUM ('RECEIVED', 'UNCLAIMED', 'CLAIMED', 'EXPIRED', 'AMBIGUOUS', 'IGNORED');

-- AlterTable InventoryItem
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "verificationRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "verificationMethod" "VerificationMethod" NOT NULL DEFAULT 'NONE';
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "verificationEmail" TEXT;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "verificationAccessUrl" TEXT;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "verificationMailboxId" TEXT;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "verificationProvider" TEXT;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "verificationInstructions" TEXT;

-- AlterTable SharedAccount
ALTER TABLE "SharedAccount" ADD COLUMN IF NOT EXISTS "verificationRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SharedAccount" ADD COLUMN IF NOT EXISTS "verificationMethod" "VerificationMethod" NOT NULL DEFAULT 'NONE';
ALTER TABLE "SharedAccount" ADD COLUMN IF NOT EXISTS "verificationEmail" TEXT;
ALTER TABLE "SharedAccount" ADD COLUMN IF NOT EXISTS "verificationAccessUrl" TEXT;
ALTER TABLE "SharedAccount" ADD COLUMN IF NOT EXISTS "verificationMailboxId" TEXT;
ALTER TABLE "SharedAccount" ADD COLUMN IF NOT EXISTS "verificationProvider" TEXT;
ALTER TABLE "SharedAccount" ADD COLUMN IF NOT EXISTS "verificationInstructions" TEXT;

-- CreateTable Mailbox
CREATE TABLE IF NOT EXISTS "Mailbox" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "provider" TEXT DEFAULT 'TMAIL',
    "lastWebhookAt" TIMESTAMP(3),
    "lastReceivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mailbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable VerificationProviderRule
CREATE TABLE IF NOT EXISTS "VerificationProviderRule" (
    "id" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "allowedSenders" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "subjectPatterns" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bodyKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "codeType" TEXT NOT NULL DEFAULT 'NUMERIC',
    "allowedCodeLengths" INTEGER[] DEFAULT ARRAY[4, 6]::INTEGER[],
    "codeTtlMinutes" INTEGER NOT NULL DEFAULT 15,
    "recentLookbackMinutes" INTEGER NOT NULL DEFAULT 5,
    "confidenceThreshold" TEXT NOT NULL DEFAULT 'HIGH',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationProviderRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable VerificationRequest
CREATE TABLE IF NOT EXISTS "VerificationRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "inventoryItemId" TEXT,
    "sharedAccountId" TEXT,
    "mailboxId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'GENERIC',
    "status" "VerificationRequestStatus" NOT NULL DEFAULT 'WAITING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "fulfilledAt" TIMESTAMP(3),
    "codeEventId" TEXT,
    "codeFound" TEXT,
    "reason" TEXT,

    CONSTRAINT "VerificationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable VerificationCodeEvent
CREATE TABLE IF NOT EXISTS "VerificationCodeEvent" (
    "id" TEXT NOT NULL,
    "mailboxId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'GENERIC',
    "sender" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "codeEncrypted" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "confidence" TEXT NOT NULL DEFAULT 'HIGH',
    "status" "VerificationCodeEventStatus" NOT NULL DEFAULT 'UNCLAIMED',
    "claimedByRequestId" TEXT,
    "claimedAt" TIMESTAMP(3),
    "messageIdHash" TEXT,

    CONSTRAINT "VerificationCodeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Mailbox_email_key" ON "Mailbox"("email");
CREATE INDEX IF NOT EXISTS "Mailbox_status_idx" ON "Mailbox"("status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "VerificationProviderRule_providerName_key" ON "VerificationProviderRule"("providerName");
CREATE INDEX IF NOT EXISTS "VerificationProviderRule_enabled_idx" ON "VerificationProviderRule"("enabled");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "VerificationRequest_userId_idx" ON "VerificationRequest"("userId");
CREATE INDEX IF NOT EXISTS "VerificationRequest_orderItemId_idx" ON "VerificationRequest"("orderItemId");
CREATE INDEX IF NOT EXISTS "VerificationRequest_sharedAccountId_idx" ON "VerificationRequest"("sharedAccountId");
CREATE INDEX IF NOT EXISTS "VerificationRequest_inventoryItemId_idx" ON "VerificationRequest"("inventoryItemId");
CREATE INDEX IF NOT EXISTS "VerificationRequest_status_idx" ON "VerificationRequest"("status");
CREATE INDEX IF NOT EXISTS "VerificationRequest_expiresAt_idx" ON "VerificationRequest"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "VerificationCodeEvent_messageIdHash_key" ON "VerificationCodeEvent"("messageIdHash");
CREATE INDEX IF NOT EXISTS "VerificationCodeEvent_mailboxId_idx" ON "VerificationCodeEvent"("mailboxId");
CREATE INDEX IF NOT EXISTS "VerificationCodeEvent_provider_idx" ON "VerificationCodeEvent"("provider");
CREATE INDEX IF NOT EXISTS "VerificationCodeEvent_status_idx" ON "VerificationCodeEvent"("status");
CREATE INDEX IF NOT EXISTS "VerificationCodeEvent_receivedAt_idx" ON "VerificationCodeEvent"("receivedAt");
CREATE INDEX IF NOT EXISTS "VerificationCodeEvent_expiresAt_idx" ON "VerificationCodeEvent"("expiresAt");

-- AddForeignKey
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
