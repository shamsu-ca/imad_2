import { useState, useCallback, useRef } from 'react'
import { api } from '../lib/api.js'
import PhotoUpload from '../components/PhotoUpload.jsx'

const READONLY = ['ad no', 'adno', 'name', 'ad. year', 'year', 'batch']
const isRO = f => READONLY.some(r => f.toLowerCase().replace(/[.\s]/g,'') === r.replace(/[.\s]/g,'') || f.toLowerCase() === r)

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

function useSaveStatus() {
  const [map, setMap] = useState({})
  const timers = useRef({})
  const mark = useCallback((field, status) => {
    setMap(s => ({...s, [field]: status}))
    if (status === 'saved' || status === 'error') {
      clearTimeout(timers.current[field])
      timers.current[field] = setTimeout(() => setMap(s => ({...s, [field]: 'idle'})), 2800)
    }
  }, [])
  return [map, mark]
}

function Pill({ status }) {
  if (!status || status === 'idle') return null
  const labels = {saving:'saving…', saved:'✓ saved', error:'✗ error'}
  return <span className={`save-pill ${status}`}>{labels[status]}</span>
}

export default function StudentForm({ data }) {
  const { student: initial, headers } = data
  const [vals,    setVals]   = useState(() => ({...initial}))
  const [ssMap,   mark]      = useSaveStatus()
  const [saving,  setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)

  const h = (name) => {
    if (!headers) return name
    const lower = name.toLowerCase()
    return headers.find(h => h.toLowerCase() === lower || h.toLowerCase().includes(lower)) || name
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

  const adNo     = vals[adField] || ''
  const dhStatus = vals[dhField] || ''
  const empSt    = vals[h('Current Status')] || ''
  const desig    = vals[h('Designation')] || ''

  const set = (field, val) => setVals(v => ({...v, [field]: val}))

  const autoSave = async (field, value) => {
    if (!adNo || isRO(field)) return
    mark(field, 'saving')
    try { await api.updateField(adNo, field, value); mark(field, 'saved') }
    catch(e) { mark(field, 'error') }
  }

  const saveAll = async () => {
    setSaving(true); setSaveMsg(null)
    try {
      const editable = {}
      Object.entries(vals).forEach(([k,v]) => { if(!isRO(k)) editable[k] = v })
      await api.updateRow(adNo, editable)
      setSaveMsg({type:'success', text:'All changes saved successfully ✓'})
    } catch(e) { setSaveMsg({type:'error', text:e.message}) }
    finally { setSaving(false); setTimeout(() => setSaveMsg(null), 4000) }
  }

  function TF({label, field, type='text', inputMode, placeholder, hint}) {
    const ro = isRO(field)
    const s  = ssMap[field]
    return (
      <div className="field">
        <label className="label">
          <span className={ro?'label-ro':''}>{label}</span>
          {ro && <span style={{fontSize:'0.6rem',fontWeight:400,color:'var(--text3)'}}>pre-filled</span>}
          <Pill status={s} />
        </label>
        <input
          className={`input ${ro?'ro':''} ${s&&s!=='idle'?s:''}`}
          type={type} inputMode={inputMode}
          placeholder={ro?'':placeholder}
          value={vals[field]??''}
          readOnly={ro}
          onChange={ro ? undefined : e => set(field, e.target.value)}
          onBlur={ro ? undefined : e => autoSave(field, e.target.value)}
        />
        {hint && <span style={{fontSize:'0.72rem',color:'var(--text3)'}}>{hint}</span>}
      </div>
    )
  }

  function SF({label, field, options}) {
    const s = ssMap[field]
    return (
      <div className="field">
        <label className="label">{label} <Pill status={s} /></label>
        <select
          className={`select ${s&&s!=='idle'?s:''}`}
          value={vals[field]||''}
          onChange={e => { set(field, e.target.value); autoSave(field, e.target.value) }}
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    )
  }

  const submitted = !!(vals[phoneField]||'').trim()

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
              {vals[nameField] || 'Student'}
            </div>
            <div style={{fontSize:'0.78rem',color:'var(--text2)',fontFamily:'var(--mono)',marginTop:2}}>
              #{vals[adField]} · Batch {vals[batchField]} · {vals[yearField]}
            </div>
            <div style={{marginTop:8}}>
              <span className={`badge ${submitted?'badge-green':'badge-red'}`}>
                {submitted ? '✓ Submitted' : '● Pending'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 01 Personal */}
      <div className="sec-head"><span className="sec-num">01</span><span className="sec-label">Personal Information</span></div>
      <div className="card" style={{marginBottom:20}}>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div className="g2">
            <TF label={adField}    field={adField} />
            <TF label={batchField} field={batchField} />
          </div>
          <div className="g2">
            <TF label={nameField}  field={nameField} />
            <TF label={yearField}  field={yearField} />
          </div>
          <TF label="Phone Number" field={phoneField} type="tel" inputMode="tel" placeholder="+91 XXXXX XXXXX" hint="Filling this marks your record as submitted" />
          <TF label="Email" field={emailField} type="email" placeholder="your@email.com" />
          <TF label="Address" field={addrField} placeholder="House / Street / Area" />
          <TF label="Post Office" field={poField} placeholder="Post office name" />
        </div>
      </div>

      {/* 02 Academic */}
      <div className="sec-head"><span className="sec-num">02</span><span className="sec-label">Academic Details</span></div>
      <div className="card" style={{marginBottom:20}}>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <SF label="DH Status" field={dhField} options={DH_OPTS} />
          {dhStatus === 'Not completed UG' && (
            <div className="field fade">
              <label className="label">Last Attended Class <Pill status={ssMap[lastField]} /></label>
              <select
                className={`select ${ssMap[lastField]&&ssMap[lastField]!=='idle'?ssMap[lastField]:''}`}
                value={vals[lastField]||''}
                onChange={e => { set(lastField, e.target.value); autoSave(lastField, e.target.value) }}
              >
                <option value="">Select class…</option>
                {Array.from({length:10},(_,i)=>i+1).map(n=>(
                  <option key={n} value={n}>Class {n}</option>
                ))}
              </select>
            </div>
          )}
          <TF label="Educational Qualification" field={qualField} placeholder="e.g. B.A. Arabic" />
        </div>
      </div>

      {/* 03 Employment */}
      <div className="sec-head"><span className="sec-num">03</span><span className="sec-label">Employment Details</span></div>
      <div className="card" style={{marginBottom:20}}>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div className="field">
            <label className="label">Current Status</label>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:8}}>
              {EMP_OPTS.map(opt => (
                <button
                  key={opt.value} type="button"
                  className={`status-pill ${empSt===opt.value?'active':''}`}
                  onClick={() => { set(h('Current Status'), opt.value); autoSave(h('Current Status'), opt.value) }}
                >
                  <div style={{fontSize:'1.1rem',marginBottom:2}}>{opt.emoji}</div>
                  <div style={{fontSize:'0.8rem',fontWeight:600}}>{opt.label}</div>
                </button>
              ))}
            </div>
          </div>

          {empSt === 'Self-employed' && (
            <div className="fade" style={{display:'flex',flexDirection:'column',gap:14,borderTop:'1px solid var(--border)',paddingTop:14}}>
              <TF label="Business Name"      field={h('Business Name')}      placeholder="Your business name" />
              <TF label="Nature of Business" field={h('Nature of Business')} placeholder="e.g. Retail, Education, IT" />
              <div className="g2">
                <TF label="Year Started"    field={h('Year Started')}    type="number" inputMode="numeric" placeholder="2018" />
                <TF label="Business Location" field={h('Business Location')} placeholder="City" />
              </div>
            </div>
          )}

          {empSt === 'Employed' && (
            <div className="fade" style={{display:'flex',flexDirection:'column',gap:14,borderTop:'1px solid var(--border)',paddingTop:14}}>
              <SF label="Designation" field={h('Designation')} options={[
                {value:'',label:'Select designation…'},
                ...DESIGNATIONS.map(d => ({value:d,label:d}))
              ]} />
              {desig === 'Other' && (
                <TF label="Custom Designation" field={h('Custom Designation')} placeholder="Enter your designation" />
              )}
              <TF label="Organisation Name" field={h('Organisation Name')} placeholder="Where you work" />
              <TF label="Work Location"     field={h('Work Location')}     placeholder="City / District" />
            </div>
          )}

          {empSt === 'Higher Studies' && (
            <div className="fade" style={{display:'flex',flexDirection:'column',gap:14,borderTop:'1px solid var(--border)',paddingTop:14}}>
              <TF label="Course"                 field={h('Course')}      placeholder="e.g. M.A. Arabic, MBA" />
              <TF label="University / Institution" field={h('University')} placeholder="Institution name" />
              <TF label="Year of Completion"     field={h('Year of Completion')} type="number" inputMode="numeric" placeholder="2026" />
            </div>
          )}
        </div>
      </div>

      {/* Save message */}
      {saveMsg && (
        <div className={`alert alert-${saveMsg.type} fade`} style={{marginBottom:12}}>
          {saveMsg.text}
        </div>
      )}

      {/* Bottom save bar */}
      <div className="bottom-bar">
        <div className="bottom-bar-inner">
          <button className="btn btn-primary btn-full" onClick={saveAll} disabled={saving} style={{height:46}}>
            {saving
              ? <><span className="spin spin-sm spin-white"/>Saving all fields…</>
              : '💾  Save all changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
