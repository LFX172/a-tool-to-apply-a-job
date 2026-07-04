// 后端 API：接收报告原文 + 用户选中的方向 → AI 生成完整项目方案 + 分步路线图
import { prisma } from '@/lib/db';
import OpenAI from 'openai';
import WordExtractor from 'word-extractor';

export const runtime = 'nodejs';

const client = new OpenAI({
	apiKey: process.env.DEEPSEEK_API_KEY,
	baseURL: 'https://api.deepseek.com'
});

const PLAN_PROMPT = `你是一位资深全栈技术导师。学生选定了从课程实验中延伸出的一个项目方向，
你需要帮他产出一份**能直接照着做的完整项目方案**。

按以下结构输出（markdown 格式，层次清晰）：

## 项目概述
- **项目名称**：（一个吸引人的名字）
- **一句话描述**：这个项目做什么、解决什么问题
- **核心价值**：为什么值得做、简历上怎么亮眼

## 技术架构
- **推荐技术栈**：前端/后端/数据库/部署，每个选型给一句话理由
- **系统架构图**：用文字描述（如"用户浏览器 → React前端 → FastAPI后端 → SQLite → YOLO模型推理"）
- **核心模块**：3-5 个模块，每个说明职责

## 分阶段路线图

### 第一阶段：最小可行产品（第1-2周）
- **目标**：（具体可验证的目标）
- **任务清单**：3-5 个具体任务，每任务含「做什么 → 怎么做 → 产出物」
- **避坑提示**：（常见错误和注意事项）

### 第二阶段：核心功能完善（第3-4周）
- **目标**：
- **任务清单**：3-5 个
- **避坑提示**：

### 第三阶段：工程化与亮点打磨（第5-6周）
- **目标**：
- **任务清单**：3-5 个
- **避坑提示**：

## 简历亮点写法
- **项目描述**（STAR 格式，一段话直接能贴简历）
- **技术关键词**：标注 5-8 个面试官爱问的关键词

要求：
1. 紧扣报告中的真实技术和选定的方向
2. 路线图每步都要"可验证"——做完这一步能明确知道"完成了"
3. 难度适中，面向有一定基础的学生，能在课余时间完成
4. 全程中文`;

export async function POST(request: Request) {
	try {
		const formData = await request.formData();
		const direction = formData.get('direction') as string | null;
		const file = formData.get('file') as File | null;
		if (!direction || !file) {
			return new Response('缺少参数（需要文件 + direction）', { status: 400 });
		}

		// 解析文件正文
		const buffer = Buffer.from(await file.arrayBuffer());
		let reportText: string;
		const nameLower = file.name.toLowerCase();
		if (nameLower.endsWith('.md') || nameLower.endsWith('.txt')) {
			reportText = buffer.toString('utf-8');
		} else {
			const extractor = new WordExtractor();
			const doc = await extractor.extract(buffer);
			reportText = doc.getBody();
		}
		if (!reportText || reportText.trim().length < 20) {
			return new Response('文件内容为空或解析失败', { status: 400 });
		}

		const completion = await client.chat.completions.create({
			model: 'deepseek-chat',
			messages: [
				{ role: 'system', content: PLAN_PROMPT },
				{
					role: 'user',
					content: `实验报告原文：\n\n${reportText}\n\n---\n\n我想把这个实验升级为下面的项目：\n\n${direction}\n\n请为我出完整方案和路线图。`
				}
			],
			stream: true
		});

		// 流式返回 + 收集全文存数据库
		const encoder = new TextEncoder();
		let fullResult = '';

		const readable = new ReadableStream({
			async start(controller) {
				try {
					for await (const chunk of completion) {
						const content = chunk.choices[0]?.delta?.content || '';
						if (content) {
							fullResult += content;
							controller.enqueue(encoder.encode(content));
						}
					}
				} catch {
					controller.enqueue(encoder.encode('\n\n[生成过程出错]'));
				} finally {
					controller.close();
					try {
						await prisma.projectPlan.create({
							data: {
								direction: direction.slice(0, 500),
								planText: fullResult
							}
						});
					} catch { /* 存库失败不影响主功能 */ }
				}
			}
		});

		return new Response(readable, {
			headers: { 'Content-Type': 'text/plain; charset=utf-8' }
		});
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		return new Response('服务器错误：' + msg, { status: 500 });
	}
}
