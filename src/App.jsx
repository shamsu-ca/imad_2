import { useState } from 'react'
import PublicPage  from './pages/PublicPage.jsx'
import StudentForm from './pages/StudentForm.jsx'
import BatchView   from './pages/BatchView.jsx'
import AdminView   from './pages/AdminView.jsx'
import Topbar      from './components/Topbar.jsx'

export default function App() {
  const [view,    setView]    = useState('public')
  const [student, setStudent] = useState(null)
  const [batch,   setBatch]   = useState(null)
  const [admin,   setAdmin]   = useState(null)

  const goPublic  = ()    => { setView('public'); setStudent(null); setBatch(null); }
  const goStudent = data  => { setStudent(data); setView('student'); }
  const goBatch   = data  => { setBatch(data); setView('batch'); }
  const goAdmin   = pass  => { setAdmin(pass); setView('admin'); }

  return (
    <div className="app">
      <Topbar view={view} onHome={goPublic} onBatch={goBatch} onAdmin={goAdmin} />
      <main className="page fade" key={view}>
        {view === 'public'  && <PublicPage  onStudentFound={goStudent} />}
        {view === 'student' && <StudentForm data={student} onBack={goPublic} />}
        {view === 'batch'   && <BatchView   data={batch}   onBack={goPublic} onStudentSelect={goStudent} />}
        {view === 'admin'   && <AdminView   password={admin} onBack={goPublic} onStudentSelect={goStudent} />}
      </main>
    </div>
  )
}
