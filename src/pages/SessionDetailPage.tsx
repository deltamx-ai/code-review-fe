import { useParams } from 'react-router-dom'

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>()
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <h2 className="text-lg font-semibold text-slate-900">会话详情 · {id}</h2>
        <p className="mt-3 text-sm text-slate-500">
          这个页面将在下一阶段（F6–F11）落地：消息时间线、轮次摘要、findings 列表、聊天式追问 + 模型切换。
        </p>
      </section>
    </div>
  )
}
