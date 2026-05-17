import { useState, useRef } from 'react'
import { api } from '../lib/api.js'

export default function PhotoUpload({ adNo, initialUrl, onUploaded }) {
  const [url,       setUrl]       = useState(initialUrl || null)
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState('')
  const [cropOpen,  setCropOpen]  = useState(false)
  const [cropSrc,   setCropSrc]   = useState(null)
  const [imgDisp,   setImgDisp]   = useState({ w: 0, h: 0 })
  const [imgNat,    setImgNat]    = useState({ w: 0, h: 0 })
  const [cropPos,   setCropPos]   = useState({ x: 0, y: 0 })
  const [dragging,  setDragging]  = useState(false)
  const [dragStart, setDragStart] = useState({ cx: 0, cy: 0, ox: 0, oy: 0 })

  const inputRef  = useRef(null)
  const imgRef    = useRef(null)
  const canvasRef = useRef(null)

  function handleFile(file) {
    if (!file) return
    setError('')
    if (!file.type.startsWith('image/')) { setError('Please choose an image file.'); return }
    setCropSrc(URL.createObjectURL(file))
    setCropOpen(true)
  }

  function onImgLoad(e) {
    const img = e.target
    const rect = img.getBoundingClientRect()
    const disp = { w: rect.width, h: rect.height }
    setImgDisp(disp)
    setImgNat({ w: img.naturalWidth, h: img.naturalHeight })
    const sz = Math.min(disp.w, disp.h)
    setCropPos({ x: (disp.w - sz) / 2, y: (disp.h - sz) / 2 })
  }

  const cropSz = imgDisp.w && imgDisp.h ? Math.min(imgDisp.w, imgDisp.h) : 0

  function startDrag(e) {
    e.preventDefault()
    const pt = e.touches ? e.touches[0] : e
    setDragging(true)
    setDragStart({ cx: pt.clientX, cy: pt.clientY, ox: cropPos.x, oy: cropPos.y })
  }

  function onMove(e) {
    if (!dragging) return
    e.preventDefault()
    const pt = e.touches ? e.touches[0] : e
    const maxX = Math.max(0, imgDisp.w - cropSz)
    const maxY = Math.max(0, imgDisp.h - cropSz)
    setCropPos({
      x: Math.max(0, Math.min(maxX, dragStart.ox + pt.clientX - dragStart.cx)),
      y: Math.max(0, Math.min(maxY, dragStart.oy + pt.clientY - dragStart.cy)),
    })
  }

  function endDrag() { setDragging(false) }

  async function confirmCrop() {
    const canvas = canvasRef.current
    const img    = imgRef.current
    if (!canvas || !img || cropSz === 0) return

    const scaleX = imgNat.w / imgDisp.w
    const scaleY = imgNat.h / imgDisp.h
    canvas.width  = 400
    canvas.height = 400
    canvas.getContext('2d').drawImage(
      img,
      cropPos.x * scaleX, cropPos.y * scaleY,
      cropSz * scaleX,    cropSz * scaleY,
      0, 0, 400, 400
    )

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    closeCrop()
    setUrl(dataUrl)
    setUploading(true)
    try {
      const result = await api.uploadPhoto(adNo, dataUrl.split(',')[1], 'image/jpeg')
      setUrl(result.url)
      onUploaded && onUploaded(result.url)
    } catch(e) {
      setError('Upload failed: ' + e.message)
      setUrl(initialUrl || null)
    } finally { setUploading(false) }
  }

  function closeCrop() {
    setCropOpen(false)
    setCropSrc(null)
    setImgDisp({ w: 0, h: 0 })
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
      {/* Avatar circle */}
      <div
        className="photo-zone"
        onClick={() => !uploading && inputRef.current?.click()}
        title="Click to upload photo"
      >
        {url ? (
          <img src={url} alt="Alumni photo" />
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
          onChange={e => handleFile(e.target.files[0])}
          style={{position:'absolute',inset:0,opacity:0,cursor:'pointer'}}
        />
      </div>
      <span style={{fontSize:'0.68rem',color:'var(--text3)',fontFamily:'var(--mono)'}}>
        {uploading ? 'Uploading…' : 'Tap to change'}
      </span>
      {error && <div className="alert alert-error" style={{fontSize:'0.78rem',padding:'6px 10px'}}>{error}</div>}

      <canvas ref={canvasRef} style={{display:'none'}} />

      {/* Crop modal */}
      {cropOpen && (
        <div className="overlay" style={{zIndex:200}} onClick={e => e.target===e.currentTarget && closeCrop()}>
          <div className="overlay-panel" style={{maxWidth:480}}>
            <div className="drag-handle"/>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <h2 style={{fontSize:'1rem'}}>Crop Photo</h2>
              <button className="btn btn-ghost" onClick={closeCrop} style={{height:32,padding:'0 8px'}}>✕</button>
            </div>
            <p style={{fontSize:'0.78rem',color:'var(--text2)',marginBottom:12}}>
              Drag the highlighted square to select your crop area.
            </p>

            {/* Image + crop overlay */}
            <div
              style={{position:'relative',overflow:'hidden',borderRadius:8,userSelect:'none',WebkitUserSelect:'none',cursor:'move'}}
              onMouseMove={onMove} onMouseUp={endDrag} onMouseLeave={endDrag}
              onTouchMove={onMove} onTouchEnd={endDrag}
            >
              <img
                ref={imgRef}
                src={cropSrc}
                alt="crop source"
                onLoad={onImgLoad}
                style={{display:'block',width:'100%',maxHeight:'55vh',objectFit:'contain',pointerEvents:'none'}}
                draggable={false}
              />
              {cropSz > 0 && (
                <>
                  {/* 4-panel dark overlay outside the crop square */}
                  <div style={{position:'absolute',top:0,left:0,right:0,height:cropPos.y,background:'rgba(0,0,0,0.55)',pointerEvents:'none'}}/>
                  <div style={{position:'absolute',top:cropPos.y+cropSz,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.55)',pointerEvents:'none'}}/>
                  <div style={{position:'absolute',top:cropPos.y,left:0,width:cropPos.x,height:cropSz,background:'rgba(0,0,0,0.55)',pointerEvents:'none'}}/>
                  <div style={{position:'absolute',top:cropPos.y,left:cropPos.x+cropSz,right:0,height:cropSz,background:'rgba(0,0,0,0.55)',pointerEvents:'none'}}/>
                  {/* Crop border + drag handle */}
                  <div
                    onMouseDown={startDrag}
                    onTouchStart={startDrag}
                    style={{
                      position:'absolute',
                      left:cropPos.x, top:cropPos.y,
                      width:cropSz,   height:cropSz,
                      border:'2px solid #fff',
                      boxSizing:'border-box',
                      cursor:'move',
                    }}
                  >
                    {/* Corner marks */}
                    {[[0,0,'0 auto auto 0'],[0,'auto','0 0 auto auto'],['auto',0,'auto auto 0 0'],['auto','auto','auto 0 0 auto']].map(([t,r,inset],i) => (
                      <div key={i} style={{
                        position:'absolute', width:14, height:14,
                        top: t, right: r === 'auto' ? 'auto' : r, bottom: t === 'auto' ? 0 : 'auto', left: r === 0 ? 0 : 'auto',
                        borderTop: (i < 2) ? '3px solid #fff' : 'none',
                        borderBottom: (i >= 2) ? '3px solid #fff' : 'none',
                        borderLeft: (i === 0 || i === 2) ? '3px solid #fff' : 'none',
                        borderRight: (i === 1 || i === 3) ? '3px solid #fff' : 'none',
                      }}/>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div style={{display:'flex',gap:10,marginTop:14}}>
              <button className="btn btn-outline" onClick={closeCrop} style={{flex:1}}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmCrop} style={{flex:2}}>✓ Use This Crop</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
