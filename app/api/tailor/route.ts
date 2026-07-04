// 后端 API：接收简历 + 岗位 JD → AI 输出针对性调整后的简历 + 调整说明
import { prisma } from '@/lib/db';
import OpenAI from 'openai';

export const runtime = 'nodejs';

const client = new OpenAI({
	apiKey: process.env.DEEPSEEK_API_KEY,
	baseURL: 'https://api.deepseek.com'
});

const TAILOR_PROMPT = `你是一位资深猎头和简历专家，阅简历无数，深知 HR 和面试官想看什么。

用户会给你两份文本：
1. **原始简历**：用户当前的简历内容
2. **岗位 JD**：目标岗位的描述

你的任务是：
1. 分析这个岗位真正看重的技能、经验和特质
2. 从用户的简历中找出相关和匹配的内容，重新组织表达
3. 输出一份**针对这个岗位优化后的简历**，让 HR 眼前一亮
4. 最后附上**调整说明**（改了哪里、为什么）

输出格式（markdown）：

## 📋 岗位需求分析
简要分析这个岗位的核心要求是什么（3-5 行）

## 📝 优化后简历

（直接给出完整的、优化后的简历正文，可直接复制使用。突出与岗位匹配的经历，弱化无关内容。保持简历原有的核心事实不变，优化的是表达角度和侧重点）

## 🔄 调整说明

| 调整项 | 原来 | 调整后 | 原因 |
|:--|:--|:--|:--|
| ... | ... | ... | （为什么这样改能更好命中岗位） |

要求：
1. 简历内容保持真实不变，只调整表达角度、侧重点和呈现顺序
2. 用具体的数据和结果（如果有的话），不要空洞描述
3. 语言精练、专业，STAR 法则
4. 全程中文`;

export async function POST(request: Request) {
	try {
		const { resume, jd } = await request.json() as { resume: string; jd: string };
		if (!resume || !jd) return new Response('缺少简历或岗位描述', { status: 400 });

		const completion = await client.chat.completions.create({
			model: 'deepseek-chat',
			messages: [
				{ role: 'system', content: TAILOR_PROMPT },
				{ role: 'user', content: `原始简历：\n\n${resume}\n\n---\n\n目标岗位 JD：\n\n${jd}` }
			],
			stream: true
		});

		const encoder = new TextEncoder();
		let fullResult = '';

		const readable = new ReadableStream({
			async start(controller) {
				try {
					for await (const chunk of completion) {
						const content = chunk.choices[0]?.delta?.content || '';
						if (content) { fullResult += content; controller.enqueue(encoder.encode(content)); }
					}
				} catch { controller.enqueue(encoder.encode('\n\n[生成出错]')); } finally {
					controller.close();
					try { await prisma.tailoredResume.create({ data: { resume, jd, result: fullResult } }); } catch {/* 静默 */ }
				}
			}
		});

		return new Response(readable, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
	} catch (err) {
		return new Response('服务器错误：' + (err instanceof Error ? err.message : String(err)), { status: 500 });
	}
}
