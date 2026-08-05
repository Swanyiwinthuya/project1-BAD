CREATE TABLE `User` (
  `id` VARCHAR(191) NOT NULL,
  `microsoftId` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `role` ENUM('STUDENT', 'FACULTY', 'TECHNICIAN', 'ADMIN') NOT NULL DEFAULT 'STUDENT',
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `User_microsoftId_key` (`microsoftId`),
  UNIQUE INDEX `User_email_key` (`email`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Ticket` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(160) NOT NULL,
  `description` TEXT NOT NULL,
  `room` VARCHAR(120) NULL,
  `category` ENUM('HARDWARE', 'SOFTWARE', 'NETWORK', 'ACCOUNT_ACCESS', 'AUDIO_VISUAL', 'OTHER') NOT NULL DEFAULT 'OTHER',
  `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
  `status` ENUM('OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
  `aiReason` VARCHAR(500) NULL,
  `requesterId` VARCHAR(191) NOT NULL,
  `assignedTechnicianId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `Ticket_requesterId_idx` (`requesterId`),
  INDEX `Ticket_assignedTechnicianId_idx` (`assignedTechnicianId`),
  INDEX `Ticket_status_priority_idx` (`status`, `priority`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Comment` (
  `id` VARCHAR(191) NOT NULL,
  `content` TEXT NOT NULL,
  `isInternal` BOOLEAN NOT NULL DEFAULT false,
  `ticketId` VARCHAR(191) NOT NULL,
  `authorId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `Comment_ticketId_createdAt_idx` (`ticketId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AuditLog` (
  `id` VARCHAR(191) NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `entityType` VARCHAR(100) NOT NULL,
  `entityId` VARCHAR(191) NULL,
  `details` JSON NULL,
  `userId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `AuditLog_entityType_entityId_idx` (`entityType`, `entityId`),
  INDEX `AuditLog_createdAt_idx` (`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PeerRequest` (
  `id` VARCHAR(191) NOT NULL,
  `externalReference` VARCHAR(191) NULL,
  `partnerName` VARCHAR(160) NULL,
  `requestType` VARCHAR(100) NOT NULL,
  `status` VARCHAR(50) NOT NULL,
  `payload` JSON NULL,
  `ticketId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `PeerRequest_externalReference_key` (`externalReference`),
  INDEX `PeerRequest_ticketId_idx` (`ticketId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_requesterId_fkey` FOREIGN KEY (`requesterId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_assignedTechnicianId_fkey` FOREIGN KEY (`assignedTechnicianId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Comment` ADD CONSTRAINT `Comment_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `Ticket`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Comment` ADD CONSTRAINT `Comment_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `PeerRequest` ADD CONSTRAINT `PeerRequest_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `Ticket`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

