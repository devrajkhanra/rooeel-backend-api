-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "formSchema" JSONB,
ADD COLUMN     "submissionData" JSONB,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'basic';
