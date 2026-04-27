-- CreateTable
CREATE TABLE "TrendSignal" (
    "id" TEXT NOT NULL,
    "niche" TEXT NOT NULL,
    "hook" TEXT NOT NULL,
    "caption" TEXT,
    "formatType" TEXT NOT NULL,
    "structureType" TEXT NOT NULL,
    "engagementScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrendSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrendPattern" (
    "id" TEXT NOT NULL,
    "niche" TEXT NOT NULL,
    "hookTemplate" TEXT NOT NULL,
    "hookType" TEXT NOT NULL,
    "structureType" TEXT NOT NULL,
    "emotionType" TEXT NOT NULL,
    "formatType" TEXT NOT NULL,
    "trendScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "clusterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrendPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrendCluster" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "niche" TEXT NOT NULL,
    "description" TEXT,
    "strength" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "growthPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "exampleHooks" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrendCluster_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrendSignal_niche_idx" ON "TrendSignal"("niche");

-- CreateIndex
CREATE INDEX "TrendSignal_engagementScore_idx" ON "TrendSignal"("engagementScore");

-- CreateIndex
CREATE INDEX "TrendPattern_niche_trendScore_idx" ON "TrendPattern"("niche", "trendScore");

-- CreateIndex
CREATE INDEX "TrendCluster_niche_strength_idx" ON "TrendCluster"("niche", "strength");

-- AddForeignKey
ALTER TABLE "TrendPattern" ADD CONSTRAINT "TrendPattern_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "TrendCluster"("id") ON DELETE SET NULL ON UPDATE CASCADE;
