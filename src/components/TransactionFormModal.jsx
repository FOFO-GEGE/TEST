import { useState } from 'react'
import { db } from '../db.js'
import Modal from './Modal.jsx'

const inputCls =
  'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none'
const labelCls = 'mb-1 block text-xs font-medium text-slate-400'

// Édition complète d'un mouvement existant (date, montant signé, compte,
// catégorie, note) — la création rapide reste dans le détail d'un mois.
export default function TransactionFormModal({ transaction, comptes, categories, onClose }) {
  const [edition, setEdition] = useState({ ...transaction, note: transaction.note ?? '' })

  const enregistrer = async (e) => {
    e.preventDefault()
    const donnees = {
      date: edition.date,
      libelle: edition.libelle.trim(),
      montant: Number(edition.montant),
      compteId: Number(edition.compteId),
      categorieId: Number(edition.categorieId),
      note: edition.note || null,
    }
    if (!donnees.libelle || !donnees.montant) return
    await db.transactions.update(edition.id, donnees)
    onClose()
  }

  return (
    <Modal titre="Modifier le mouvement" onClose={onClose}>
      <form onSubmit={enregistrer} className="space-y-3">
        <div>
          <label className={labelCls}>Libellé</label>
          <input
            className={inputCls}
            value={edition.libelle}
            onChange={(e) => setEdition({ ...edition, libelle: e.target.value })}
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Montant (signé)</label>
            <input
              type="number"
              step="0.01"
              className={inputCls}
              value={edition.montant}
              onChange={(e) => setEdition({ ...edition, montant: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>Date</label>
            <input
              type="date"
              className={inputCls}
              value={edition.date}
              onChange={(e) => setEdition({ ...edition, date: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className={labelCls}>Compte</label>
          <select
            className={inputCls}
            value={edition.compteId}
            onChange={(e) => setEdition({ ...edition, compteId: e.target.value })}
          >
            {comptes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Catégorie</label>
          <select
            className={inputCls}
            value={edition.categorieId}
            onChange={(e) => setEdition({ ...edition, categorieId: e.target.value })}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Note (optionnel)</label>
          <input
            className={inputCls}
            value={edition.note}
            onChange={(e) => setEdition({ ...edition, note: e.target.value })}
          />
        </div>
        <button type="submit" className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white">
          Enregistrer
        </button>
      </form>
    </Modal>
  )
}
