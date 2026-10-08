import { useQuery } from '@tanstack/react-query'
import { ArrowDownRight } from 'lucide-react'

export default function App() {
  const health = useQuery({ queryKey: ['health'], queryFn: async () => {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api/v1'}/health`)
    if (!response.ok) throw new Error('Service unavailable')
    return response.json() as Promise<{ status: string; demo_mode: boolean }>
  } })
  return <main className="foundation"><span className="brand"><ArrowDownRight /> PriceLedger</span><h1>Understand the price.<br />Before you pay it.</h1><p>Price history, exact product comparisons, and evidence behind the deal.</p><div role="status">{health.isPending ? 'Connecting…' : health.isError ? 'The comparison service is unavailable. Start the API to connect.' : 'Your comparison workspace is connected.'}</div><small>Development preview · no live retailer prices yet</small></main>
}
