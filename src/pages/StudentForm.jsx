import { useState } from 'react'
import { api } from '../lib/api.js'

const READONLY = ['ad no', 'adno', 'name', 'ad. year', 'year', 'batch']
const isRO = f => READONLY.some(r =>
  f.toLowerCase().replace(/[.\s]/g,'') === r.replace(/[.\s]/g,'') || f.toLowerCase() === r
)

const DH_OPTS = [
  {value:'',label:'Select status…'},
  {value:'PG Completed',     label:'PG Completed'},
  {value:'UG Completed',     label:'UG Completed'},
  {value:'Not Completed UG', label:'Not Completed UG'},
]
const DESIGNATIONS = ['Qatheeb','Muallim','Arabic College','Teacher (School)','College Professor','Translator','Typing','Other']
const EMP_OPTS = [
  {value:'Self-employed / Entrepreneur', emoji:'🏢', label:'Self-employed / Entrepreneur'},
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
  const [vals,        setVals]      = useState(() => ({...initial}))
  const [step,        setStep]      = useState(1)
  const [saving,      setSaving]    = useState(false)
  const [saveMsg,     setSaveMsg]   = useState(null)
  const [submitted,   setSubmitted] = useState(!!initial._submitted)
  const [done,        setDone]      = useState(false)
  const [sameAsPhone, setSameAsPhone] = useState(false)

  // Resolve a sheet header by trying multiple aliases — exact match first, then includes
  const h = (...terms) => {
    if (!headers) return terms[0]
    for (const name of terms) {
      const found = headers.find(hh => hh.toLowerCase() === name.toLowerCase())
      if (found) return found
    }
    for (const name of terms) {
      const found = headers.find(hh => hh.toLowerCase().includes(name.toLowerCase()))
      if (found) return found
    }
    return terms[0]
  }

  const adField        = headers?.[0] || 'Ad No'
  const nameField      = h('name')
  const yearField      = h('year', 'ad year', 'admission year')
  const batchField     = h('batch')
  const phoneField     = h('phone', 'mobile', 'contact')
  const whatsappField  = headers?.find(hh => hh.toLowerCase().replace(/\s/g,'').includes('whatsapp')) || 'Whatsapp Number'
  const emailField     = h('email', 'e-mail', 'mail')
  const addrField      = h('address', 'home address')
  const poField        = h('post office', 'post', 'postal')
  const dhField        = h('DH Status', 'DH')
  const lastField      = h('Last Attended', 'Last Class')
  const qualField      = h('Educational Qualification', 'qualification', 'degree')

  // Employment field headers — pre-resolved so buildEditable() uses exact column names
  const statusField    = h('Current Status', 'Employment Status', 'Work Status', 'Status')
  const designField    = h('Designation')
  const custDesigField = h('Custom Designation')
  const orgNameField   = h('Organisation Name', 'Organization Name', 'organisation', 'organization')
  const workLocField   = h('Work Location', 'workplace', 'work place')
  const bizNameField   = h('Business Name')
  const bizNatureField = h('Nature of Business', 'business type')
  const bizYearField   = h('Year Started', 'start year')
  const bizLocField    = h('Business Location')
  const courseField    = h('Course', 'program')
  const univField      = h('University', 'institution', 'college')
  const completionField = h('Year of Completion', 'completion year', 'year of passing')

  const adNo     = vals[adField] || ''
  const dhStatus = vals[dhField] || ''
  const empSt    = vals[statusField] || ''
  const desig    = vals[designField] || ''

  const set = (field, val) => setVals(v => ({...v, [field]: val}))

  const fp = { vals, set }

  const SELF_EMP_HEADERS  = [bizNameField, bizNatureField, bizYearField, bizLocField]
  const EMPLOYED_HEADERS  = [designField, custDesigField, orgNameField, workLocField]
  const HIGHER_HEADERS    = [courseField, univField, completionField]
  const ALL_EMP_HEADERS   = [...SELF_EMP_HEADERS, ...EMPLOYED_HEADERS, ...HIGHER_HEADERS]

  function buildEditable() {
    const editable = {}
    Object.entries(vals).forEach(([k,v]) => { if(!isRO(k) && !k.startsWith('_')) editable[k] = v })
    const status = vals[statusField] || ''
    const keepHeaders = status === 'Self-employed / Entrepreneur' ? SELF_EMP_HEADERS
      : status === 'Employed' ? EMPLOYED_HEADERS
      : status === 'Higher Studies' ? HIGHER_HEADERS
      : []
    ALL_EMP_HEADERS.forEach(field => {
      if (!keepHeaders.includes(field)) editable[field] = ''
    })
    if (status === 'Employed' && vals[designField] !== 'Other') {
      editable[custDesigField] = ''
    }
    return editable
  }

  function validateStep1() {
    if (!vals[phoneField]?.trim()) {
      setSaveMsg({type:'error', text:'Phone Number is required.'})
      return false
    }
    if (!vals[whatsappField]?.trim()) {
      setSaveMsg({type:'error', text:'WhatsApp Number is required.'})
      return false
    }
    return true
  }

  const saveStep = async () => {
    if (step === 1 && !validateStep1()) return
    setSaving(true); setSaveMsg(null)
    try {
      const result = await api.updateRow(adNo, buildEditable())
      if (result && result.updated === 0) {
        setSaveMsg({type:'error', text:'Save failed: fields could not be written to the sheet. Please re-deploy the Apps Script.'})
        return
      }
      setSaveMsg({type:'success', text:'Saved ✓'})
      setTimeout(() => { setSaveMsg(null); setStep(s => s + 1) }, 700)
    } catch(e) {
      setSaveMsg({type:'error', text: e.message})
    } finally { setSaving(false) }
  }

  const finishAndSubmit = async () => {
    setSaving(true); setSaveMsg(null)
    try {
      const result = await api.updateRow(adNo, buildEditable())
      if (result && result.updated === 0) {
        setSaveMsg({type:'error', text:'Save failed: fields could not be written to the sheet. Please re-deploy the Apps Script.'})
        return
      }
      try {
        await api.markSubmitted(adNo)
      } catch(markErr) {
        // Data saved but submission marking failed — still show success
        // This happens when the deployed Apps Script is outdated (missing markSubmitted action)
        console.warn('markSubmitted failed:', markErr.message)
      }
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
          width:80, height:80, borderRadius:'50%',
          background:'var(--green-bg)', border:'2px solid var(--green-bd)',
          display:'flex', alignItems:'center', justifyContent:'center',
          margin:'0 auto 24px', fontSize:'2.4rem',
        }}>✓</div>
        <h2 style={{fontSize:'1.6rem', marginBottom:10, fontWeight:700}}>Thank You!</h2>
        <p style={{color:'var(--text2)', maxWidth:320, margin:'0 auto 8px', lineHeight:1.6}}>
          Your details have been submitted successfully.
        </p>
        <p style={{color:'var(--text3)', maxWidth:300, margin:'0 auto 32px', fontSize:'0.9rem'}}>
          JazakAllahu Khayran for taking the time to update your information.
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

              {/* Phone Number */}
              <div className="field">
                <label className="label">Phone Number *</label>
                <input
                  className="input"
                  type="tel" inputMode="tel"
                  value={vals[phoneField] ?? ''}
                  onChange={e => {
                    set(phoneField, e.target.value)
                    if (sameAsPhone) set(whatsappField, e.target.value)
                  }}
                />
                <span style={{fontSize:'0.72rem',color:'var(--text3)'}}>Your current active phone number</span>
              </div>

              {/* WhatsApp Number */}
              <div className="field">
                <label className="label">WhatsApp Number *</label>
                <input
                  className="input"
                  type="tel" inputMode="tel"
                  value={vals[whatsappField] ?? ''}
                  readOnly={sameAsPhone}
                  onChange={sameAsPhone ? undefined : e => set(whatsappField, e.target.value)}
                  style={sameAsPhone ? {background:'var(--bg2)',color:'var(--text3)'} : {}}
                />
                <label style={{display:'flex',alignItems:'center',gap:6,marginTop:6,cursor:'pointer',fontSize:'0.8rem',color:'var(--text2)',userSelect:'none'}}>
                  <input
                    type="checkbox"
                    checked={sameAsPhone}
                    onChange={e => {
                      setSameAsPhone(e.target.checked)
                      if (e.target.checked) set(whatsappField, vals[phoneField] || '')
                    }}
                    style={{width:15,height:15,cursor:'pointer'}}
                  />
                  Same as phone number
                </label>
              </div>

              {/* Email Address */}
              <div className="field">
                <label className="label">Email Address <span style={{fontWeight:400,color:'var(--text3)'}}>(optional)</span></label>
                <input
                  className="input"
                  type="email"
                  value={vals[emailField] ?? ''}
                  onChange={e => set(emailField, e.target.value)}
                  placeholder="e.g. yourname@gmail.com"
                />
                <div style={{display:'flex',alignItems:'center',gap:6,marginTop:6,flexWrap:'wrap'}}>
                  <span style={{fontSize:'0.72rem',color:'var(--text3)'}}>Quick fill:</span>
                  {['@gmail.com','@icloud.com'].map(domain => (
                    <button key={domain} type="button"
                      className="btn btn-ghost btn-sm"
                      style={{fontSize:'0.72rem',height:26,padding:'0 8px',borderRadius:6}}
                      onClick={() => {
                        const cur = vals[emailField] || ''
                        const local = cur.includes('@') ? cur.split('@')[0] : cur
                        set(emailField, local + domain)
                      }}
                    >{domain}</button>
                  ))}
                </div>
              </div>

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
              {dhStatus === 'Not Completed UG' && (
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
                      onClick={() => set(statusField, opt.value)}
                    >
                      <div style={{fontSize:'1.1rem',marginBottom:2}}>{opt.emoji}</div>
                      <div style={{fontSize:'0.8rem',fontWeight:600}}>{opt.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {empSt === 'Self-employed / Entrepreneur' && (
                <div className="fade" style={{display:'flex',flexDirection:'column',gap:14,borderTop:'1px solid var(--border)',paddingTop:14}}>
                  <TF {...fp} label="Business Name"      field={bizNameField} />
                  <TF {...fp} label="Nature of Business" field={bizNatureField} hint="e.g. Retail, Education, IT" />
                  <div className="g2">
                    <TF {...fp} label="Year Started"      field={bizYearField} type="number" inputMode="numeric" hint="e.g. 2018" />
                    <TF {...fp} label="Business Location" field={bizLocField} hint="City" />
                  </div>
                </div>
              )}

              {empSt === 'Employed' && (
                <div className="fade" style={{display:'flex',flexDirection:'column',gap:14,borderTop:'1px solid var(--border)',paddingTop:14}}>
                  <SF {...fp} label="Designation" field={designField} options={[
                    {value:'', label:'Select designation…'},
                    ...DESIGNATIONS.map(d => ({value:d, label:d}))
                  ]} />
                  {desig === 'Other' && (
                    <TF {...fp} label="Custom Designation" field={custDesigField} hint="Enter your designation" />
                  )}
                  <TF {...fp} label="Organisation Name" field={orgNameField} />
                  <TF {...fp} label="Work Location"     field={workLocField} hint="City / District" />
                </div>
              )}

              {empSt === 'Higher Studies' && (
                <div className="fade" style={{display:'flex',flexDirection:'column',gap:14,borderTop:'1px solid var(--border)',paddingTop:14}}>
                  <TF {...fp} label="Course"                    field={courseField}      hint="e.g. M.A. Arabic, MBA" />
                  <TF {...fp} label="University / Institution"  field={univField} />
                  <TF {...fp} label="Year of Completion"        field={completionField} type="number" inputMode="numeric" hint="e.g. 2026" />
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
