-- Add default value to updatedAt column in work_logs table
ALTER TABLE "work_logs" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
