import { useState } from 'react'
import { api } from '../lib/api.js'
import PhotoUpload from '../components/PhotoUpload.jsx'

const READONLY = ['ad no', 'adno', 'name', 'ad. year', 'year', 'batch']
const isRO = f => READONLY.some(r =>
  f.toLowerCase().replace(/[.\s]/g,'') === r.replace(/[.\s]/g,'') || f.toLowerCase() === r
)

const DH_OPTS = [
  {value:'',label:'Select status…'},
  {value:'PG Completed',     label:'PG Completed'},
  {value:'UG Completed',     label:'UG Completed'},
  {value:'Not completed UG', label:'Not completed UG'},
]
const DESIGNATIONS = ['Qatheeb','Muallim','Arabic College','Teacher (School)','College Professor','Translator','Typing','Other']
const EMP_OPTS = [
  {value:'Self-employed', emoji:'🏢', label:'Self-employed / Entrepreneur'},
  {value:'Employed',      emoji:'💼', label:'Employed'},
  {value:'Higher Studies',emoji:'🎓', label:'Higher Studies'},
]

const STEPS = [
  { id: 1, label: 'Personal' },
  { id: 2, label: 'Academic' },
  { id: 3, label: 'Employment' },
]

// TF and SF are defined OUTSIDE the component so React never remounts them on re-render
function TF({ vals, set, label, field, type='text', inputMode, hint }) {
  const ro = isRO(field)
  return (
    <div className="field">
      <label className="label">
        <span className={ro ? 'label-ro' : ''}>{label}</span>
      </label>
      <input
        className={`input ${ro ? 'ro' : ''}`}
        type={type} inputMode={inputMode}
        value={vals[field] ?? ''}
        readOnly={ro}
        onChange={ro ? undefined : e => set(field, e.target.value)}
      />
      {hint && <span style={{fontSize:'0.72rem',color:'var(--text3)'}}>{hint}</span>}
    </div>
  )
}

function SF({ vals, set, label, field, options }) {
  return (
    <div className="field">
      <label className="label">{label}</label>
      <select
        className="select"
        value={vals[field] || ''}
        onChange={e => set(field, e.target.value)}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function StepIndicator({ current, total }) {
  return (
    <div className="step-indicator">
      {Array.from({length: total}, (_, i) => {
        const n = i + 1
        const done   = n < current
        const active = n === current
        return (
          <div key={n} className="step-item">
            <div className={`step-dot ${active ? 'active' : done ? 'done' : ''}`}>
              {done ? '✓' : n}
            </div>
            <div className={`step-lbl ${active ? 'active' : ''}`}>{STEPS[i].label}</div>
            {i < total - 1 && <div className={`step-line ${done ? 'done' : ''}`} />}
          </div>
        )
      })}
    </div>
  )
}

export default function StudentForm({ data, onBack }) {
  const { student: initial, headers } = data
  const [vals,      setVals]    = useState(() => ({...initial}))
  const [step,      setStep]    = useState(1)
  const [saving,    setSaving]  = useState(false)
  const [saveMsg,   setSaveMsg] = useState(null)
  const [submitted, setSubmitted] = useState(!!initial._submitted)
  const [done,      setDone]    = useState(false)

  const h = (name) => {
    if (!headers) return name
    const lower = name.toLowerCase()
    return headers.find(hh => hh.toLowerCase() === lower || hh.toLowerCase().includes(lower)) || name
  }

  const adField    = headers?.[0] || 'Ad No'
  const nameField  = h('name')
  const yearField  = h('year')
  const batchField = h('batch')
  const phoneField = h('phone')
  const emailField = h('email')
  const addrField  = h('address')
  const poField    = h('post')
  const dhField    = h('DH Status')
  const lastField  = h('Last Attended')
  const qualField  = h('qualification')

  const adNo    = vals[adField] || ''
  const dhStatus = vals[dhField] || ''
  const empSt   = vals[h('Current Status')] || ''
  const desig   = vals[h('Designation')] || ''

  const set = (field, val) => setVals(v => ({...v, [field]: val}))

  // Shared props passed to TF / SF so they can read and write vals
  const fp = { vals, set }

  const saveStep = async () => {
    setSaving(true); setSaveMsg(null)
    try {
      const editable = {}
      Object.entries(vals).forEach(([k,v]) => { if(!isRO(k) && !k.startsWith('_')) editable[k] = v })
      await api.updateRow(adNo, editable)
      setSaveMsg({type:'success', text:'Saved ✓'})
      setTimeout(() => { setSaveMsg(null); setStep(s => s + 1) }, 700)
    } catch(e) {
      setSaveMsg({type:'error', text: e.message})
    } finally { setSaving(false) }
  }

  const finishAndSubmit = async () => {
    setSaving(true); setSaveMsg(null)
    try {
      const editable = {}
      Object.entries(vals).forEach(([k,v]) => { if(!isRO(k) && !k.startsWith('_')) editable[k] = v })
      await api.updateRow(adNo, editable)
      await api.markSubmitted(adNo)
      setSubmitted(true)
      setDone(true)
    } catch(e) {
      setSaveMsg({type:'error', text: e.message})
    } finally { setSaving(false) }
  }

  // ── Done screen ──────────────────────────────────────────────
  if (done) {
    return (
      <div className="wrap" style={{paddingTop:48, textAlign:'center'}}>
        <div style={{
          width:72, height:72, borderRadius:'50%',
          background:'var(--green-bg)', border:'2px solid var(--green-bd)',
          display:'flex', alignItems:'center', justifyContent:'center',
          margin:'0 auto 20px', fontSize:'2rem',
        }}>✓</div>
        <h2 style={{fontSize:'1.5rem', marginBottom:8}}>All done!</h2>
        <p style={{color:'var(--text2)', marginBottom:28, maxWidth:300, margin:'0 auto 28px'}}>
          Your details have been saved and your record is marked as submitted.
        </p>
        <button className="btn btn-outline" onClick={onBack}>← Back to Home</button>
      </div>
    )
  }

  return (
    <div className="wrap" style={{paddingTop:20}}>

      {/* Identity strip */}
      <div className="card" style={{marginBottom:20,padding:'16px 20px'}}>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          <PhotoUpload
            adNo={adNo}
            initialUrl={vals._photoUrl || null}
            onUploaded={url => set('_photoUrl', url)}
          />
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:700,fontSize:'1.1rem',letterSpacing:'-0.02em',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              {vals[nameField] || 'Alumni'}
            </div>
            <div style={{fontSize:'0.78rem',color:'var(--text2)',fontFamily:'var(--mono)',marginTop:2}}>
              #{vals[adField]} · Batch {vals[batchField]} · {vals[yearField]}
            </div>
            <div style={{marginTop:8}}>
              <span className={`badge ${submitted ? 'badge-green' : 'badge-red'}`}>
                {submitted ? '✓ Submitted' : '● Pending'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Step indicator */}
      <StepIndicator current={step} total={STEPS.length} />

      {/* ── Step 1: Personal Info ── */}
      {step === 1 && (
        <div className="fade">
          <div className="sec-head" style={{marginBottom:12}}>
            <span className="sec-num">01</span>
            <span className="sec-label">Personal Information</span>
          </div>
          <div className="card" style={{marginBottom:16}}>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <TF {...fp} label="Phone Number" field={phoneField} type="tel" inputMode="tel"
                hint="Your current active phone number" />
              <TF {...fp} label="Email Address" field={emailField} type="email" />
              <TF {...fp} label="Address" field={addrField} hint="House / Street / Area" />
              <TF {...fp} label="Post Office" field={poField} />
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: Academic ── */}
      {step === 2 && (
        <div className="fade">
          <div className="sec-head" style={{marginBottom:12}}>
            <span className="sec-num">02</span>
            <span className="sec-label">Academic Details</span>
          </div>
          <div className="card" style={{marginBottom:16}}>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <SF {...fp} label="DH Status" field={dhField} options={DH_OPTS} />
              {dhStatus === 'Not completed UG' && (
                <div className="field fade">
                  <label className="label">Last Attended Class</label>
                  <select
                    className="select"
                    value={vals[lastField] || ''}
                    onChange={e => set(lastField, e.target.value)}
                  >
                    <option value="">Select class…</option>
                    {Array.from({length:10}, (_, i) => i + 1).map(n => (
                      <option key={n} value={n}>Class {n}</option>
                    ))}
                  </select>
                </div>
              )}
              <TF {...fp} label="Educational Qualification" field={qualField}
                hint="e.g. B.A. Arabic, B.Tech" />
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: Employment ── */}
      {step === 3 && (
        <div className="fade">
          <div className="sec-head" style={{marginBottom:12}}>
            <span className="sec-num">03</span>
            <span className="sec-label">Employment Details</span>
          </div>
          <div className="card" style={{marginBottom:16}}>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div className="field">
                <label className="label">Current Status</label>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:8}}>
                  {EMP_OPTS.map(opt => (
                    <button
                      key={opt.value} type="button"
                      className={`status-pill ${empSt === opt.value ? 'active' : ''}`}
                      onClick={() => set(h('Current Status'), opt.value)}
                    >
                      <div style={{fontSize:'1.1rem',marginBottom:2}}>{opt.emoji}</div>
                      <div style={{fontSize:'0.8rem',fontWeight:600}}>{opt.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {empSt === 'Self-employed' && (
                <div className="fade" style={{display:'flex',flexDirection:'column',gap:14,borderTop:'1px solid var(--border)',paddingTop:14}}>
                  <TF {...fp} label="Business Name"      field={h('Business Name')} />
                  <TF {...fp} label="Nature of Business" field={h('Nature of Business')} hint="e.g. Retail, Education, IT" />
                  <div className="g2">
                    <TF {...fp} label="Year Started"      field={h('Year Started')} type="number" inputMode="numeric" hint="e.g. 2018" />
                    <TF {...fp} label="Business Location" field={h('Business Location')} hint="City" />
                  </div>
                </div>
              )}

              {empSt === 'Employed' && (
                <div className="fade" style={{display:'flex',flexDirection:'column',gap:14,borderTop:'1px solid var(--border)',paddingTop:14}}>
                  <SF {...fp} label="Designation" field={h('Designation')} options={[
                    {value:'', label:'Select designation…'},
                    ...DESIGNATIONS.map(d => ({value:d, label:d}))
                  ]} />
                  {desig === 'Other' && (
                    <TF {...fp} label="Custom Designation" field={h('Custom Designation')} hint="Enter your designation" />
                  )}
                  <TF {...fp} label="Organisation Name" field={h('Organisation Name')} />
                  <TF {...fp} label="Work Location"     field={h('Work Location')} hint="City / District" />
                </div>
              )}

              {empSt === 'Higher Studies' && (
                <div className="fade" style={{display:'flex',flexDirection:'column',gap:14,borderTop:'1px solid var(--border)',paddingTop:14}}>
                  <TF {...fp} label="Course"                    field={h('Course')}      hint="e.g. M.A. Arabic, MBA" />
                  <TF {...fp} label="University / Institution"  field={h('University')} />
                  <TF {...fp} label="Year of Completion"        field={h('Year of Completion')} type="number" inputMode="numeric" hint="e.g. 2026" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Save message */}
      {saveMsg && (
        <div className={`alert alert-${saveMsg.type} fade`} style={{marginBottom:12}}>
          {saveMsg.text}
        </div>
      )}

      {/* Bottom navigation bar */}
      <div className="bottom-bar">
        <div className="bottom-bar-inner" style={{display:'flex',gap:10}}>
          {step > 1 && (
            <button
              className="btn btn-outline"
              onClick={() => { setSaveMsg(null); setStep(s => s - 1) }}
              disabled={saving}
              style={{height:46, flex:1}}
            >
              ← Back
            </button>
          )}
          {step < STEPS.length ? (
            <button
              className="btn btn-primary"
              onClick={saveStep}
              disabled={saving}
              style={{height:46, flex:2}}
            >
              {saving
                ? <><span className="spin spin-sm spin-white"/>Saving…</>
                : 'Save & Continue →'}
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={finishAndSubmit}
              disabled={saving}
              style={{height:46, flex:2, background:'var(--green)', borderColor:'var(--green)'}}
            >
              {saving
                ? <><span className="spin spin-sm spin-white"/>Submitting…</>
                : '✓ Submit & Finish'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
