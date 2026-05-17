import { useState } from 'react'
import { api } from '../lib/api.js'

function getMaxBatch() {
  return parseInt(localStorage.getItem('imad_max_batch') || '18') || 18
}

export default function Topbar({ view, onHome, onBatch, onAdmin }) {
  const [modal,   setModal]   = useState(null)
  const [batch,   setBatch]   = useState('')
  const [code,    setCode]    = useState('')
  const [pass,    setPass]    = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const close = () => { setModal(null); setError(''); setBatch(''); setCode(''); setPass(''); }

  async function submitBatch(e) {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const valid = await api.validateBatch(batch, code)
      if (!valid) { setError('Invalid code. Please check and retry.'); return }
      const data = await api.getBatchStudents(batch, code)
      close(); onBatch({ batch, code, data })
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function submitAdmin(e) {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const valid = await api.validateAdmin(pass)
      if (!valid) { setError('Incorrect password.'); return }
      close(); onAdmin(pass)
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }

  // Show batch/admin buttons only on the public landing page and dashboard views
  const showDashboardButtons = view === 'public'
  const maxBatch = getMaxBatch()
  const batchOptions = Array.from({ length: maxBatch }, (_, i) => i + 1)

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <button className="logo-mark" onClick={onHome}>
            <div className="logo-icon">
              <img src="/logo.svg" alt="IMAD" style={{width:18,height:18,objectFit:'contain'}} onError={e=>{e.target.style.display='none'}} />
            </div>
            <span className="logo-text">IMAD</span>
          </button>
          {view !== 'public' && (
            <span className="topbar-title">
              {view === 'student' && 'Alumni Record'}
              {view === 'batch'   && 'Batch View'}
              {view === 'admin'   && 'Admin Dashboard'}
            </span>
          )}
          <div className="topbar-spacer" />
          <div className="topbar-actions">
            {showDashboardButtons && (
              <>
                <button className="btn btn-ghost btn-sm" onClick={() => setModal('batch')}>Batch</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setModal('admin')}>Admin</button>
              </>
            )}
            {view !== 'public' && (
              <button className="btn btn-outline btn-sm" onClick={onHome}>← Home</button>
            )}
          </div>
        </div>
      </header>

      {modal && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && close()}>
          <div className="overlay-panel">
            <div className="drag-handle" />
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <h2 style={{fontSize:'1.1rem'}}>
                {modal === 'batch' ? 'Batch Access' : 'Admin Login'}
              </h2>
              <button className="btn btn-ghost" onClick={close} style={{height:32,padding:'0 8px'}}>✕</button>
            </div>

            {modal === 'batch' && (
              <form onSubmit={submitBatch} style={{display:'flex',flexDirection:'column',gap:14}}>
                <div className="field">
                  <label className="label">Batch Number</label>
                  <select className="select" value={batch} onChange={e=>setBatch(e.target.value)} required>
                    <option value="">Select batch…</option>
                    {batchOptions.map(n=>(
                      <option key={n} value={n}>Batch {n}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="label">Access Code</label>
                  <input className="input" type="password" value={code} onChange={e=>setCode(e.target.value)} required autoComplete="off" />
                </div>
                {error && <div className="alert alert-error">{error}</div>}
                <button className="btn btn-primary btn-full" type="submit" disabled={loading} style={{marginTop:4}}>
                  {loading ? <><span className="spin spin-sm spin-white"/>Verifying…</> : 'Access Batch →'}
                </button>
              </form>
            )}

            {modal === 'admin' && (
              <form onSubmit={submitAdmin} style={{display:'flex',flexDirection:'column',gap:14}}>
                <div className="field">
                  <label className="label">Admin Password</label>
                  <input className="input" type="password" value={pass} onChange={e=>setPass(e.target.value)} required autoFocus />
                </div>
                {error && <div className="alert alert-error">{error}</div>}
                <button className="btn btn-primary btn-full" type="submit" disabled={loading} style={{marginTop:4}}>
                  {loading ? <><span className="spin spin-sm spin-white"/>Checking…</> : 'Login →'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
