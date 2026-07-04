'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';

export default function Home() {
	// 第1步：上传 + 生成方向
	const [file, setFile] = useState<File | null>(null);
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState('');

	// 第2步：选方向 + 出规划
	const [direction, setDirection] = useState('');         // 用户粘贴的方向描述
	const [planLoading, setPlanLoading] = useState(false);  // 规划生成中
	const [planResult, setPlanResult] = useState('');       // AI 返回的规划

	// 用 ref 保存文件引用（第2步需要重新上传），因为 file state 可能被用户换了
	const fileRef = useRef<File | null>(null);

	// === 第1步：生成项目方向 ===
	async function handleGenerate() {
		if (!file) { alert('请先选择实验报告文件'); return; }
		fileRef.current = file;  // 保存引用，第2步用
		setLoading(true);
		setResult(''); setPlanResult(''); setDirection('');

		try {
			const formData = new FormData();
			formData.append('file', file);
			const res = await fetch('/api/extend', { method: 'POST', body: formData });
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

	// === 第2步：生成详细规划 + 路线图 ===
	async function handleGeneratePlan() {
		if (!direction.trim()) { alert('请先粘贴你想做的项目方向'); return; }
		if (!fileRef.current) { alert('请先上传报告生成方向'); return; }
		setPlanLoading(true);
		setPlanResult('');

		try {
			// 把文件 + 选中的方向一起发给后端
			const formData = new FormData();
			formData.append('file', fileRef.current);
			formData.append('direction', direction);
			const res = await fetch('/api/plan', { method: 'POST', body: formData });
			if (!res.ok || !res.body) { setPlanResult('请求失败：' + await res.text()); return; }
			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let text = '';
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				text += decoder.decode(value);
				setPlanResult(text);
			}
		} catch (e) {
			setPlanResult('出错了：' + (e instanceof Error ? e.message : String(e)));
		} finally { setPlanLoading(false); }
	}

	// === 第3步：一键填入方向（点击方向卡片自动填入 textarea） ===
	function pickDirection(text: string) {
		setDirection(text);
		// 滚动到规划区
		document.getElementById('plan-section')?.scrollIntoView({ behavior: 'smooth' });
	}

	return (
		<main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-12 px-4">
			<div className="max-w-2xl mx-auto">
				{/* 标题区 */}
				<div className="flex items-center justify-between mb-2">
					<h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
						实验报告 → 完整项目升级器
					</h1>
					<div className="flex gap-4">
					<Link href="/agent" className="text-green-600 hover:underline text-sm whitespace-nowrap font-medium">
						🤖 Agent 导师 →
					</Link>
					<Link href="/tailor" className="text-purple-600 hover:underline text-sm whitespace-nowrap font-medium">
						📄 岗位定制 →
					</Link>
					<Link href="/history" className="text-blue-600 hover:underline text-sm whitespace-nowrap">
						历史记录 →
					</Link>
				</div>
				</div>
				<p className="text-zinc-600 dark:text-zinc-400 mb-8">
					上传报告（.doc / .docx / .md / .txt），AI 延伸为简历级项目方向 → 选一个 → 出完整规划
				</p>

				{/* 上传卡片 */}
				<div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
					<label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
						选择实验报告（.doc / .docx / .md / .txt）
					</label>
					<input
						type="file" accept=".doc,.docx,.md,.txt"
						onChange={e => setFile(e.target.files?.[0] ?? null)}
						className="block w-full text-sm text-zinc-600 dark:text-zinc-400 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-white hover:file:bg-blue-700 cursor-pointer"
					/>
					{file && <p className="mt-3 text-sm text-green-600">已选择：{file.name}</p>}
					<button
						onClick={handleGenerate}
						disabled={loading}
						className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						{loading ? 'AI 正在分析报告…' : '第1步 · 生成项目方向'}
					</button>
				</div>

				{/* 第1步结果：项目方向列表 */}
				{result && (
					<div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
						<h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
							💡 AI 生成的项目方向
						</h2>
						<p className="text-sm text-zinc-500 mb-4">
							看看哪个方向适合你，点击方向名快速选择 → 然后出详细规划
						</p>
						{/* 方向关键词 —— 从 markdown 中提取"方向 N："作为快捷选择按钮 */}
						<div className="flex flex-wrap gap-2 mb-4">
							{extractDirections(result).map((d, i) => (
								<button
									key={i}
									onClick={() => pickDirection(d.title + '\n' + d.desc.slice(0, 300))}
									className="text-left px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900 text-sm transition-colors"
								>
									<span className="font-medium text-blue-700 dark:text-blue-300">{d.title}</span>
									<span className="text-zinc-500 ml-2">{d.desc.slice(0, 80)}…</span>
								</button>
							))}
						</div>
						<details>
							<summary className="text-sm text-blue-600 cursor-pointer hover:underline">
								查看完整分析结果
							</summary>
							<pre className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300 font-sans mt-2 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg max-h-96 overflow-y-auto">
								{result}
							</pre>
						</details>
					</div>
				)}

				{/* 第2步：选方向 + 出规划 */}
				{result && (
					<div id="plan-section" className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
						<h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
							📐 第2步 · 生成详细规划
						</h2>
						<label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
							把你选中的项目方向粘贴到下面（可编辑调整）
						</label>
						<textarea
							value={direction}
							onChange={e => setDirection(e.target.value)}
							rows={4}
							placeholder="从上方的方向列表中选一个，粘贴到这里…&#10;&#10;例如：&#10;方向 1：智能花卉识别与移动端辅助应用&#10;- 简介：开发一个Web应用，用户上传花卉图片，AI自动识别种类和位置…"
							className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
						/>
						<button
							onClick={handleGeneratePlan}
							disabled={planLoading}
							className="mt-3 w-full rounded-lg bg-green-600 px-4 py-2.5 text-white font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{planLoading ? 'AI 正在生成规划…' : '第2步 · 生成详细规划 + 路线图'}
						</button>
					</div>
				)}

				{/* 第2步结果：详细规划 */}
				{planResult && (
					<div className="bg-white dark:bg-zinc-900 rounded-xl border border-green-200 dark:border-green-800 p-6 mb-6">
						<h2 className="text-lg font-semibold text-green-700 dark:text-green-400 mb-3">
							📋 完整项目方案与路线图
						</h2>
						<pre className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300 font-sans">
							{planResult}
						</pre>
					</div>
				)}
			</div>
		</main>
	);
}

// 从 AI 返回的 markdown 中提取方向标题和简介
function extractDirections(md: string): { title: string; desc: string }[] {
	const dirs: { title: string; desc: string }[] = [];
	const lines = md.split('\n');
	let currentTitle = '';
	let currentDesc = '';
	let inDirection = false;
	for (const line of lines) {
		if (/^##\s+方向\s*\d/.test(line) || /^###\s+方向\s*\d/.test(line)) {
			if (currentTitle) dirs.push({ title: currentTitle, desc: currentDesc.trim() });
			currentTitle = line.replace(/^#+\s*/, '');
			currentDesc = '';
			inDirection = true;
		} else if (inDirection && /^##\s+/.test(line)) {
			// 新的章节（不是方向），结束当前方向
			if (currentTitle) dirs.push({ title: currentTitle, desc: currentDesc.trim() });
			currentTitle = '';
			currentDesc = '';
			inDirection = false;
		} else if (inDirection && currentTitle && currentDesc.length < 300) {
			currentDesc += line.replace(/^[-*]\s+/, '').trim() + ' ';
		}
	}
	if (currentTitle) dirs.push({ title: currentTitle, desc: currentDesc.trim() });
	return dirs;
}
