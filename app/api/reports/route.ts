// 历史记录 API：返回所有上传过的报告列表
import { prisma } from '@/lib/db';

export async function GET() {
	const reports = await prisma.experimentReport.findMany({
		orderBy: { createdAt: 'desc' },
		select: { id: true, fileName: true, createdAt: true } // 列表只取摘要，不含全文
	});
	return Response.json(reports);
}
