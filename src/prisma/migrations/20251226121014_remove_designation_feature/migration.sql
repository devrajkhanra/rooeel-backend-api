/*
  Warnings:

  - You are about to drop the column `designationId` on the `ProjectUser` table. All the data in the column will be lost.
  - You are about to drop the `Designation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProjectDesignation` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ProjectDesignation" DROP CONSTRAINT "ProjectDesignation_designationId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectDesignation" DROP CONSTRAINT "ProjectDesignation_projectId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectUser" DROP CONSTRAINT "ProjectUser_designationId_fkey";

-- DropIndex
DROP INDEX "ProjectUser_designationId_idx";

-- AlterTable
ALTER TABLE "ProjectUser" DROP COLUMN "designationId";

-- DropTable
DROP TABLE "Designation";

-- DropTable
DROP TABLE "ProjectDesignation";
