-- AlterTable
ALTER TABLE "ProjectUser" ADD COLUMN     "designationId" INTEGER;

-- CreateIndex
CREATE INDEX "ProjectUser_designationId_idx" ON "ProjectUser"("designationId");

-- AddForeignKey
ALTER TABLE "ProjectUser" ADD CONSTRAINT "ProjectUser_designationId_fkey" FOREIGN KEY ("designationId") REFERENCES "Designation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
