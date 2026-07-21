-- AlterEnum
ALTER TYPE "RewardStatus" ADD VALUE 'SOLICITADO';
ALTER TYPE "RewardStatus" ADD VALUE 'LISTO_PARA_RETIRAR';

-- AlterTable
ALTER TABLE "LoyaltyRedemption" ADD COLUMN "questId" TEXT, ADD COLUMN "fechaExpiracion" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ClientCoupon" ADD COLUMN "questId" TEXT;
