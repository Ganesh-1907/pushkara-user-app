import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronRight } from 'lucide-react'
import { useDb } from '../data/store'
import { Badge, Card, Empty, Page, condTone, inputCls, Chips } from '../components/ui'
import { timeAgo } from '../lib/utils'

export default function AssetsPage() {
  const db = useDb(); const nav = useNavigate()
  const [q, setQ] = useState(''); const [ghat, setGhat] = useState('all'); const [cond, setCond] = useState('All')
  const list = db.assets.filter(a =>
    (ghat === 'all' || a.ghatId === ghat) && (cond === 'All' || a.condition === cond) &&
    (`${a.id} ${a.type}`.toLowerCase().includes(q.toLowerCase())))
  return (
    <Page title="Assets">
      <div className="relative">
        <Search size={18} className="absolute left-3 top-3.5 text-gray-400" />
        <input className={`${inputCls} pl-10`} placeholder="Search ID or type" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <select className={inputCls} value={ghat} onChange={e => setGhat(e.target.value)} aria-label="Filter by ghat">
        <option value="all">All ghats</option>
        {db.ghats.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
      </select>
      <Chips value={cond} options={['All', 'Good', 'Fair', 'Poor', 'Damaged']} onChange={setCond} />
      <p className="text-xs text-gray-500">{list.length} assets · sample data</p>
      {list.length === 0 ? <Empty title="No assets match" hint="Try clearing the filters." /> : (
        <div className="space-y-2">
          {list.map(a => (
            <Card key={a.id} onClick={() => nav(`/assets/${a.id}`)} className="!p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2"><span className="font-semibold">{a.type}</span><Badge tone={condTone(a.condition)}>{a.condition}</Badge></div>
                <p className="text-xs text-gray-500 mt-0.5">{a.id} · {db.ghats.find(g => g.id === a.ghatId)?.name} · verified {timeAgo(a.lastVerified)}</p>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </Card>
          ))}
        </div>
      )}
    </Page>
  )
}
