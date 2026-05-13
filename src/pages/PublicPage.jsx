import { useState, useEffect, useRef } from 'react'
import { api } from '../lib/api.js'

// Pie chart using SVG
function PieChart({ submitted, total }) {
  const pending = total - submitted
  const pct = total ? submitted / total : 0
  const r = 54, cx = 64, cy = 64, circ = 2 * Math.PI * r
  const dash = pct * circ
  return (
    <svg width="128" height="128" viewBox="0 0 128 128" style={{flexShrink:0}}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--red-bg)" strokeWidth="14"/>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--green)" strokeWidth="14"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={circ * 0.25}
        strokeLinecap="round"
        style={{transition:'stroke-dasharray 0.6s ease'}}
      />
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="18" fontWeight="700" fill="var(--text)" fontFamily="var(--font)">
        {Math.round(pct * 100)}%
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fill="var(--text2)" fontFamily="var(--font)">
        done
      </text>
    </svg>
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

  const total     = summaries.reduce((a,b) => a + b.total, 0)
  const submitted = summaries.reduce((a,b) => a + b.submitted, 0)
  const pct = total ? Math.round(submitted / total * 100) : 0

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
        <div style={{
          display:'inline-block',
          background:'var(--accent)',color:'#fff',
          fontSize:'0.65rem',fontWeight:700,letterSpacing:'0.14em',
          textTransform:'uppercase',padding:'5px 14px',borderRadius:99,
          marginBottom:16,fontFamily:'var(--mono)'
        }}>Dawratul Ilmiyya Alumni</div>
        <h1 style={{fontSize:'clamp(1.6rem,5vw,2.1rem)',letterSpacing:'-0.04em',lineHeight:1.15,marginBottom:10}}>
          Darul Irshad Academy<br/>
          <span style={{color:'var(--text2)',fontWeight:400,fontSize:'0.75em'}}>Complete Students Details</span>
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
              placeholder="e.g. 1042"
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

      {/* Overall stats + pie */}
      <div className="card" style={{marginBottom:20}}>
        <div style={{display:'flex',alignItems:'center',gap:20,flexWrap:'wrap'}}>
          <PieChart submitted={submitted} total={total} />
          <div style={{flex:1,minWidth:160}}>
            <div style={{fontSize:'0.7rem',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--text3)',fontFamily:'var(--mono)',marginBottom:12}}>Overall Progress</div>
            <div style={{display:'flex',gap:20,marginBottom:16,flexWrap:'wrap'}}>
              <div>
                <div style={{fontSize:'1.5rem',fontWeight:700,letterSpacing:'-0.04em',color:'var(--green)'}}>{submitted}</div>
                <div style={{fontSize:'0.7rem',color:'var(--text3)',fontFamily:'var(--mono)',textTransform:'uppercase',letterSpacing:'0.06em'}}>Submitted</div>
              </div>
              <div>
                <div style={{fontSize:'1.5rem',fontWeight:700,letterSpacing:'-0.04em'}}>{total}</div>
                <div style={{fontSize:'0.7rem',color:'var(--text3)',fontFamily:'var(--mono)',textTransform:'uppercase',letterSpacing:'0.06em'}}>Total</div>
              </div>
              <div>
                <div style={{fontSize:'1.5rem',fontWeight:700,letterSpacing:'-0.04em',color:'var(--red)'}}>{total-submitted}</div>
                <div style={{fontSize:'0.7rem',color:'var(--text3)',fontFamily:'var(--mono)',textTransform:'uppercase',letterSpacing:'0.06em'}}>Pending</div>
              </div>
            </div>
            <div className="track" style={{height:6}}>
              <div className={`fill ${pct>=80?'hi':pct>=50?'mid':'lo'}`} style={{width:pct+'%'}} />
            </div>
            <div style={{fontSize:'0.75rem',color:'var(--text3)',marginTop:6}}>{pct}% complete across {summaries.length} batches</div>
          </div>
        </div>
      </div>

      {/* Batch grid */}
      <div className="divider">
        <div className="divider-line"/><div className="divider-label">Batch Status</div><div className="divider-line"/>
      </div>

      {loadingBatch ? (
        <div style={{display:'flex',justifyContent:'center',padding:40}}><span className="spin"/></div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:10,marginBottom:24}}>
          {summaries.map(s => <BatchMiniCard key={s.batch} {...s} />)}
          {summaries.length === 0 && (
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
