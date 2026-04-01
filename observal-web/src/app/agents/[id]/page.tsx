'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user, loading } = useAuth()
  const router = useRouter()
  const [agent, setAgent] = useState<any>(null)
  const [summary, setSummary] = useState<any>(null)
  const [feedback, setFeedback] = useState<any[]>([])
  const [ide, setIde] = useState('kiro')
  const [snippet, setSnippet] = useState('')
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [showPrompt, setShowPrompt] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (!loading && !user) router.replace('/login') }, [user, loading, router])

  useEffect(() => {
    if (!user || !id) return
    api.get(`/api/v1/agents/${id}`).then(setAgent).catch(() => {})
    api.get(`/api/v1/feedback/summary/${id}`).then(setSummary).catch(() => {})
    api.get(`/api/v1/feedback/agent/${id}`).then(setFeedback).catch(() => {})
  }, [user, id])

  const handleInstall = async () => {
    try {
      const res = await api.post(`/api/v1/agents/${id}/install`, { ide })
      setSnippet(JSON.stringify(res.config_snippet, null, 2))
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Install failed') }
  }

  const handleFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/api/v1/feedback', { listing_id: id, listing_type: 'agent', rating, comment })
      setComment('')
      api.get(`/api/v1/feedback/agent/${id}`).then(setFeedback)
      api.get(`/api/v1/feedback/summary/${id}`).then(setSummary)
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Feedback failed') }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this agent? This cannot be undone.')) return
    try {
      await api.del(`/api/v1/agents/${id}`)
      router.push('/agents')
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Delete failed') }
  }

  if (loading || !user || !agent) return null
  const canDelete = user.role === 'admin' || agent.created_by === user.id

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">{agent.name} <span className="text-lg text-gray-500 font-normal">v{agent.version}</span></h1>
        {canDelete && <button onClick={handleDelete} className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700">Delete</button>}
      </div>
      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

      <p className="text-sm text-gray-500 mb-4">by {agent.owner} · {agent.model_name}</p>
      <p className="text-gray-700 mb-4">{agent.description}</p>
      {agent.supported_ides?.length > 0 && (
        <div className="flex gap-1 mb-4">{agent.supported_ides.map((i: string) => <span key={i} className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded">{i}</span>)}</div>
      )}

      <div className="mb-4">
        <button onClick={() => setShowPrompt(!showPrompt)} className="text-blue-600 text-sm hover:underline">{showPrompt ? 'Hide' : 'Show'} System Prompt</button>
        {showPrompt && <pre className="bg-gray-100 rounded p-3 text-sm mt-2 whitespace-pre-wrap">{agent.prompt}</pre>}
      </div>

      {agent.mcp_links?.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="font-semibold mb-2">Linked MCP Servers</h2>
          <ul className="text-sm space-y-1">
            {agent.mcp_links.map((m: any, i: number) => (
              <li key={i}>
                <Link href={`/mcps/${m.mcp_listing_id}`} className="text-blue-600 hover:underline">{m.mcp_name || m.mcp_listing_id}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {agent.goal_template && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="font-semibold mb-2">Goal Template</h2>
          <p className="text-sm text-gray-700 mb-2">{agent.goal_template.description}</p>
          {agent.goal_template.sections?.map((s: any, i: number) => (
            <div key={i} className="border-l-2 border-blue-200 pl-3 mb-2 text-sm">
              <span className="font-medium">{s.name}</span>
              {s.grounding_required && <span className="ml-2 bg-yellow-100 text-yellow-700 text-xs px-1.5 py-0.5 rounded">grounding required</span>}
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="font-semibold mb-3">Install</h2>
        <div className="flex gap-2 mb-3">
          <select value={ide} onChange={e => setIde(e.target.value)} className="border rounded px-3 py-2 text-sm">
            {['cursor', 'kiro', 'claude-code', 'gemini-cli', 'vscode'].map(i => <option key={i} value={i}>{i}</option>)}
          </select>
          <button onClick={handleInstall} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm">Get Config</button>
        </div>
        {snippet && (
          <div className="relative">
            <pre className="bg-gray-900 text-green-400 p-3 rounded text-sm overflow-x-auto">{snippet}</pre>
            <button onClick={() => navigator.clipboard.writeText(snippet).catch(() => {})} className="absolute top-2 right-2 bg-gray-700 text-white text-xs px-2 py-1 rounded hover:bg-gray-600">Copy</button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="font-semibold mb-3">Feedback</h2>
        {summary && <p className="text-sm text-gray-600 mb-3">Average: {summary.average_rating?.toFixed(1)} ⭐ ({summary.total_reviews} reviews)</p>}
        <form onSubmit={handleFeedback} className="flex gap-2 mb-4">
          <select value={rating} onChange={e => setRating(Number(e.target.value))} className="border rounded px-2 py-1 text-sm">
            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} ⭐</option>)}
          </select>
          <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Comment…" className="border rounded px-3 py-1 flex-1 text-sm" />
          <button type="submit" className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 text-sm">Submit</button>
        </form>
        <div className="space-y-2">
          {feedback.map((f, i) => (
            <div key={i} className="border-b pb-2 text-sm">
              <span className="font-medium">{f.rating} ⭐</span> <span className="text-gray-600">{f.comment}</span>
            </div>
          ))}
        </div>
      </div>

      <Link href={`/agents/${id}/eval`} className="text-blue-600 hover:underline text-sm">View Evaluation Dashboard →</Link>
    </div>
  )
}
