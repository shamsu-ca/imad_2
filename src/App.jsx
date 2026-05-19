import { useState } from 'react'
import PublicPage  from './pages/PublicPage.jsx'
import StudentForm from './pages/StudentForm.jsx'
import BatchView   from './pages/BatchView.jsx'
import AdminView   from './pages/AdminView.jsx'
import Topbar      from './components/Topbar.jsx'

export default function App() {
  const [view,     setView]     = useState('public')
  const [student,  setStudent]  = useState(null)
  const [batch,    setBatch]    = useState(null)
  const [admin,    setAdmin]    = useState(null)
  const [maxBatch, setMaxBatch] = useState(() => parseInt(localStorage.getItem('imad_max_batch') || '16') || 16)

  const goPublic  = ()    => { setView('public'); setStudent(null); setBatch(null); }
  const goStudent = data  => { setStudent(data); setView('student'); }
  const goBatch   = data  => { setBatch(data); setView('batch'); }
  const goAdmin   = pass  => { setAdmin(pass); setView('admin'); }

  const saveMaxBatch = val => {
    localStorage.setItem('imad_max_batch', String(val))
    setMaxBatch(val)
  }

  return (
    <div className="app">
      <Topbar view={view} onHome={goPublic} onBatch={goBatch} onAdmin={goAdmin} maxBatch={maxBatch} />
      <main className="page fade" key={view}>
        {view === 'public'  && <PublicPage  onStudentFound={goStudent} maxBatch={maxBatch} />}
        {view === 'student' && <StudentForm data={student} onBack={goPublic} />}
        {view === 'batch'   && <BatchView   data={batch}   onBack={goPublic} onStudentSelect={goStudent} />}
        {view === 'admin'   && <AdminView   password={admin} onBack={goPublic} onStudentSelect={goStudent} maxBatch={maxBatch} onMaxBatchChange={saveMaxBatch} />}
      </main>
    </div>
  )
}
