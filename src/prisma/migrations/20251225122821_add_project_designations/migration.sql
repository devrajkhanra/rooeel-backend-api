-- CreateTable
CREATE TABLE "ProjectDesignation" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "designationId" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectDesignation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectDesignation_projectId_idx" ON "ProjectDesignation"("projectId");

-- CreateIndex
CREATE INDEX "ProjectDesignation_designationId_idx" ON "ProjectDesignation"("designationId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectDesignation_projectId_designationId_key" ON "ProjectDesignation"("projectId", "designationId");

-- AddForeignKey
ALTER TABLE "ProjectDesignation" ADD CONSTRAINT "ProjectDesignation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDesignation" ADD CONSTRAINT "ProjectDesignation_designationId_fkey" FOREIGN KEY ("designationId") REFERENCES "Designation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
