-- CreateTable
CREATE TABLE "DailyMission" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "scriptId" TEXT,
    "hook" TEXT NOT NULL,
    "concept" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyMission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyMission_creatorId_idx" ON "DailyMission"("creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyMission_creatorId_date_key" ON "DailyMission"("creatorId", "date");

-- AddForeignKey
ALTER TABLE "DailyMission" ADD CONSTRAINT "DailyMission_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
