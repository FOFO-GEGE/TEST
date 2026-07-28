import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Pencil, Power } from 'lucide-react'
import { db } from '../db.js'
import { formatMontant } from '../lib/format.js'
import ChargeFormModal, { FREQUENCES } from '../components/ChargeFormModal.jsx'

export default function Charges() {
  const charges = useLiveQuery(() => db.chargesRecurrentes.toArray(), [])
  const comptes = useLiveQuery(() => db.comptes.toArray(), [])
  const categories = useLiveQuery(() => db.categories.toArray(), [])
  const [edition, setEdition] = useState(null)
  const [ajoutOuvert, setAjoutOuvert] = useState(false)

  const basculerActive = (c) => db.chargesRecurrentes.update(c.id, { active: !c.active })

  if (!charges || !comptes || !categories) return null

  const groupes = FREQUENCES.map((f) => ({
    ...f,
    charges: charges.filter((c) => c.frequence === f.id),
  })).filter((g) => g.charges.length > 0)

  const totalMensuelLisse = charges
    .filter((c) => c.active && c.type === 'depense')
    .reduce((somme, c) => {
      const diviseur = FREQUENCES.find((f) => f.id === c.frequence)?.diviseur ?? 1
      return somme + c.montant / diviseur
    }, 0)

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-100">Charges récurrentes</h1>
        <button
          onClick={() => setAjoutOuvert(true)}
          disabled={comptes.length === 0 || categories.length === 0}
          className="flex items-center gap-1 text-sm text-emerald-400 disabled:opacity-40"
        >
          <Plus size={16} /> Ajouter
        </button>
      </div>

      <div className="mb-4 rounded-xl bg-slate-900 p-4">
        <div className="text-xs text-slate-400">Total mensuel lissé des dépenses</div>
        <div className="text-lg font-semibold text-slate-100">{formatMontant(totalMensuelLisse)}</div>
      </div>

      {comptes.length === 0 || categories.length === 0 ? (
        <p className="rounded-xl bg-slate-900 p-6 text-center text-sm text-slate-500">
          Créez d'abord un compte et une catégorie dans les réglages.
        </p>
      ) : (
        charges.length === 0 && (
          <p className="rounded-xl bg-slate-900 p-6 text-center text-sm text-slate-500">
            Aucune charge récurrente. Ajoutez votre premier loyer, abonnement ou salaire.
          </p>
        )
      )}

      {groupes.map((groupe) => (
        <div key={groupe.id} className="mb-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">{groupe.label}</h2>
          <ul className="divide-y divide-slate-800 rounded-xl bg-slate-900">
            {groupe.charges.map((c) => {
              const compte = comptes.find((cp) => cp.id === c.compteId)
              const categorie = categories.find((cat) => cat.id === c.categorieId)
              return (
                <li key={c.id} className={`flex items-center justify-between px-4 py-3 ${c.active ? '' : 'opacity-50'}`}>
                  <div>
                    <div className="text-sm font-medium text-slate-100">{c.libelle}</div>
                    <div className="text-xs text-slate-500">
                      {compte?.nom} · {categorie?.nom} · jour {c.jourPrelevement}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${c.type === 'depense' ? 'text-red-400' : 'text-emerald-400'}`}>
                      {c.type === 'depense' ? '-' : '+'}
                      {formatMontant(c.montant)}
                    </span>
                    <button onClick={() => basculerActive(c)} className="rounded-full p-2 text-slate-400 hover:bg-slate-800">
                      <Power size={16} />
                    </button>
                    <button onClick={() => setEdition(c)} className="rounded-full p-2 text-slate-400 hover:bg-slate-800">
                      <Pencil size={16} />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ))}

      {ajoutOuvert && (
        <ChargeFormModal charge={null} comptes={comptes} categories={categories} onClose={() => setAjoutOuvert(false)} />
      )}
      {edition && (
        <ChargeFormModal charge={edition} comptes={comptes} categories={categories} onClose={() => setEdition(null)} />
      )}
    </div>
  )
}
