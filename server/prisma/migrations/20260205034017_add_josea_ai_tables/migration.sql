-- CreateTable
CREATE TABLE "ai_query_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    "branchId" TEXT,
    "query" TEXT NOT NULL,
    "response" TEXT,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "responseTimeMs" INTEGER NOT NULL,
    "dataPointsAccessed" INTEGER NOT NULL DEFAULT 0,
    "queryType" TEXT,
    "successful" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_query_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_conversations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_conversation_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_conversation_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage_tracking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "queryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_usage_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_query_logs_userId_createdAt_idx" ON "ai_query_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_query_logs_userRole_createdAt_idx" ON "ai_query_logs"("userRole", "createdAt");

-- CreateIndex
CREATE INDEX "ai_query_logs_queryType_idx" ON "ai_query_logs"("queryType");

-- CreateIndex
CREATE INDEX "ai_query_logs_successful_idx" ON "ai_query_logs"("successful");

-- CreateIndex
CREATE INDEX "ai_conversations_userId_lastMessageAt_idx" ON "ai_conversations"("userId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "ai_conversation_messages_conversationId_createdAt_idx" ON "ai_conversation_messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_usage_tracking_userId_date_idx" ON "ai_usage_tracking"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ai_usage_tracking_userId_date_key" ON "ai_usage_tracking"("userId", "date");

-- AddForeignKey
ALTER TABLE "ai_query_logs" ADD CONSTRAINT "ai_query_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversation_messages" ADD CONSTRAINT "ai_conversation_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_tracking" ADD CONSTRAINT "ai_usage_tracking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
