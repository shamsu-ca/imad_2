import { useState, useEffect, useRef } from 'react'
import { api } from '../lib/api.js'

// Double radar chart — click to toggle batch cards
function RadarChart({ batches, onClick, open }) {
  if (!batches || batches.length === 0) return null
  const sorted = [...batches].sort((a,b) => (parseInt(a.batch)||0)-(parseInt(b.batch)||0))
  const N = sorted.length
  if (N < 3) return null

  const SIZE = 300, cx = SIZE / 2, cy = SIZE / 2, R = 100
  const maxVal = Math.max(...sorted.map(b => b.total), 1)
  const total     = batches.reduce((a,b) => a + b.total, 0)
  const submitted = batches.reduce((a,b) => a + b.submitted, 0)
  const pct = total ? Math.round(submitted / total * 100) : 0

  const ang = i => (2 * Math.PI * i / N) - Math.PI / 2
  const coord = (val, i, extra = 0) => {
    const r = (val / maxVal) * R + extra
    return [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))]
  }
  const poly = vals => vals.map((v, i) => coord(v, i).join(',')).join(' ')
  const rings = [0.25, 0.5, 0.75, 1.0]
  const ringPoly = r => sorted.map((_, i) => {
    const rv = r * R
    return `${cx + rv * Math.cos(ang(i))},${cy + rv * Math.sin(ang(i))}`
  }).join(' ')

  return (
    <div
      onClick={onClick}
      style={{cursor:'pointer',userSelect:'none',WebkitTapHighlightColor:'transparent'}}
    >
      <svg width="100%" viewBox={`0 0 ${SIZE} ${SIZE}`} style={{display:'block',maxWidth:SIZE,margin:'0 auto'}}>
        {rings.map(r => (
          <polygon key={r} points={ringPoly(r)}
            fill="none" stroke="var(--border)" strokeWidth={r === 1 ? 0.8 : 0.4} opacity={0.7} />
        ))}
        {rings.map(r => {
          const val = Math.round(r * maxVal)
          return <text key={r} x={cx + 3} y={cy - r * R - 2}
            fontSize="8" fill="var(--text3)" fontFamily="var(--mono)">{val}</text>
        })}
        {sorted.map((_, i) => {
          const [x, y] = coord(maxVal, i)
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y}
            stroke="var(--border)" strokeWidth={0.4} />
        })}
        <polygon points={poly(sorted.map(b => b.total))}
          fill="rgba(59,130,246,0.1)" stroke="#3b82f6" strokeWidth={1.5} strokeLinejoin="round" />
        <polygon points={poly(sorted.map(b => b.submitted))}
          fill="rgba(249,115,22,0.12)" stroke="#f97316" strokeWidth={1.5} strokeLinejoin="round" />
        {sorted.map((b, i) => {
          const [x, y] = coord(maxVal, i, 14)
          return <text key={i} x={x} y={y}
            textAnchor="middle" dominantBaseline="middle"
            fontSize="9" fill="var(--text3)" fontFamily="var(--mono)">B{b.batch}</text>
        })}
        {/* Centre summary */}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="18" fontWeight="700"
          fill="var(--text)" fontFamily="var(--font)">{pct}%</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill="var(--text3)"
          fontFamily="var(--font)">overall</text>
      </svg>

      {/* Legend + tap hint */}
      <div style={{display:'flex',gap:16,justifyContent:'center',marginTop:4}}>
        {[{color:'#3b82f6',label:'Total'},{color:'#f97316',label:'Submitted'}].map(l => (
          <div key={l.label} style={{display:'flex',alignItems:'center',gap:6}}>
            <div style={{width:20,height:2,background:l.color,borderRadius:1}} />
            <span style={{fontSize:'0.72rem',color:'var(--text3)',fontFamily:'var(--mono)'}}>{l.label}</span>
          </div>
        ))}
      </div>
      <div style={{textAlign:'center',marginTop:6,fontSize:'0.72rem',color:'var(--text3)',fontFamily:'var(--mono)'}}>
        {open ? 'tap to hide batch details' : 'tap to show batch details'}
      </div>
    </div>
  )
}

function BatchMiniCard({ batch, submitted, total }) {
  const pct = total ? Math.round(submitted / total * 100) : 0
  const cls = pct >= 100 ? 'hi' : pct >= 50 ? 'mid' : 'lo'
  const color = pct >= 100 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : 'var(--red)'
  return (
    <div className="card card-sm" style={{padding:'12px 14px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
        <div>
          <div style={{fontSize:'0.62rem',fontWeight:600,letterSpacing:'0.08em',color:'var(--text3)',fontFamily:'var(--mono)',textTransform:'uppercase'}}>Batch</div>
          <div style={{fontSize:'1.05rem',fontWeight:700,letterSpacing:'-0.03em'}}>{batch}</div>
        </div>
        <div style={{fontSize:'0.92rem',fontWeight:700,color,letterSpacing:'-0.02em'}}>{pct}%</div>
      </div>
      <div className="track" style={{marginBottom:6}}>
        <div className={`fill ${cls}`} style={{width:pct+'%'}} />
      </div>
      <div style={{fontSize:'0.7rem',color:'var(--text3)',fontFamily:'var(--mono)'}}>{submitted}/{total}</div>
    </div>
  )
}

function getMaxBatch() {
  return parseInt(localStorage.getItem('imad_max_batch') || '0') || 0
}

export default function PublicPage({ onStudentFound }) {
  const [summaries, setSummaries]   = useState([])
  const [loadingBatch, setLoadingB] = useState(true)
  const [showCards, setShowCards]   = useState(false)
  const [adNo,  setAdNo]   = useState('')
  const [busy,  setBusy]   = useState(false)
  const [err,   setErr]    = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    api.getBatchSummaries()
      .then(setSummaries)
      .catch(console.error)
      .finally(() => setLoadingB(false))
    setTimeout(() => inputRef.current?.focus(), 300)
  }, [])

  const maxBatch = getMaxBatch()
  const visible = maxBatch > 0
    ? summaries.filter(s => parseInt(s.batch) <= maxBatch)
    : summaries

  async function handleSearch(e) {
    e.preventDefault()
    if (!adNo.trim()) return
    setBusy(true); setErr('')
    try {
      const data = await api.getStudent(adNo.trim())
      if (!data) { setErr(`No record found for admission number ${adNo}.`); return }
      onStudentFound(data)
    } catch(e) { setErr(e.message) }
    finally { setBusy(false) }
  }

  return (
    <div className="wrap" style={{paddingTop:28}}>

      {/* Hero */}
      <div style={{textAlign:'center',marginBottom:28}}>
        <div style={{marginBottom:16}}>
          <img src="/logo.svg" alt="IMAD" style={{width:56,height:56,objectFit:'contain'}}
            onError={e=>{e.target.style.display='none'}} />
        </div>
        <h1 style={{fontSize:'clamp(1.6rem,5vw,2.1rem)',letterSpacing:'-0.04em',lineHeight:1.15,marginBottom:10}}>
          IMAD
          <br/>
          <span style={{color:'var(--text2)',fontWeight:400,fontSize:'0.65em'}}>Alumni Details Collection</span>
        </h1>
        <p style={{color:'var(--text2)',fontSize:'0.9rem',maxWidth:340,margin:'0 auto'}}>
          Enter your admission number to view and update your personal record.
        </p>
      </div>

      {/* Search */}
      <div className="card" style={{marginBottom:24}}>
        <form onSubmit={handleSearch} style={{display:'flex',flexDirection:'column',gap:12}}>
          <div className="field">
            <label className="label">Admission Number</label>
            <input
              ref={inputRef}
              className="input"
              type="number" inputMode="numeric"
              value={adNo}
              onChange={e => { setAdNo(e.target.value); setErr(''); }}
              style={{fontSize:'1.6rem',textAlign:'center',letterSpacing:'0.06em',fontFamily:'var(--mono)',fontWeight:500,height:58}}
            />
          </div>
          {err && <div className="alert alert-error">{err}</div>}
          <button className="btn btn-primary btn-full" type="submit" disabled={busy || !adNo.trim()} style={{height:46}}>
            {busy
              ? <><span className="spin spin-sm spin-white"/>Searching…</>
              : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg> Find my record</>
            }
          </button>
        </form>
      </div>

      {/* Radar chart — click to toggle batch cards */}
      {loadingBatch ? (
        <div style={{display:'flex',justifyContent:'center',padding:40}}><span className="spin"/></div>
      ) : visible.length > 0 ? (
        <>
          <div className="card" style={{marginBottom:showCards ? 12 : 24}}>
            <RadarChart
              batches={visible}
              open={showCards}
              onClick={() => setShowCards(o => !o)}
            />
          </div>

          {showCards && (
            <div className="fade" style={{
              display:'grid',
              gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',
              gap:10,marginBottom:24,
            }}>
              {visible.map(s => <BatchMiniCard key={s.batch} {...s} />)}
            </div>
          )}
        </>
      ) : null}

      <p style={{textAlign:'center',fontSize:'0.72rem',color:'var(--text3)',paddingBottom:16}}>
        Contact your coordinator for help · contact office{' '}
        <a href="tel:9847423646" style={{color:'var(--text2)',textDecoration:'none',fontFamily:'var(--mono)'}}>9847423646</a>
      </p>
    </div>
  )
}
