export default function BatchCard({ batch, total, submitted }) {
  const pct = total ? Math.round(submitted / total * 100) : 0
  const cls = pct >= 100 ? 'high' : pct >= 50 ? 'mid' : 'low'
  const color = pct >= 100 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : 'var(--red)'

  return (
    <div className="card card-sm" style={{padding:'14px 14px 12px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
        <div>
          <div style={{fontSize:'0.65rem',fontWeight:600,letterSpacing:'0.1em',color:'var(--hint)',fontFamily:'var(--mono)',textTransform:'uppercase'}}>
            Batch
          </div>
          <div style={{fontSize:'1.1rem',fontWeight:600,letterSpacing:'-0.03em',lineHeight:1.1}}>
            {batch}
          </div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:'1.1rem',fontWeight:600,color,letterSpacing:'-0.02em'}}>
            {pct}%
          </div>
        </div>
      </div>
      <div className="progress-track" style={{marginBottom:8}}>
        <div className={`progress-fill ${cls}`} style={{width:pct+'%'}} />
      </div>
      <div style={{fontSize:'0.72rem',color:'var(--hint)',fontFamily:'var(--mono)'}}>
        {submitted}/{total}
      </div>
    </div>
  )
}
