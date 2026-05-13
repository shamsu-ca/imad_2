import { useState } from 'react'
import { api } from '../lib/api.js'

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

  return (
    <>
      <header className="topbar">
        <div class="topbar-inner">
          <button className="logo-mark" onClick={onHome}>
            <div className="logo-icon">
              <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            </div>
            <span className="logo-text">DIA</span>
          </button>
          {view !== 'public' && (
            <span className="topbar-title">
              {view === 'student' && 'Student Record'}
              {view === 'batch'   && 'Batch View'}
              {view === 'admin'   && 'Admin Dashboard'}
            </span>
          )}
          <div className="topbar-spacer" />
          <div className="topbar-actions">
            {view !== 'batch' && view !== 'admin' && (
              <button className="btn btn-ghost btn-sm" onClick={() => setModal('batch')}>Batch</button>
            )}
            {view !== 'admin' && (
              <button className="btn btn-ghost btn-sm" onClick={() => setModal('admin')}>Admin</button>
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
                    {Array.from({length:18},(_,i)=>i+1).map(n=>(
                      <option key={n} value={n}>Batch {n}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="label">Access Code</label>
                  <input className="input" type="password" placeholder="Enter batch access code" value={code} onChange={e=>setCode(e.target.value)} required autoComplete="off" />
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
                  <input className="input" type="password" placeholder="Enter admin password" value={pass} onChange={e=>setPass(e.target.value)} required autoFocus />
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
