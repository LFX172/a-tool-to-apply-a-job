// 后端 API：接收上传的实验报告 → 解析文本 → 调用 DeepSeek → 流式返回 + 存入数据库
import { prisma } from '@/lib/db';
import OpenAI from 'openai';
import WordExtractor from 'word-extractor';

export const runtime = 'nodejs';

const client = new OpenAI({
	apiKey: process.env.DEEPSEEK_API_KEY,
	baseURL: 'https://api.deepseek.com'
});

const SYSTEM_PROMPT = `你是一位资深技术导师，同时是大厂技术岗简历专家。

学生会给你一份大学课程实验报告。课程实验通常小而偏教学，简历上缺乏竞争力。你的任务是：基于报告中实际涉及的技术与知识，延伸构思出 3-5 个可以发展成「简历级完整项目」的方向，帮学生把课程实验升级成 HR 眼前一亮的项目。

对每个方向，按以下格式输出：

## 方向 N：[项目名]
- **简介**：一句话说明项目做什么
- **核心亮点**：3 点，体现技术含量与价值
- **技术栈**：建议使用的技术
- **难度**：用 ★ 表示（★☆☆ 入门 / ★★☆ 进阶 / ★★★ 挑战）
- **简历示例**：一句 STAR 式（情境-任务-行动-结果）的简历描述

要求：
1. 紧扣报告中真实出现的技术，不要脱离实验内容凭空发挥
2. 方向有难度梯度，从易到难排列
3. 每个方向都要点明"为什么这能成为简历亮点"
4. 全程中文，使用 markdown 格式，条理清晰`;

export async function POST(request: Request) {
	try {
		const formData = await request.formData();
		const file = formData.get('file') as File | null;
		if (!file) return new Response('未收到文件', { status: 400 });

		// 解析文件：.doc/.docx 用 word-extractor，.md/.txt 直接读文本
		const buffer = Buffer.from(await file.arrayBuffer());
		const nameLower = file.name.toLowerCase();
		let reportText: string;

		if (nameLower.endsWith('.md') || nameLower.endsWith('.txt')) {
			// Markdown / 纯文本：直接当 UTF-8 文本读
			reportText = buffer.toString('utf-8');
		} else {
			// .doc / .docx：用 word-extractor 解析
			const extractor = new WordExtractor();
			const doc = await extractor.extract(buffer);
			reportText = doc.getBody();
		}
		if (!reportText || reportText.trim().length < 20) {
			return new Response('文件内容为空或解析失败', { status: 400 });
		}

		// 调用 DeepSeek（流式）
		const completion = await client.chat.completions.create({
			model: 'deepseek-chat',
			messages: [
				{ role: 'system', content: SYSTEM_PROMPT },
				{ role: 'user', content: `这是我的课程实验报告：\n\n${reportText}` }
			],
			stream: true
		});

		// 流式返回 + 收集全文（用于存数据库）
		const encoder = new TextEncoder();
		let fullResult = ''; // 收集 AI 完整输出

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
					// 流结束后，异步存数据库（不影响客户端响应）
					try {
						await prisma.experimentReport.create({
							data: { fileName: file.name, rawText: reportText, aiResult: fullResult }
						});
					} catch {
						// 存库失败不报错，主功能已正常
					}
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
