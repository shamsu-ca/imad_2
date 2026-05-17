import { useState, useEffect, useRef } from 'react'
import { api } from '../lib/api.js'

// Radial fan / arc gauge — clickable to reveal count details
function RadialGauge({ submitted, total }) {
  const [open, setOpen] = useState(false)
  const pct   = total ? submitted / total : 0
  const pctN  = Math.round(pct * 100)
  const r     = 60, cx = 90, cy = 90
  const C     = 2 * Math.PI * r          // full circumference
  const arc   = 0.75 * C                 // 270° visible arc
  const filled = pct * arc
  const color  = pct >= 0.8 ? 'var(--green)' : pct >= 0.5 ? 'var(--amber)' : 'var(--red)'

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:0}}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{cursor:'pointer',userSelect:'none',WebkitTapHighlightColor:'transparent'}}
        title="Tap to see details"
      >
        <svg width="180" height="155" viewBox="0 0 180 155">
          {/* Background track arc */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none" stroke="var(--bg2)" strokeWidth={14}
            strokeDasharray={`${arc} ${C - arc}`}
            strokeLinecap="round"
            transform={`rotate(135 ${cx} ${cy})`}
          />
          {/* Progress arc */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none" stroke={color} strokeWidth={14}
            strokeDasharray={`${filled} ${C - filled}`}
            strokeLinecap="round"
            transform={`rotate(135 ${cx} ${cy})`}
            style={{transition:'stroke-dasharray 0.8s cubic-bezier(.4,0,.2,1)'}}
          />
          {/* Percentage label */}
          <text x={cx} y={cy - 8} textAnchor="middle" fontSize="26" fontWeight="700"
            fill="var(--text)" fontFamily="var(--font)">
            {pctN}%
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle" fontSize="11" fill="var(--text3)"
            fontFamily="var(--font)">
            overall
          </text>
          {/* Tap hint arc bottom */}
          <text x={cx} y={138} textAnchor="middle" fontSize="10" fill="var(--text3)"
            fontFamily="var(--font)" opacity="0.7">
            {open ? 'tap to close' : 'tap for details'}
          </text>
        </svg>
      </div>

      {open && (
        <div className="fade" style={{
          display:'flex',gap:24,justifyContent:'center',
          background:'var(--surface)',border:'1px solid var(--border)',
          borderRadius:'var(--r)',padding:'12px 24px',marginTop:4,
        }}>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:'1.4rem',fontWeight:700,color:'var(--green)',letterSpacing:'-0.04em'}}>{submitted}</div>
            <div style={{fontSize:'0.65rem',fontWeight:700,color:'var(--text3)',fontFamily:'var(--mono)',textTransform:'uppercase',letterSpacing:'0.06em',marginTop:2}}>Submitted</div>
          </div>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:'1.4rem',fontWeight:700,letterSpacing:'-0.04em'}}>{total}</div>
            <div style={{fontSize:'0.65rem',fontWeight:700,color:'var(--text3)',fontFamily:'var(--mono)',textTransform:'uppercase',letterSpacing:'0.06em',marginTop:2}}>Total</div>
          </div>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:'1.4rem',fontWeight:700,color:'var(--red)',letterSpacing:'-0.04em'}}>{total - submitted}</div>
            <div style={{fontSize:'0.65rem',fontWeight:700,color:'var(--text3)',fontFamily:'var(--mono)',textTransform:'uppercase',letterSpacing:'0.06em',marginTop:2}}>Pending</div>
          </div>
        </div>
      )}
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

  const total     = visible.reduce((a,b) => a + b.total, 0)
  const submitted = visible.reduce((a,b) => a + b.submitted, 0)

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
          <span style={{color:'var(--text2)',fontWeight:400,fontSize:'0.65em'}}>Student Details Collection</span>
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

      {/* Radial gauge */}
      {!loadingBatch && visible.length > 0 && (
        <div style={{display:'flex',justifyContent:'center',marginBottom:20}}>
          <RadialGauge submitted={submitted} total={total} />
        </div>
      )}

      {/* Batch grid */}
      <div className="divider">
        <div className="divider-line"/>
        <div className="divider-label">Batch Status</div>
        <div className="divider-line"/>
      </div>

      {loadingBatch ? (
        <div style={{display:'flex',justifyContent:'center',padding:40}}><span className="spin"/></div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:10,marginBottom:24}}>
          {visible.map(s => <BatchMiniCard key={s.batch} {...s} />)}
          {visible.length === 0 && (
            <div style={{gridColumn:'1/-1',textAlign:'center',color:'var(--text3)',padding:48,fontSize:'0.875rem'}}>
              No batch data available yet.
            </div>
          )}
        </div>
      )}

      <p style={{textAlign:'center',fontSize:'0.72rem',color:'var(--text3)',paddingBottom:16}}>
        Live data · Refreshes on page load · Contact your coordinator for help
      </p>
    </div>
  )
}
