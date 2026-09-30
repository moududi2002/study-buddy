-- AlterEnum
ALTER TYPE "MessageType" ADD VALUE 'AUDIO';

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "audioDuration" INTEGER,
ADD COLUMN     "audioUrl" TEXT;
