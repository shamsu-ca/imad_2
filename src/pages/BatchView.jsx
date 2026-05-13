import { useState } from 'react'
import { api } from '../lib/api.js'

export default function BatchView({ data, onStudentSelect }) {
  const { batch, code, data: batchData } = data
  const { headers, students } = batchData

  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState('all')
  const [loading, setLoading] = useState(null)

  const phoneCol = headers?.find(h => h.toLowerCase().includes('phone')) || 'Phone Number'
  const nameCol  = headers?.find(h => h.toLowerCase() === 'name') || 'Name'
  const adCol    = headers?.[0] || 'Ad No'

  const submitted = students.filter(s => s._submitted)
  const pending   = students.filter(s => !s._submitted)
  const pct = students.length ? Math.round(submitted.length / students.length * 100) : 0

  const filtered = students.filter(s => {
    if (filter === 'submitted' && !s._submitted) return false
    if (filter === 'pending'   &&  s._submitted) return false
    const q = search.toLowerCase()
    if (!q) return true
    return String(s[adCol]).includes(q) || String(s[nameCol]).toLowerCase().includes(q) || String(s[phoneCol]||'').includes(q)
  })

  async function open(s) {
    setLoading(s[adCol])
    try {
      const fresh = await api.getStudent(s[adCol])
      if (fresh) onStudentSelect(fresh)
    } catch(e) { alert(e.message) }
    finally { setLoading(null) }
  }

  return (
    <div className="wrap" style={{paddingTop:20}}>
      {/* Header */}
      <div style={{marginBottom:20}}>
        <div style={{fontSize:'0.67rem',fontWeight:700,letterSpacing:'0.1em',color:'var(--text3)',fontFamily:'var(--mono)',textTransform:'uppercase',marginBottom:4}}>Batch Coordinator</div>
        <h1 style={{fontSize:'1.7rem',marginBottom:4}}>Batch {batch}</h1>
        <p style={{color:'var(--text2)',fontSize:'0.875rem'}}>{submitted.length} of {students.length} students have submitted</p>
      </div>

      {/* Stats */}
      <div className="card" style={{marginBottom:16}}>
        <div className="g3" style={{marginBottom:14}}>
          <div className="stat">
            <div className="stat-n" style={{color:'var(--green)'}}>{submitted.length}</div>
            <div className="stat-l">Submitted</div>
          </div>
          <div className="stat">
            <div className="stat-n" style={{color:'var(--red)'}}>{pending.length}</div>
            <div className="stat-l">Pending</div>
          </div>
          <div className="stat">
            <div className="stat-n" style={{color:pct>=80?'var(--green)':pct>=50?'var(--amber)':'var(--red)'}}>{pct}%</div>
            <div className="stat-l">Complete</div>
          </div>
        </div>
        <div className="track" style={{height:7}}>
          <div className={`fill ${pct>=80?'hi':pct>=50?'mid':'lo'}`} style={{width:pct+'%'}} />
        </div>
      </div>

      {/* Missing numbers */}
      {pending.length > 0 && (
        <div className="card" style={{marginBottom:16,background:'var(--red-bg)',border:'1px solid var(--red-bd)'}}>
          <div style={{fontSize:'0.67rem',fontWeight:700,color:'var(--red)',marginBottom:10,fontFamily:'var(--mono)',letterSpacing:'0.08em',textTransform:'uppercase'}}>
            Pending ({pending.length})
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
            {pending.map(s => (
              <button key={s[adCol]} onClick={() => open(s)} style={{
                fontFamily:'var(--mono)',fontSize:'0.78rem',
                background:'rgba(185,28,28,0.1)',border:'1px solid var(--red-bd)',
                borderRadius:6,padding:'4px 10px',cursor:'pointer',
                color:'var(--red)',fontWeight:500,transition:'all 0.12s',
              }}>#{s[adCol]}</button>
            ))}
          </div>
        </div>
      )}

      {/* Search + filter */}
      <div style={{display:'flex',gap:8,marginBottom:12}}>
        <input className="input" placeholder="Search name or ad no…" value={search} onChange={e=>setSearch(e.target.value)} style={{flex:1}} />
        <select className="select" value={filter} onChange={e=>setFilter(e.target.value)} style={{width:'auto',minWidth:118,flexShrink:0}}>
          <option value="all">All ({students.length})</option>
          <option value="submitted">Submitted ({submitted.length})</option>
          <option value="pending">Pending ({pending.length})</option>
        </select>
      </div>

      {/* List */}
      <div className="card" style={{padding:0,overflow:'hidden',marginBottom:32}}>
        {filtered.length === 0 ? (
          <div style={{padding:40,textAlign:'center',color:'var(--text3)',fontSize:'0.875rem'}}>No students match your filter.</div>
        ) : filtered.map((s,idx) => (
          <div
            key={s[adCol]}
            onClick={() => open(s)}
            style={{
              display:'flex',alignItems:'center',gap:12,padding:'12px 16px',
              borderBottom: idx < filtered.length-1 ? '1px solid var(--border)' : 'none',
              cursor:'pointer',transition:'background 0.1s',
            }}
            onMouseEnter={e => e.currentTarget.style.background='var(--bg)'}
            onMouseLeave={e => e.currentTarget.style.background=''}
          >
            {/* Avatar */}
            <div style={{
              width:38,height:38,borderRadius:'50%',flexShrink:0,
              background: s._submitted ? 'var(--green-bg)' : 'var(--red-bg)',
              border: `1.5px solid ${s._submitted?'var(--green-bd)':'var(--red-bd)'}`,
              display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:'0.8rem',fontWeight:700,
              color: s._submitted ? 'var(--green)' : 'var(--red)',
              overflow:'hidden',
            }}>
              {s._photoUrl
                ? <img src={s._photoUrl} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="" />
                : (s[nameCol]||'?')[0]?.toUpperCase()
              }
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:600,fontSize:'0.9rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s[nameCol]||'—'}</div>
              <div style={{fontSize:'0.75rem',color:'var(--text2)',fontFamily:'var(--mono)'}}>
                #{s[adCol]} {s[phoneCol] ? '· '+s[phoneCol] : '· no phone'}
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
              <span className={`badge ${s._submitted?'badge-green':'badge-red'}`}>
                {s._submitted?'✓':'●'}
              </span>
              {loading === s[adCol] ? <span className="spin" style={{width:14,height:14}}/> : <span style={{color:'var(--text3)',fontSize:'0.8rem'}}>→</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
