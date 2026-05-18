-- CreateTable
CREATE TABLE "ProjectFieldValue" (
    "id" SERIAL NOT NULL,
    "fieldId" INTEGER NOT NULL,
    "projectId" INTEGER NOT NULL,
    "value" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectFieldValue_projectId_idx" ON "ProjectFieldValue"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectFieldValue_fieldId_key" ON "ProjectFieldValue"("fieldId");

-- AddForeignKey
ALTER TABLE "ProjectFieldValue" ADD CONSTRAINT "ProjectFieldValue_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "ProjectField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectFieldValue" ADD CONSTRAINT "ProjectFieldValue_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
