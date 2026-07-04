// Prisma 客户端单例（Prisma v7 需要显式 adapter）
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaClient } from '@/app/generated/prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const getPrisma = () => {
	const adapter = new PrismaLibSql({
		url: process.env.DATABASE_URL!  // "file:./prisma/dev.db"
	});
	return new PrismaClient({ adapter });
};

export const prisma = globalForPrisma.prisma ?? getPrisma();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
