import { useQuery } from '@tanstack/react-query'
import { ArrowDownRight } from 'lucide-react'
import { api } from './api'

export default function App() {
  const health = useQuery({ queryKey: ['health'], queryFn: ({ signal }) => api.health(signal) })
  return <main className="foundation"><span className="brand"><ArrowDownRight /> PriceLedger</span><h1>Understand the price.<br />Before you pay it.</h1><p>Price history, exact product comparisons, and evidence behind the deal.</p><div role="status">{health.isPending ? 'Connecting…' : health.isError ? 'The comparison service is unavailable. Start the API to connect.' : 'Your comparison workspace is connected.'}</div><small>Development preview · no live retailer prices yet</small></main>
}
