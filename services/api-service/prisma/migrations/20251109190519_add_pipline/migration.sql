-- CreateTable
CREATE TABLE "files" (
    "file_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "total_lines" INTEGER NOT NULL DEFAULT 0,
    "total_chunks" INTEGER NOT NULL DEFAULT 0,
    "origin_lang" TEXT,
    "target_lang" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "files_pkey" PRIMARY KEY ("file_id")
);

-- CreateTable
CREATE TABLE "progress" (
    "file_id" TEXT NOT NULL,
    "processed_lines" INTEGER NOT NULL DEFAULT 0,
    "processed_chunks" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "progress_pkey" PRIMARY KEY ("file_id")
);

-- AddForeignKey
ALTER TABLE "progress" ADD CONSTRAINT "progress_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("file_id") ON DELETE CASCADE ON UPDATE CASCADE;
