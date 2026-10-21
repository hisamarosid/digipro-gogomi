-- AlterTable FamilyGroup
ALTER TABLE `FamilyGroup` ADD COLUMN `verificationRequired` TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE `FamilyGroup` ADD COLUMN `verificationMethod` VARCHAR(191) NOT NULL DEFAULT 'NONE';
ALTER TABLE `FamilyGroup` ADD COLUMN `verificationEmail` VARCHAR(191) NULL;
ALTER TABLE `FamilyGroup` ADD COLUMN `verificationAccessUrl` TEXT NULL;
ALTER TABLE `FamilyGroup` ADD COLUMN `verificationMailboxId` VARCHAR(191) NULL;
ALTER TABLE `FamilyGroup` ADD COLUMN `verificationProvider` VARCHAR(191) NULL;
ALTER TABLE `FamilyGroup` ADD COLUMN `verificationInstructions` TEXT NULL;

-- AlterTable VerificationRequest
ALTER TABLE `VerificationRequest` ADD COLUMN `familyGroupId` VARCHAR(191) NULL;
ALTER TABLE `VerificationRequest` ADD INDEX `VerificationRequest_familyGroupId_idx` (`familyGroupId`);
