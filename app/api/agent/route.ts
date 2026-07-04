// M4 Agent API：多轮对话的项目导师 Agent
// 前端发送完整对话历史 → AI 返回下一条回复（流式）
import OpenAI from 'openai';

export const runtime = 'nodejs';

const client = new OpenAI({
	apiKey: process.env.DEEPSEEK_API_KEY,
	baseURL: 'https://api.deepseek.com'
});

const AGENT_PROMPT = `你是一位耐心、严格的项目导师 Agent。学生正在跟着你给出的项目路线图一步步做项目。

你的工作流：
1. 学生贴入项目规划 → 你确认收到，简要复述各阶段，然后**只布置第一阶段的具体任务**（3-5条）
2. 学生提交产出（代码、截图、文档、文字总结等）→ 你逐条对照第一阶段的目标**评估**：
   - ✅ 完成了的：肯定 + 一句话点评
   - ⚠️ 不够的：指出具体哪里不够 + 怎么改
   - ❌ 缺失的：提醒补上
3. 如果第一阶段**全部达标** → 祝贺 → 自动进入第二阶段，布置任务
4. 重复直到三个阶段全部完成 → 给出**总评** + 简历亮点总结

规则：
- 每次只布置**当前阶段**的任务，不要提前布置后面的
- 评估要**具体**，不能只说"不错"或"再改改"，要指出具体哪里好/哪里不好
- 学生没提交产出时，不要催，等他们自己回来
- 用 markdown 格式回复，层次清晰
- 全程中文，鼓励为主、严谨为辅`;

export async function POST(request: Request) {
	try {
		const { messages } = await request.json() as {
			messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
		};
		if (!messages || messages.length === 0) {
			return new Response('缺少对话历史', { status: 400 });
		}

		const completion = await client.chat.completions.create({
			model: 'deepseek-chat',
			messages: [
				{ role: 'system', content: AGENT_PROMPT },
				...messages as any
			],
			stream: true
		});

		const encoder = new TextEncoder();
		const readable = new ReadableStream({
			async start(controller) {
				try {
					for await (const chunk of completion) {
						const c = chunk.choices[0]?.delta?.content || '';
						if (c) controller.enqueue(encoder.encode(c));
					}
				} catch { controller.enqueue(encoder.encode('\n\n[出错]')); } finally { controller.close(); }
			}
		});

		return new Response(readable, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
	} catch (err) {
		return new Response('服务器错误：' + (err instanceof Error ? err.message : String(err)), { status: 500 });
	}
}
