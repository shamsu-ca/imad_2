import { useState, useRef } from 'react'
import { api } from '../lib/api.js'

const CORNERS = [
  { top:0,    left:0,    borderTop:'3px solid #fff',    borderLeft:'3px solid #fff'   },
  { top:0,    right:0,   borderTop:'3px solid #fff',    borderRight:'3px solid #fff'  },
  { bottom:0, left:0,    borderBottom:'3px solid #fff', borderLeft:'3px solid #fff'   },
  { bottom:0, right:0,   borderBottom:'3px solid #fff', borderRight:'3px solid #fff'  },
]

export default function PhotoUpload({ adNo, initialUrl, onUploaded }) {
  const [url,       setUrl]       = useState(initialUrl || null)
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState('')
  const [cropOpen,  setCropOpen]  = useState(false)
  const [cropSrc,   setCropSrc]   = useState(null)
  const [cropSz,    setCropSz]    = useState(0)          // rendered px — set after img loads
  const [cropPos,   setCropPos]   = useState({ x:0, y:0 })
  const [dragging,  setDragging]  = useState(false)
  const [dragStart, setDragStart] = useState({ cx:0, cy:0, ox:0, oy:0 })

  const inputRef  = useRef(null)
  const imgRef    = useRef(null)
  const canvasRef = useRef(null)

  // ── file picker ────────────────────────────────────────────
  function handleFile(file) {
    if (!file) return
    setError('')
    if (!file.type.startsWith('image/')) { setError('Please choose an image file.'); return }
    setCropSrc(URL.createObjectURL(file))
    setCropOpen(true)
    setCropSz(0)
    setCropPos({ x:0, y:0 })
  }

  // ── image loaded inside crop modal ─────────────────────────
  function onImgLoad() {
    // Defer so the overlay panel has finished painting
    setTimeout(() => {
      const img = imgRef.current
      if (!img) return
      const w = img.offsetWidth
      const h = img.offsetHeight
      if (!w || !h) return
      const sz = Math.min(w, h)
      setCropSz(sz)
      setCropPos({ x: (w - sz) / 2, y: (h - sz) / 2 })
    }, 60)
  }

  // ── drag (mouse + touch) ───────────────────────────────────
  function startDrag(e) {
    e.preventDefault()
    e.stopPropagation()
    const pt = e.touches ? e.touches[0] : e
    setDragging(true)
    setDragStart({ cx: pt.clientX, cy: pt.clientY, ox: cropPos.x, oy: cropPos.y })
  }

  function onMove(e) {
    if (!dragging || !cropSz) return
    e.preventDefault()
    const pt = e.touches ? e.touches[0] : e
    const img = imgRef.current
    if (!img) return
    const maxX = Math.max(0, img.offsetWidth  - cropSz)
    const maxY = Math.max(0, img.offsetHeight - cropSz)
    setCropPos({
      x: Math.max(0, Math.min(maxX, dragStart.ox + pt.clientX - dragStart.cx)),
      y: Math.max(0, Math.min(maxY, dragStart.oy + pt.clientY - dragStart.cy)),
    })
  }

  function endDrag() { setDragging(false) }

  // ── crop + upload ──────────────────────────────────────────
  async function confirmCrop() {
    const canvas = canvasRef.current
    const img    = imgRef.current
    if (!canvas || !img || !cropSz) return

    const dispW  = img.offsetWidth
    const dispH  = img.offsetHeight
    const scaleX = img.naturalWidth  / dispW
    const scaleY = img.naturalHeight / dispH

    canvas.width  = 400
    canvas.height = 400
    canvas.getContext('2d').drawImage(
      img,
      cropPos.x * scaleX,  cropPos.y * scaleY,
      cropSz    * scaleX,  cropSz    * scaleY,
      0, 0, 400, 400
    )

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    closeCrop()
    setUrl(dataUrl)   // instant preview
    setUploading(true)
    try {
      const result = await api.uploadPhoto(adNo, dataUrl.split(',')[1], 'image/jpeg')
      setUrl(result.url)
      onUploaded && onUploaded(result.url)
    } catch(e) {
      setError('Upload failed: ' + e.message)
      setUrl(initialUrl || null)
    } finally {
      setUploading(false)
    }
  }

  function closeCrop() {
    setCropOpen(false)
    setCropSrc(null)
    setCropSz(0)
    setCropPos({ x:0, y:0 })
    if (inputRef.current) inputRef.current.value = ''
  }

  // ── render ─────────────────────────────────────────────────
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>

      {/* Avatar circle (tap to pick file) */}
      <div
        className="photo-zone"
        onClick={() => !uploading && inputRef.current?.click()}
        title="Tap to upload photo"
      >
        {url
          ? <img src={url} alt="Alumni photo" />
          : (
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              <span style={{fontSize:'0.6rem',color:'var(--text3)',fontFamily:'var(--mono)'}}>PHOTO</span>
            </div>
          )
        }
        {uploading && (
          <div className="photo-upload-progress">
            <span className="spin spin-white" style={{width:22,height:22}}/>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={e => handleFile(e.target.files[0])}
          style={{position:'absolute',inset:0,opacity:0,cursor:'pointer'}}
        />
      </div>

      <span style={{fontSize:'0.68rem',color:'var(--text3)',fontFamily:'var(--mono)'}}>
        {uploading ? 'Uploading…' : 'Tap to change'}
      </span>
      {error && (
        <div className="alert alert-error" style={{fontSize:'0.78rem',padding:'6px 10px'}}>{error}</div>
      )}

      {/* Hidden canvas used only for the crop computation */}
      <canvas ref={canvasRef} style={{display:'none'}} />

      {/* ── Crop modal ── */}
      {cropOpen && (
        <div
          className="overlay"
          style={{zIndex:200}}
          onClick={e => e.target === e.currentTarget && closeCrop()}
        >
          <div className="overlay-panel" style={{maxWidth:480}}>
            <div className="drag-handle"/>

            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <h2 style={{fontSize:'1rem'}}>Crop Photo</h2>
              <button className="btn btn-ghost" onClick={closeCrop} style={{height:32,padding:'0 8px'}}>✕</button>
            </div>
            <p style={{fontSize:'0.78rem',color:'var(--text2)',marginBottom:12}}>
              Drag the square to choose your crop area.
            </p>

            {/* Image + drag overlay container */}
            <div
              style={{
                position:'relative', overflow:'hidden', borderRadius:8,
                userSelect:'none', WebkitUserSelect:'none',
                touchAction:'none',     // prevent browser scroll during drag
              }}
              onMouseMove={onMove}  onMouseUp={endDrag}  onMouseLeave={endDrag}
              onTouchMove={onMove}  onTouchEnd={endDrag}
            >
              <img
                ref={imgRef}
                src={cropSrc}
                alt="crop"
                onLoad={onImgLoad}
                draggable={false}
                style={{
                  display:'block', width:'100%',
                  maxHeight:'55vh', objectFit:'contain',
                  pointerEvents:'none',
                }}
              />

              {/* Dark panels around crop square + draggable border */}
              {cropSz > 0 && (
                <>
                  <div style={{position:'absolute',top:0,left:0,right:0,
                    height:cropPos.y,background:'rgba(0,0,0,0.55)',pointerEvents:'none'}}/>
                  <div style={{position:'absolute',left:0,right:0,bottom:0,
                    top:cropPos.y+cropSz,background:'rgba(0,0,0,0.55)',pointerEvents:'none'}}/>
                  <div style={{position:'absolute',top:cropPos.y,left:0,
                    width:cropPos.x,height:cropSz,background:'rgba(0,0,0,0.55)',pointerEvents:'none'}}/>
                  <div style={{position:'absolute',top:cropPos.y,right:0,
                    left:cropPos.x+cropSz,height:cropSz,background:'rgba(0,0,0,0.55)',pointerEvents:'none'}}/>

                  {/* Draggable crop box */}
                  <div
                    onMouseDown={startDrag}
                    onTouchStart={startDrag}
                    style={{
                      position:'absolute',
                      left:cropPos.x, top:cropPos.y,
                      width:cropSz,   height:cropSz,
                      border:'2px solid rgba(255,255,255,0.85)',
                      boxSizing:'border-box',
                      cursor:'move',
                    }}
                  >
                    {CORNERS.map((s,i) => (
                      <div key={i} style={{position:'absolute',width:14,height:14,...s}}/>
                    ))}
                  </div>
                </>
              )}

              {/* Spinner while computing dimensions */}
              {!cropSz && (
                <div style={{
                  position:'absolute',inset:0,
                  display:'flex',alignItems:'center',justifyContent:'center',
                  background:'rgba(0,0,0,0.3)',
                }}>
                  <span className="spin spin-white"/>
                </div>
              )}
            </div>

            <div style={{display:'flex',gap:10,marginTop:14}}>
              <button className="btn btn-outline" onClick={closeCrop} style={{flex:1}}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={confirmCrop}
                disabled={!cropSz}
                style={{flex:2}}
              >
                ✓ Use This Crop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
