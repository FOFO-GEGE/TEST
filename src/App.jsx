import { useState } from 'react'
import BottomNav from './components/BottomNav.jsx'
import Accueil from './pages/Accueil.jsx'
import Charges from './pages/Charges.jsx'
import Transactions from './pages/Transactions.jsx'
import Previsionnel from './pages/Previsionnel.jsx'
import Reglages from './pages/Reglages.jsx'

const PAGES = {
  accueil: Accueil,
  charges: Charges,
  transactions: Transactions,
  previsionnel: Previsionnel,
  reglages: Reglages,
}

export default function App() {
  const [page, setPage] = useState('accueil')
  const Page = PAGES[page]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-lg pb-20">
        <Page />
      </div>
      <BottomNav page={page} onNavigate={setPage} />
    </div>
  )
}
