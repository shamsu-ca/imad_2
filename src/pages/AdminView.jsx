import { useState, useEffect, useMemo } from 'react'
import { api } from '../lib/api.js'

// Radial fan gauge (shared with PublicPage)
function RadialGauge({ submitted, total }) {
  const [open, setOpen] = useState(false)
  const pct   = total ? submitted / total : 0
  const pctN  = Math.round(pct * 100)
  const r     = 54, cx = 80, cy = 80
  const C     = 2 * Math.PI * r
  const arc   = 0.75 * C
  const filled = pct * arc
  const color  = pct >= 0.8 ? 'var(--green)' : pct >= 0.5 ? 'var(--amber)' : 'var(--red)'

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{cursor:'pointer',userSelect:'none'}}
      >
        <svg width="160" height="140" viewBox="0 0 160 140">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg2)" strokeWidth={13}
            strokeDasharray={`${arc} ${C - arc}`} strokeLinecap="round"
            transform={`rotate(135 ${cx} ${cy})`} />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={13}
            strokeDasharray={`${filled} ${C - filled}`} strokeLinecap="round"
            transform={`rotate(135 ${cx} ${cy})`}
            style={{transition:'stroke-dasharray 0.8s cubic-bezier(.4,0,.2,1)'}} />
          <text x={cx} y={cy - 6} textAnchor="middle" fontSize="22" fontWeight="700"
            fill="var(--text)" fontFamily="var(--font)">{pctN}%</text>
          <text x={cx} y={cy + 13} textAnchor="middle" fontSize="10" fill="var(--text3)"
            fontFamily="var(--font)">tap for details</text>
        </svg>
      </div>
      {open && (
        <div className="fade" style={{
          display:'flex',gap:24,justifyContent:'center',
          background:'var(--surface)',border:'1px solid var(--border)',
          borderRadius:'var(--r)',padding:'10px 24px',marginTop:2,
        }}>
          {[
            {n: submitted,         l:'Submitted', c:'var(--green)'},
            {n: total,             l:'Total',     c:'var(--text)'},
            {n: total - submitted, l:'Pending',   c:'var(--red)'},
          ].map(s => (
            <div key={s.l} style={{textAlign:'center'}}>
              <div style={{fontSize:'1.3rem',fontWeight:700,color:s.c,letterSpacing:'-0.04em'}}>{s.n}</div>
              <div style={{fontSize:'0.65rem',fontWeight:700,color:'var(--text3)',fontFamily:'var(--mono)',textTransform:'uppercase',letterSpacing:'0.06em',marginTop:2}}>{s.l}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Edit popup ────────────────────────────────────────────────
function EditPopup({ student, headers, onSave, onClose }) {
  const [vals, setVals] = useState({...student})
  const [saving, setSaving] = useState(false)
  const adCol = headers[0]

  const editableHeaders = headers.filter((h,i) => i > 3 && !h.startsWith('_'))

  async function save() {
    setSaving(true)
    try {
      const editable = {}
      editableHeaders.forEach(h => { editable[h] = vals[h] || '' })
      await api.updateRow(vals[adCol], editable)
      await api.markSubmitted(vals[adCol])
      onSave({...vals}, true)
    } catch(e) { alert(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="overlay-panel" style={{maxWidth:600}}>
        <div className="drag-handle"/>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <div>
            <h2 style={{fontSize:'1rem'}}>Edit Alumni</h2>
            <div style={{fontSize:'0.78rem',color:'var(--text2)',fontFamily:'var(--mono)'}}>#{vals[adCol]} · {vals[headers[1]]}</div>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{height:32,padding:'0 8px'}}>✕</button>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:12,maxHeight:'60dvh',overflowY:'auto',paddingRight:4}}>
          {/* Read-only strip */}
          <div className="card card-sm" style={{background:'var(--bg2)',border:'1px dashed var(--border2)'}}>
            <div style={{fontSize:'0.67rem',fontWeight:700,color:'var(--text3)',fontFamily:'var(--mono)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>Pre-filled (read-only)</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:8}}>
              {headers.slice(0,4).map(h => (
                <div key={h}>
                  <div style={{fontSize:'0.67rem',color:'var(--text3)',fontFamily:'var(--mono)',marginBottom:2}}>{h}</div>
                  <div style={{fontSize:'0.85rem',fontWeight:500}}>{vals[h]||'—'}</div>
                </div>
              ))}
            </div>
          </div>

          {editableHeaders.map(h => (
            <div className="field" key={h}>
              <label className="label">{h}</label>
              <input
                className="input"
                value={vals[h]||''}
                onChange={e => setVals(v => ({...v, [h]: e.target.value}))}
              />
            </div>
          ))}
        </div>

        <div style={{display:'flex',gap:10,marginTop:20}}>
          <button className="btn btn-outline" onClick={onClose} style={{flex:1}}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving} style={{flex:2}}>
            {saving ? <><span className="spin spin-sm spin-white"/>Saving…</> : 'Save & Mark Submitted'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Batch Visibility Settings ─────────────────────────────────
function BatchSettings({ batches, currentMax, onSave }) {
  const maxAvailable = batches.length > 0
    ? Math.max(...batches.map(b => parseInt(b.batch) || 0))
    : 16
  const [val, setVal] = useState(currentMax || 16)
  const [saved, setSaved] = useState(false)

  const allStudents   = batches.reduce((a,b) => a + b.total, 0)
  const selected      = batches.filter(b => (parseInt(b.batch) || 0) <= val)
  const rangeStudents = selected.reduce((a,b) => a + b.total, 0)
  const rangePct      = allStudents ? Math.round(rangeStudents / allStudents * 100) : 100

  const allSubmitted   = batches.reduce((a,b) => a + b.submitted, 0)
  const rangeSubmitted = selected.reduce((a,b) => a + b.submitted, 0)
  const submitPct      = rangeStudents ? Math.round(rangeSubmitted / rangeStudents * 100) : 0

  function save() {
    onSave(val)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="fade">
      <div className="sec-head" style={{marginBottom:10}}>
        <span className="sec-num">01</span>
        <span className="sec-label">Active Batch Range</span>
      </div>
      <div className="card" style={{marginBottom:20}}>
        <p style={{fontSize:'0.85rem',color:'var(--text2)',marginBottom:18}}>
          Set how many batches are visible on the public page and batch selector. Batches above this number will be hidden from students and coordinators.
        </p>
        <div className="field" style={{marginBottom:16}}>
          <label className="label">Show batches 1 to {val} · {rangeStudents} students ({rangePct}% of total)</label>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <input
              type="range" min={1} max={maxAvailable}
              value={val}
              onChange={e => setVal(parseInt(e.target.value))}
              style={{flex:1, accentColor:'var(--accent)'}}
            />
            <div style={{
              minWidth:48,height:40,borderRadius:'var(--r-sm)',
              background:'var(--accent)',color:'#fff',
              display:'flex',alignItems:'center',justifyContent:'center',
              fontFamily:'var(--mono)',fontWeight:700,fontSize:'1.1rem',
            }}>
              {val}
            </div>
          </div>
        </div>
        <div className="card card-sm" style={{background:'var(--bg2)',marginBottom:16}}>
          <div style={{display:'flex',gap:24,alignItems:'center',flexWrap:'wrap'}}>
            <div>
              <div style={{fontSize:'0.67rem',fontWeight:700,color:'var(--text3)',fontFamily:'var(--mono)',textTransform:'uppercase',letterSpacing:'0.06em'}}>Total students</div>
              <div style={{fontSize:'1.4rem',fontWeight:700,letterSpacing:'-0.03em'}}>{rangeStudents}</div>
            </div>
            <div>
              <div style={{fontSize:'0.67rem',fontWeight:700,color:'var(--text3)',fontFamily:'var(--mono)',textTransform:'uppercase',letterSpacing:'0.06em'}}>% of all students</div>
              <div style={{fontSize:'1.4rem',fontWeight:700,letterSpacing:'-0.03em',color:'var(--accent)'}}>{rangePct}%</div>
            </div>
            <div>
              <div style={{fontSize:'0.67rem',fontWeight:700,color:'var(--text3)',fontFamily:'var(--mono)',textTransform:'uppercase',letterSpacing:'0.06em'}}>Submitted</div>
              <div style={{fontSize:'1.4rem',fontWeight:700,letterSpacing:'-0.03em',color:'var(--green)'}}>{rangeSubmitted} <span style={{fontSize:'0.85rem',fontWeight:500,color:'var(--text3)'}}>({submitPct}%)</span></div>
            </div>
          </div>
        </div>
        <button className="btn btn-primary" onClick={save} style={{width:'100%',height:44}}>
          {saved ? '✓ Saved — applied' : 'Save Setting'}
        </button>
      </div>

      <div className="sec-head" style={{marginBottom:10}}>
        <span className="sec-num">02</span>
        <span className="sec-label">Batch Preview</span>
      </div>
      <div className="card" style={{padding:0,overflow:'hidden',marginBottom:32}}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Batch</th>
              <th>Students</th>
              <th>Visible</th>
            </tr>
          </thead>
          <tbody>
            {batches.map(b => {
              const visible = (parseInt(b.batch) || 0) <= val
              return (
                <tr key={b.batch}>
                  <td style={{fontFamily:'var(--mono)',fontWeight:600}}>Batch {b.batch}</td>
                  <td style={{fontFamily:'var(--mono)'}}>{b.total}</td>
                  <td>
                    <span className={`badge ${visible ? 'badge-green' : 'badge-gray'}`}>
                      {visible ? '✓ Visible' : 'Hidden'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main AdminView ────────────────────────────────────────────
export default function AdminView({ password, onStudentSelect, maxBatch, onMaxBatchChange }) {
  const [stats,    setStats]   = useState(null)
  const [allData,  setAllData] = useState(null)
  const [loading,  setLoading] = useState(true)
  const [tab,      setTab]     = useState('overview')
  const [error,    setError]   = useState('')

  // Complete data tab state
  const [search,   setSearch]  = useState('')
  const [batchF,   setBatchF]  = useState('')
  const [statusF,  setStatusF] = useState('')
  const [sort,     setSort]    = useState({key:null, dir:1})
  const [editing,  setEditing] = useState(null)
  const [csvMsg,   setCsvMsg]  = useState('')

  // Overview sort
  const [ovSort,   setOvSort]  = useState({key:'batch',dir:1})

  useEffect(() => {
    Promise.all([
      api.getAdminStats(password),
      api.getAllStudents(password),
    ]).then(([s, d]) => { setStats(s); setAllData(d) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [password])

  const downloadCSV = async () => {
    setCsvMsg('Generating…')
    try {
      const csv = await api.exportCSV(password)
      const blob = new Blob([csv], {type:'text/csv'})
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `IMAD_Students_${new Date().toISOString().slice(0,10)}.csv`
      a.click()
      setCsvMsg('Downloaded!')
    } catch(e) { setCsvMsg('Error: ' + e.message) }
    setTimeout(() => setCsvMsg(''), 3000)
  }

  const filteredStudents = useMemo(() => {
    if (!allData) return []
    const { headers, students } = allData
    const phCol = headers.find(h => h.toLowerCase().includes('phone')) || 'Phone Number'
    const nmCol = headers.find(h => h.toLowerCase() === 'name') || 'Name'
    const btCol = headers.find(h => h.toLowerCase() === 'batch') || 'Batch'

    let list = [...students]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(s =>
        String(s[headers[0]]).includes(q) ||
        String(s[nmCol]).toLowerCase().includes(q) ||
        String(s[phCol]||'').includes(q)
      )
    }
    if (batchF) list = list.filter(s => String(s[btCol]).trim() === batchF)
    if (statusF === 'submitted') list = list.filter(s => s._submitted)
    if (statusF === 'pending')   list = list.filter(s => !s._submitted)

    if (sort.key) {
      list.sort((a,b) => {
        const av = String(a[sort.key]||'').toLowerCase()
        const bv = String(b[sort.key]||'').toLowerCase()
        const an = parseFloat(av), bn = parseFloat(bv)
        const cmp = (!isNaN(an) && !isNaN(bn)) ? an-bn : av<bv?-1:av>bv?1:0
        return sort.dir * cmp
      })
    }
    return list
  }, [allData, search, batchF, statusF, sort])

  const sortedBatches = useMemo(() => {
    if (!stats) return []
    return [...stats.batches].sort((a,b) => {
      const av = ovSort.key === 'pct' ? (a.total?a.submitted/a.total:0) : (parseInt(a[ovSort.key])||0)
      const bv = ovSort.key === 'pct' ? (b.total?b.submitted/b.total:0) : (parseInt(b[ovSort.key])||0)
      return ovSort.dir * (av < bv ? -1 : av > bv ? 1 : 0)
    })
  }, [stats, ovSort])

  const fieldEntries = useMemo(() => {
    if (!stats?.fieldRates) return []
    return Object.entries(stats.fieldRates).sort((a,b) => a[1].pct - b[1].pct)
  }, [stats])

  const allMissing = useMemo(() => {
    if (!stats) return []
    return stats.batches.flatMap(b => b.missingAdNos.map(n => ({batch:b.batch, adNo:n})))
  }, [stats])

  const batchOptions = useMemo(() => {
    if (!stats) return []
    return stats.batches.map(b => b.batch)
  }, [stats])

  function SortTh({label, k, col}) {
    const active = (col === 'ov' ? ovSort : sort).key === k
    const dir    = (col === 'ov' ? ovSort : sort).dir
    const toggle = () => {
      if (col === 'ov') setOvSort(s => s.key===k?{key:k,dir:-s.dir}:{key:k,dir:1})
      else setSort(s => s.key===k?{key:k,dir:-s.dir}:{key:k,dir:1})
    }
    return <th onClick={toggle}>{label} {active ? (dir>0?'↑':'↓') : <span style={{opacity:0.3}}>↕</span>}</th>
  }

  function updateLocal(updated, wasSubmitted) {
    setAllData(prev => {
      if (!prev) return prev
      const students = prev.students.map(s =>
        s[prev.headers[0]] === updated[prev.headers[0]]
          ? { ...updated, _submitted: wasSubmitted ?? s._submitted, _rowIndex: s._rowIndex }
          : s
      )
      return { ...prev, students }
    })
    setEditing(null)
  }

  if (loading) return <div style={{display:'flex',justifyContent:'center',paddingTop:80}}><span className="spin"/></div>
  if (error)   return <div className="wrap" style={{paddingTop:40}}><div className="alert alert-error">{error}</div></div>

  const { totalStudents, totalSubmitted } = stats

  const TABS = [
    {id:'overview',  label:'Overview'},
    {id:'analytics', label:'Analytics'},
    {id:'complete',  label:'Complete Data'},
    {id:'settings',  label:'Settings'},
  ]

  return (
    <div className="wrap" style={{paddingTop:20}}>
      <div style={{marginBottom:16}}>
        <div style={{fontSize:'0.67rem',fontWeight:700,letterSpacing:'0.1em',color:'var(--text3)',fontFamily:'var(--mono)',textTransform:'uppercase',marginBottom:4}}>Admin</div>
        <h1 style={{fontSize:'1.6rem',marginBottom:0}}>Dashboard</h1>
      </div>

      {/* Radial gauge */}
      <div style={{display:'flex',justifyContent:'center',marginBottom:16}}>
        <RadialGauge submitted={totalSubmitted} total={totalStudents} />
      </div>

      {/* Tabs */}
      <div className="tabs">
        {TABS.map(t => (
          <button key={t.id} className={`tab ${tab===t.id?'active':''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === 'overview' && (
        <div className="fade">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <span style={{fontSize:'0.82rem',fontWeight:600}}>All batches</span>
            <button className="btn btn-outline btn-sm" onClick={downloadCSV} disabled={!!csvMsg}>
              {csvMsg || '↓ Export CSV'}
            </button>
          </div>
          <div className="card" style={{padding:0,overflow:'hidden',marginBottom:32}}>
            <div style={{overflowX:'auto'}}>
              <table className="tbl">
                <thead>
                  <tr>
                    <SortTh label="Batch"     k="batch"     col="ov"/>
                    <SortTh label="Submitted" k="submitted" col="ov"/>
                    <SortTh label="Total"     k="total"     col="ov"/>
                    <SortTh label="%"         k="pct"       col="ov"/>
                    <th>Progress</th>
                    <th>Missing Nos.</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedBatches.map(b => {
                    const pct = b.total ? Math.round(b.submitted/b.total*100) : 0
                    return (
                      <tr key={b.batch}>
                        <td><span style={{fontFamily:'var(--mono)',fontWeight:700}}>Batch {b.batch}</span></td>
                        <td style={{color:'var(--green)',fontWeight:600}}>{b.submitted}</td>
                        <td style={{color:'var(--text2)'}}>{b.total}</td>
                        <td><span style={{fontFamily:'var(--mono)',fontWeight:700,color:pct>=80?'var(--green)':pct>=50?'var(--amber)':'var(--red)'}}>{pct}%</span></td>
                        <td style={{width:90}}>
                          <div className="track" style={{height:4}}>
                            <div className={`fill ${pct>=80?'hi':pct>=50?'mid':'lo'}`} style={{width:pct+'%'}} />
                          </div>
                        </td>
                        <td>
                          {b.missingAdNos?.length > 0
                            ? <span style={{fontSize:'0.72rem',color:'var(--red)',fontFamily:'var(--mono)'}}>
                                {b.missingAdNos.slice(0,4).join(', ')}{b.missingAdNos.length>4?` +${b.missingAdNos.length-4}`:''}
                              </span>
                            : <span style={{fontSize:'0.72rem',color:'var(--green)'}}>None</span>
                          }
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── ANALYTICS TAB ── */}
      {tab === 'analytics' && (
        <div className="fade">
          <div className="sec-head" style={{marginBottom:10}}>
            <span className="sec-num">01</span>
            <span className="sec-label">Missing Admission Numbers</span>
          </div>
          <div className="card" style={{marginBottom:20}}>
            {allMissing.length === 0 ? (
              <div className="alert alert-success">No gaps found — all admission number sequences are complete ✓</div>
            ) : (
              <>
                <div style={{fontSize:'0.78rem',color:'var(--text2)',marginBottom:12}}>{allMissing.length} gap{allMissing.length>1?'s':''} found across all batches</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                  {allMissing.map((m,i) => (
                    <span key={i} className="badge badge-amber" style={{fontFamily:'var(--mono)'}}>
                      B{m.batch}: #{m.adNo}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="sec-head" style={{marginBottom:10}}>
            <span className="sec-num">02</span>
            <span className="sec-label">Field Fill Rates</span>
          </div>
          <div className="card" style={{padding:0,overflow:'hidden',marginBottom:32}}>
            {fieldEntries.length === 0 ? (
              <div style={{padding:32,textAlign:'center',color:'var(--text3)'}}>No field data yet.</div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Filled</th>
                    <th>%</th>
                    <th>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {fieldEntries.map(([field, rate]) => (
                    <tr key={field}>
                      <td style={{fontSize:'0.82rem',maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{field}</td>
                      <td style={{fontFamily:'var(--mono)',fontSize:'0.78rem',color:'var(--text2)'}}>{rate.filled}/{rate.total}</td>
                      <td><span style={{fontFamily:'var(--mono)',fontWeight:700,fontSize:'0.8rem',color:rate.pct>=80?'var(--green)':rate.pct>=50?'var(--amber)':'var(--red)'}}>{rate.pct}%</span></td>
                      <td style={{width:90}}>
                        <div className="track" style={{height:4}}>
                          <div className={`fill ${rate.pct>=80?'hi':rate.pct>=50?'mid':'lo'}`} style={{width:rate.pct+'%'}} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── COMPLETE DATA TAB ── */}
      {tab === 'complete' && (
        <div className="fade">
          <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
            <input
              className="input"
              placeholder="Search name, ad no, phone…"
              value={search}
              onChange={e=>setSearch(e.target.value)}
              style={{flex:1,minWidth:160}}
            />
            <select className="select" value={batchF} onChange={e=>setBatchF(e.target.value)} style={{width:'auto',minWidth:110}}>
              <option value="">All batches</option>
              {batchOptions.map(b=><option key={b} value={b}>Batch {b}</option>)}
            </select>
            <select className="select" value={statusF} onChange={e=>setStatusF(e.target.value)} style={{width:'auto',minWidth:110}}>
              <option value="">All status</option>
              <option value="submitted">Submitted</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <span style={{fontSize:'0.78rem',color:'var(--text2)',fontFamily:'var(--mono)'}}>
              {filteredStudents.length} of {allData?.students?.length} students
            </span>
            <button className="btn btn-outline btn-sm" onClick={downloadCSV} disabled={!!csvMsg}>{csvMsg||'↓ CSV'}</button>
          </div>

          <div className="card" style={{padding:0,overflow:'hidden',marginBottom:32}}>
            <div style={{overflowX:'auto'}}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{cursor:'default',width:44,textAlign:'center'}}>Photo</th>
                    <SortTh label="Ad No"   k={allData?.headers?.[0]}                                             col="cd"/>
                    <SortTh label="Name"    k={allData?.headers?.find(h=>h.toLowerCase()==='name')}               col="cd"/>
                    <SortTh label="Batch"   k={allData?.headers?.find(h=>h.toLowerCase()==='batch')}              col="cd"/>
                    <SortTh label="Phone"   k={allData?.headers?.find(h=>h.toLowerCase().includes('phone'))}      col="cd"/>
                    <th>Status</th>
                    <th style={{width:60}}>Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 && (
                    <tr><td colSpan={7} style={{textAlign:'center',padding:32,color:'var(--text3)'}}>No students match.</td></tr>
                  )}
                  {filteredStudents.map(s => {
                    const adCol = allData.headers[0]
                    const nmCol = allData.headers.find(h=>h.toLowerCase()==='name')||'Name'
                    const btCol = allData.headers.find(h=>h.toLowerCase()==='batch')||'Batch'
                    const phCol = allData.headers.find(h=>h.toLowerCase().includes('phone'))||'Phone Number'
                    return (
                      <tr key={s[adCol]} onClick={() => setEditing(s)}>
                        <td style={{textAlign:'center',padding:'8px 6px'}}>
                          <div style={{
                            width:30,height:30,borderRadius:'50%',
                            background: s._submitted?'var(--green-bg)':'var(--red-bg)',
                            border:`1px solid ${s._submitted?'var(--green-bd)':'var(--red-bd)'}`,
                            display:'flex',alignItems:'center',justifyContent:'center',
                            margin:'0 auto',overflow:'hidden',
                            fontSize:'0.75rem',fontWeight:700,
                            color:s._submitted?'var(--green)':'var(--red)',
                          }}>
                            {s._photoUrl
                              ? <img src={s._photoUrl} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="" />
                              : (s[nmCol]||'?')[0]?.toUpperCase()
                            }
                          </div>
                        </td>
                        <td style={{fontFamily:'var(--mono)',fontWeight:600,fontSize:'0.82rem'}}>{s[adCol]}</td>
                        <td style={{fontWeight:500,maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s[nmCol]||'—'}</td>
                        <td style={{fontFamily:'var(--mono)',fontSize:'0.82rem'}}>B{s[btCol]}</td>
                        <td style={{fontFamily:'var(--mono)',fontSize:'0.8rem',color:s[phCol]?'var(--green)':'var(--red)'}}>
                          {s[phCol]||'—'}
                        </td>
                        <td>
                          <span className={`badge ${s._submitted?'badge-green':'badge-red'}`}>
                            {s._submitted?'✓ Done':'● Pending'}
                          </span>
                        </td>
                        <td onClick={e=>{e.stopPropagation();setEditing(s)}}>
                          <button className="btn btn-outline btn-xs">Edit</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── SETTINGS TAB ── */}
      {tab === 'settings' && (
        <BatchSettings batches={stats.batches} currentMax={maxBatch} onSave={onMaxBatchChange} />
      )}

      {/* Edit popup */}
      {editing && (
        <EditPopup
          student={editing}
          headers={allData.headers.filter(h => !h.startsWith('_'))}
          onSave={updateLocal}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
