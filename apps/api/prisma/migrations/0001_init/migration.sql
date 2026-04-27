-- CreateTable
CREATE TABLE "Creator" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "googleId" TEXT,
    "displayName" TEXT,
    "primaryNiche" TEXT,
    "secondaryNiche" TEXT,
    "instagramHandle" TEXT,
    "followerCountRange" TEXT,
    "primaryGoal" TEXT,
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "encryptedApiKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Creator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Script" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "scripts" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Script_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Streak" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "current" INTEGER NOT NULL DEFAULT 0,
    "highest" INTEGER NOT NULL DEFAULT 0,
    "lastActionDate" TEXT,
    "milestones" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Streak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReelSubmission" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "feedback" JSONB,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReelSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ViralityPrediction" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "reelSubmissionId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "reachMin" INTEGER NOT NULL,
    "reachMax" INTEGER NOT NULL,
    "suggestions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ViralityPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trend" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "exampleFormat" TEXT NOT NULL,
    "engagementLiftPercent" DOUBLE PRECISION NOT NULL,
    "niche" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hook" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "niches" TEXT[],
    "relevanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Hook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedHook" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "hookId" TEXT NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedHook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "followerCount" INTEGER NOT NULL,
    "followerGrowth7d" INTEGER NOT NULL,
    "followerGrowth30d" INTEGER NOT NULL,
    "postingConsistency30d" DOUBLE PRECISION NOT NULL,
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonetizationModule" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "MonetizationModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonetizationLesson" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "estimatedReadMin" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "audienceLevel" TEXT NOT NULL,

    CONSTRAINT "MonetizationLesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonCompletion" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Creator_email_key" ON "Creator"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Creator_googleId_key" ON "Creator"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_refreshToken_key" ON "Session"("refreshToken");

-- CreateIndex
CREATE UNIQUE INDEX "Script_creatorId_date_key" ON "Script"("creatorId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Streak_creatorId_key" ON "Streak"("creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "ViralityPrediction_reelSubmissionId_key" ON "ViralityPrediction"("reelSubmissionId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedHook_creatorId_hookId_key" ON "SavedHook"("creatorId", "hookId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonCompletion_creatorId_lessonId_key" ON "LessonCompletion"("creatorId", "lessonId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Script" ADD CONSTRAINT "Script_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Streak" ADD CONSTRAINT "Streak_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReelSubmission" ADD CONSTRAINT "ReelSubmission_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViralityPrediction" ADD CONSTRAINT "ViralityPrediction_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViralityPrediction" ADD CONSTRAINT "ViralityPrediction_reelSubmissionId_fkey" FOREIGN KEY ("reelSubmissionId") REFERENCES "ReelSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedHook" ADD CONSTRAINT "SavedHook_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedHook" ADD CONSTRAINT "SavedHook_hookId_fkey" FOREIGN KEY ("hookId") REFERENCES "Hook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsSnapshot" ADD CONSTRAINT "AnalyticsSnapshot_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonetizationLesson" ADD CONSTRAINT "MonetizationLesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "MonetizationModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonCompletion" ADD CONSTRAINT "LessonCompletion_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonCompletion" ADD CONSTRAINT "LessonCompletion_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "MonetizationLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
