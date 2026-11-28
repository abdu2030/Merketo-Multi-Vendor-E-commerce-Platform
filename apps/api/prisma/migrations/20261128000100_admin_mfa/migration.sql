ALTER TABLE "users" ADD COLUMN "adminTotpLastStep" INTEGER;
ALTER TABLE "refresh_tokens" ADD COLUMN "adminMfaBinding" TEXT;
