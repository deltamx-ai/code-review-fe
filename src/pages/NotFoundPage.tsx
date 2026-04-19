export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h2 className="text-2xl font-semibold text-slate-900">页面不存在</h2>
      <p className="mt-3 text-sm text-slate-600">你访问的路径在这个前端里没有对应页面。</p>
      <a href="/" className="mt-6 inline-block rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
        返回单轮 Review
      </a>
    </div>
  )
}
