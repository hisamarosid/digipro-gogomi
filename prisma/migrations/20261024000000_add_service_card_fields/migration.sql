-- Service ("Jasa Digital") card details shown on the storefront.
-- Run this on the production MySQL database BEFORE deploying the matching code.

-- AlterTable Product: estimated completion time, e.g. '1x24 jam'
ALTER TABLE `Product` ADD COLUMN `etaLabel` VARCHAR(191) NULL;

-- AlterTable ProductVariant: unit label (e.g. '1 CV') and remaining slots (NULL = unlimited)
ALTER TABLE `ProductVariant` ADD COLUMN `unitLabel` VARCHAR(191) NULL;
ALTER TABLE `ProductVariant` ADD COLUMN `quotaRemaining` INTEGER NULL;
