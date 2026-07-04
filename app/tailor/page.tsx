'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function TailorPage() {
	const [resume, setResume] = useState('');
	const [jd, setJd] = useState('');
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState('');

	async function handleTailor() {
		if (!resume.trim()) return alert('请粘贴简历内容');
		if (!jd.trim()) return alert('请粘贴岗位 JD');
		setLoading(true); setResult('');

		try {
			const res = await fetch('/api/tailor', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ resume, jd })
			});
			if (!res.ok || !res.body) { setResult('请求失败：' + await res.text()); return; }
			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let text = '';
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				text += decoder.decode(value);
				setResult(text);
			}
		} catch (e) {
			setResult('出错了：' + (e instanceof Error ? e.message : String(e)));
		} finally { setLoading(false); }
	}

	return (
		<main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-12 px-4">
			<div className="max-w-2xl mx-auto">
				<div className="flex items-center justify-between mb-6">
					<h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
						📄 岗位定制简历
					</h1>
					<div className="flex gap-4">
						<Link href="/tailor" className="text-blue-600 font-medium text-sm">岗位定制</Link>
						<Link href="/" className="text-blue-600 hover:underline text-sm">← 项目升级器</Link>
					</div>
				</div>
				<p className="text-zinc-600 dark:text-zinc-400 mb-8">
					粘贴你的简历和目标岗位 JD，AI 分析岗位需求并输出针对性调整后的简历
				</p>

				{/* 简历输入 */}
				<div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
					<label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
						你的简历
					</label>
					<textarea
						value={resume} onChange={e => setResume(e.target.value)}
						rows={10}
						placeholder="粘贴你的简历内容…
例如：&#10;张三 | 3年Java开发经验 | 某大学计算机本科&#10;● 参与XX电商系统后端开发，负责订单模块…&#10;● 使用Spring Boot + MySQL 开发了…"
						className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-y"
					/>
				</div>

				{/* JD 输入 */}
				<div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
					<label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
						目标岗位 JD
					</label>
					<textarea
						value={jd} onChange={e => setJd(e.target.value)}
						rows={10}
						placeholder="粘贴目标岗位的招聘需求…
例如：&#10;【岗位】Java后端开发工程师&#10;【要求】3年以上Java开发经验，熟悉Spring Boot、MySQL…"
						className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-y"
					/>

					<button
						onClick={handleTailor}
						disabled={loading}
						className="mt-4 w-full rounded-lg bg-purple-600 px-4 py-2.5 text-white font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						{loading ? 'AI 正在优化简历…' : '生成定制简历'}
					</button>
				</div>

				{/* 结果 */}
				{result && (
					<div className="bg-white dark:bg-zinc-900 rounded-xl border border-purple-200 dark:border-purple-800 p-6 mb-6">
						<h2 className="text-lg font-semibold text-purple-700 dark:text-purple-400 mb-3">
							✨ 优化结果
						</h2>
						<pre className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300 font-sans">
							{result}
						</pre>
					</div>
				)}
			</div>
		</main>
	);
}
