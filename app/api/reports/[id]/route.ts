// 单条报告详情 API
import { prisma } from '@/lib/db';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const report = await prisma.experimentReport.findUnique({
		where: { id: parseInt(id) }
	});
	if (!report) return new Response('未找到', { status: 404 });
	return Response.json(report);
}
