'use client'; // 用 useEffect 和 useState，所以是客户端组件

import Link from 'next/link';
import { useEffect, useState } from 'react';

type ReportSummary = { id: number; fileName: string; createdAt: string };

export default function HistoryPage() {
	const [reports, setReports] = useState<ReportSummary[]>([]);
	const [loading, setLoading] = useState(true);

	// useEffect：在组件挂载后执行（浏览器端），发起请求取数据
	useEffect(() => {
		fetch('/api/reports')
			.then(r => r.json())
			.then(setReports)
			.catch(() => alert('加载历史记录失败'))
			.finally(() => setLoading(false));
	}, []); // 空数组 [] = 只在首次挂载时执行一次

	return (
		<main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-12 px-4">
			<div className="max-w-2xl mx-auto">
				<div className="flex items-center justify-between mb-6">
					<h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">历史记录</h1>
					<Link href="/" className="text-blue-600 hover:underline text-sm">
						← 返回首页
					</Link>
				</div>

				{loading ? (
					<p className="text-zinc-500">加载中…</p>
				) : reports.length === 0 ? (
					<div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center">
						<p className="text-zinc-500">还没有上传过报告</p>
						<Link href="/" className="mt-3 inline-block text-blue-600 hover:underline">
							去上传 →
						</Link>
					</div>
				) : (
					<div className="space-y-3">
						{reports.map(r => (
							<div
								key={r.id}
								className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 flex items-center justify-between"
							>
								<div>
									<p className="font-medium text-zinc-900 dark:text-zinc-50">{r.fileName}</p>
									<p className="text-sm text-zinc-500">
										{new Date(r.createdAt).toLocaleString('zh-CN')}
									</p>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</main>
	);
}
