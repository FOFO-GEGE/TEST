import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { db } from '../db.js'
import { formatMontant, formatDate } from '../lib/format.js'
import Modal from './Modal.jsx'
import TransactionFormModal from './TransactionFormModal.jsx'

const inputCls =
  'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none'

const FILTRES_VIDES = { compteId: '', categorieId: '', periode: 'tout' }

function bornesPeriode(periode) {
  const aujourdhui = new Date()
  if (periode === 'mois') {
    const debut = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1).toISOString().slice(0, 10)
    return { debut }
  }
  if (periode === '30j') {
    const d = new Date(aujourdhui)
    d.setDate(d.getDate() - 30)
    return { debut: d.toISOString().slice(0, 10) }
  }
  return null
}

// Vue transverse sur l'historique complet, filtrable par compte / catégorie
// / période — la création reste scopée à un mois (détail du mois), mais
// consulter et corriger un mouvement ancien doit rester possible sans avoir
// à deviner dans quel mois il tombe.
export default function TousMouvementsModal({ transactions, comptes, categories, onClose }) {
  const [filtres, setFiltres] = useState(FILTRES_VIDES)
  const [edition, setEdition] = useState(null)

  const supprimer = async (t) => {
    if (confirm(`Supprimer le mouvement « ${t.libelle} » ?`)) await db.transactions.delete(t.id)
  }

  const borne = bornesPeriode(filtres.periode)
  const filtrees = transactions
    .filter((t) => {
      if (filtres.compteId && t.compteId !== Number(filtres.compteId)) return false
      if (filtres.categorieId && t.categorieId !== Number(filtres.categorieId)) return false
      if (borne && t.date < borne.debut) return false
      return true
    })
    .sort((a, b) => b.date.localeCompare(a.date))

  return (
    <Modal titre="Tous les mouvements" onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <select
            className={inputCls}
            value={filtres.compteId}
            onChange={(e) => setFiltres({ ...filtres, compteId: e.target.value })}
          >
            <option value="">Tous comptes</option>
            {comptes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
          <select
            className={inputCls}
            value={filtres.categorieId}
            onChange={(e) => setFiltres({ ...filtres, categorieId: e.target.value })}
          >
            <option value="">Toutes catégories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
          <select
            className={inputCls}
            value={filtres.periode}
            onChange={(e) => setFiltres({ ...filtres, periode: e.target.value })}
          >
            <option value="tout">Tout</option>
            <option value="mois">Ce mois-ci</option>
            <option value="30j">30 derniers jours</option>
          </select>
        </div>

        {filtrees.length === 0 ? (
          <p className="rounded-lg bg-slate-800 p-3 text-center text-xs text-slate-500">Aucun mouvement.</p>
        ) : (
          <ul className="max-h-[55vh] divide-y divide-slate-700 overflow-y-auto rounded-lg bg-slate-800">
            {filtrees.map((t) => {
              const compte = comptes.find((c) => c.id === t.compteId)
              const categorie = categories.find((c) => c.id === t.categorieId)
              return (
                <li key={t.id} className="flex items-center justify-between px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm text-slate-200">{t.libelle}</div>
                    <div className="truncate text-xs text-slate-500">
                      {formatDate(t.date)} · {compte?.nom} · {categorie?.nom}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`text-sm font-medium ${t.montant < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {formatMontant(t.montant)}
                    </span>
                    <button onClick={() => setEdition(t)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-700">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => supprimer(t)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-700">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {edition && (
        <TransactionFormModal
          transaction={edition}
          comptes={comptes}
          categories={categories}
          onClose={() => setEdition(null)}
        />
      )}
    </Modal>
  )
}
