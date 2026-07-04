'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';

type Msg = { role: 'user' | 'assistant'; content: string };

export default function AgentPage() {
	const [plan, setPlan] = useState('');                    // 用户贴入的项目规划
	const [started, setStarted] = useState(false);           // 是否已开始会话
	const [messages, setMessages] = useState<Msg[]>([]);     // 对话历史
	const [input, setInput] = useState('');                  // 当前输入
	const [loading, setLoading] = useState(false);
	const chatEndRef = useRef<HTMLDivElement>(null);

	// === 开始会话：贴入项目规划，Agent 初始化 ===
	async function handleStart() {
		if (!plan.trim()) return alert('请先粘贴项目规划');
		setStarted(true); setLoading(true);
		const userMsg: Msg = { role: 'user', content: '这是我的项目规划，请帮我一步步完成：\n\n' + plan };
		setMessages([userMsg]);
		await sendToAgent([userMsg]);
		setLoading(false);
	}

	// === 提交用户回复 ===
	async function handleSubmit() {
		if (!input.trim()) return;
		const userMsg: Msg = { role: 'user', content: input };
		const newMsgs = [...messages, userMsg];
		setMessages(newMsgs); setInput(''); setLoading(true);
		await sendToAgent(newMsgs);
		setLoading(false);
	}

	// === 发送消息给 Agent，流式接收回复 ===
	async function sendToAgent(msgs: Msg[]) {
		try {
			const res = await fetch('/api/agent', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ messages: msgs })
			});
			if (!res.ok || !res.body) throw new Error(await res.text());
			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let text = '';
			// 先加一个空的 assistant 消息，流式填充
			setMessages([...msgs, { role: 'assistant', content: '' }]);
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				text += decoder.decode(value);
				setMessages([...msgs, { role: 'assistant', content: text }]);
			}
		} catch (e) {
			setMessages(prev => [...prev, { role: 'assistant', content: '❌ 出错了：' + (e instanceof Error ? e.message : String(e)) }]);
		}
	}

	return (
		<main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-12 px-4">
			<div className="max-w-2xl mx-auto">
				<div className="flex items-center justify-between mb-6">
					<h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
						🤖 项目导师 Agent
					</h1>
					<Link href="/" className="text-blue-600 hover:underline text-sm">← 首页</Link>
				</div>
				<p className="text-zinc-600 dark:text-zinc-400 mb-8">
					把 M2b 生成的路线图贴进来，Agent 带你按阶段完成项目。做完一阶段贴产出 → Agent 评估 → 进入下一阶段。
				</p>

				{/* 未开始时：贴规划 */}
				{!started && (
					<div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
						<label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
							粘贴你的项目路线图（从 M2b「详细规划」复制）
						</label>
						<textarea
							value={plan} onChange={e => setPlan(e.target.value)}
							rows={12}
							placeholder="从项目升级器的规划结果中，复制含「分阶段路线图」部分的完整内容粘贴到这里…"
							className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-green-500 focus:ring-1 focus:ring-green-500 resize-y"
						/>
						<button
							onClick={handleStart}
							className="mt-4 w-full rounded-lg bg-green-600 px-4 py-2.5 text-white font-medium hover:bg-green-700 transition-colors"
						>
							开始 → Agent 带我一步步做
						</button>
					</div>
				)}

				{/* 已开始：对话区 */}
				{started && (
					<>
						{/* 对话历史 */}
						<div className="space-y-4 mb-6">
							{messages.map((m, i) => (
								<div key={i} className={`rounded-xl p-4 ${m.role === 'user' ? 'bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 ml-8' : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 mr-8'}`}>
									<p className="text-xs font-medium text-zinc-400 mb-1">
										{m.role === 'user' ? '🧑 你' : '🤖 Agent 导师'}
									</p>
									<pre className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300 font-sans">
										{m.content || (loading && i === messages.length - 1 ? '思考中…' : '')}
									</pre>
								</div>
							))}
							<div ref={chatEndRef} />
						</div>

						{/* 输入区 */}
						<div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
							<textarea
								value={input} onChange={e => setInput(e.target.value)}
								rows={3}
								placeholder="贴入你的产出（代码片段、截图描述、完成情况总结…）"
								onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
								className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-green-500 focus:ring-1 focus:ring-green-500 resize-y"
							/>
							<button
								onClick={handleSubmit}
								disabled={loading || !input.trim()}
								className="mt-3 w-full rounded-lg bg-green-600 px-4 py-2 text-white font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								{loading ? 'Agent 思考中…' : '提交产出'}
							</button>
							<p className="text-xs text-zinc-400 mt-2">Enter 发送，Shift+Enter 换行</p>
						</div>
					</>
				)}
			</div>
		</main>
	);
}
