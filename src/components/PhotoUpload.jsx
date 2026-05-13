import { useState, useRef } from 'react'
import { api } from '../lib/api.js'

const MAX_SIZE = 1024 * 1024 // 1 MB

export default function PhotoUpload({ adNo, initialUrl, onUploaded }) {
  const [url,      setUrl]      = useState(initialUrl || null)
  const [uploading, setUploading] = useState(false)
  const [error,    setError]    = useState('')
  const inputRef = useRef(null)

  async function handleFile(file) {
    if (!file) return
    setError('')
    if (file.size > MAX_SIZE) { setError('Photo must be under 1 MB.'); return }
    if (!file.type.startsWith('image/')) { setError('Please choose an image file.'); return }

    // Preview immediately
    const preview = URL.createObjectURL(file)
    setUrl(preview)
    setUploading(true)

    try {
      // Convert to base64
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader()
        reader.onload  = () => res(reader.result.split(',')[1])
        reader.onerror = () => rej(new Error('File read failed'))
        reader.readAsDataURL(file)
      })

      const result = await api.uploadPhoto(adNo, base64, file.type)
      setUrl(result.url)
      onUploaded && onUploaded(result.url)
    } catch(e) {
      setError('Upload failed: ' + e.message)
      setUrl(initialUrl || null)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
      <div
        className="photo-zone"
        onClick={() => !uploading && inputRef.current?.click()}
        title="Click to upload photo"
      >
        {url ? (
          <img src={url} alt="Student photo" />
        ) : (
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            <span style={{fontSize:'0.6rem',color:'var(--text3)',fontFamily:'var(--mono)'}}>PHOTO</span>
          </div>
        )}
        {uploading && (
          <div className="photo-upload-progress">
            <span className="spin spin-white" style={{width:22,height:22}}/>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={e => handleFile(e.target.files[0])}
          style={{position:'absolute',inset:0,opacity:0,cursor:'pointer'}}
        />
      </div>
      <span style={{fontSize:'0.68rem',color:'var(--text3)',fontFamily:'var(--mono)'}}>
        {uploading ? 'Uploading…' : 'Tap to change'}
      </span>
      {error && <div className="alert alert-error" style={{fontSize:'0.78rem',padding:'6px 10px'}}>{error}</div>}
    </div>
  )
}
