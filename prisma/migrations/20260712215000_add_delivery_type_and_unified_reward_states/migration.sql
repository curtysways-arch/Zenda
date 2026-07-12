-- CreateEnum
CREATE TYPE "RewardDeliveryType" AS ENUM ('AUTOMATICO', 'MANUAL');

-- CreateEnum
CREATE TYPE "RewardType" AS ENUM ('CUPON', 'SERVICIO_GRATIS', 'PRODUCTO', 'REGALO', 'PUNTOS', 'CASHBACK', 'BADGE', 'PERSONALIZADO');

-- CreateEnum
CREATE TYPE "RewardStatus" AS ENUM ('DISPONIBLE', 'RESERVADO', 'CANJEADO', 'PENDIENTE_ENTREGA', 'ENTREGADO', 'CANCELADO', 'VENCIDO');

-- AlterTable ReferralCampaign
ALTER TABLE "ReferralCampaign" ADD COLUMN     "deliveryType" "RewardDeliveryType" NOT NULL DEFAULT 'AUTOMATICO',
ADD COLUMN     "recompensaImagenUrl" TEXT,
ADD COLUMN     "rewardType" "RewardType" NOT NULL DEFAULT 'PERSONALIZADO',
ADD COLUMN     "serviceId" TEXT;

-- AlterTable ReferralReward (conversión de columna de estado segura)
ALTER TABLE "ReferralReward" ADD COLUMN     "appointmentId" TEXT,
ADD COLUMN     "claimCode" TEXT,
ADD COLUMN     "entregadoPorId" TEXT,
ADD COLUMN     "fechaEntregaConfirmada" TIMESTAMP(3),
ADD COLUMN     "observaciones" TEXT;

ALTER TABLE "ReferralReward" 
  ALTER COLUMN "estado" TYPE "RewardStatus" USING (
    CASE "estado"
      WHEN 'CANJEADO' THEN 'CANJEADO'::"RewardStatus"
      WHEN 'CADUCADO' THEN 'VENCIDO'::"RewardStatus"
      ELSE 'DISPONIBLE'::"RewardStatus"
    END
  ),
  ALTER COLUMN "estado" SET DEFAULT 'DISPONIBLE';

-- AlterTable LoyaltyReward (conversión de columna de tipo segura)
ALTER TABLE "LoyaltyReward" ADD COLUMN     "deliveryType" "RewardDeliveryType" NOT NULL DEFAULT 'AUTOMATICO',
ADD COLUMN     "recompensaImagenUrl" TEXT,
ADD COLUMN     "serviceId" TEXT;

ALTER TABLE "LoyaltyReward" 
  ALTER COLUMN "tipo" TYPE "RewardType" USING (
    CASE "tipo"
      WHEN 'DESCUENTO' THEN 'PERSONALIZADO'::"RewardType"
      WHEN 'PORCENTAJE' THEN 'PERSONALIZADO'::"RewardType"
      WHEN 'DINERO' THEN 'CASHBACK'::"RewardType"
      WHEN 'SERVICIO_GRATIS' THEN 'SERVICIO_GRATIS'::"RewardType"
      WHEN 'PRODUCTO' THEN 'PRODUCTO'::"RewardType"
      WHEN 'REGALO' THEN 'REGALO'::"RewardType"
      WHEN 'CUPON' THEN 'CUPON'::"RewardType"
      ELSE 'PERSONALIZADO'::"RewardType"
    END
  ),
  ALTER COLUMN "tipo" SET DEFAULT 'PERSONALIZADO';

-- AlterTable LoyaltyRedemption (conversión de columna de estado segura)
ALTER TABLE "LoyaltyRedemption" ADD COLUMN     "appointmentId" TEXT,
ADD COLUMN     "claimCode" TEXT,
ADD COLUMN     "entregadoPorId" TEXT,
ADD COLUMN     "fechaEntregaConfirmada" TIMESTAMP(3),
ADD COLUMN     "observaciones" TEXT;

ALTER TABLE "LoyaltyRedemption" 
  ALTER COLUMN "estado" TYPE "RewardStatus" USING (
    CASE "estado"
      WHEN 'CANJEADO' THEN 'CANJEADO'::"RewardStatus"
      WHEN 'CADUCADO' THEN 'VENCIDO'::"RewardStatus"
      ELSE 'DISPONIBLE'::"RewardStatus"
    END
  ),
  ALTER COLUMN "estado" SET DEFAULT 'DISPONIBLE';

-- CreateIndex
CREATE UNIQUE INDEX "ReferralReward_claimCode_key" ON "ReferralReward"("claimCode");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyRedemption_claimCode_key" ON "LoyaltyRedemption"("claimCode");

-- AddForeignKey
ALTER TABLE "ReferralCampaign" ADD CONSTRAINT "ReferralCampaign_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Cancha"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyReward" ADD CONSTRAINT "LoyaltyReward_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Cancha"("id") ON DELETE SET NULL ON UPDATE CASCADE;
