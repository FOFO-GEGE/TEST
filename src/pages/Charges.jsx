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
    <div className="p-5">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <div className="label">Charges</div>
          <h1 className="mt-0.5 font-display text-3xl italic text-ink">Récurrentes</h1>
        </div>
        <button
          onClick={() => setAjoutOuvert(true)}
          disabled={comptes.length === 0 || categories.length === 0}
          className="flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-xs font-medium text-cream disabled:opacity-30"
        >
          <Plus size={14} /> Ajouter
        </button>
      </div>

      <div className="mb-5 rounded-2xl bg-card p-4">
        <div className="label">Total mensuel lissé des dépenses</div>
        <div className="mt-1 font-display text-3xl italic text-ink">{formatMontant(totalMensuelLisse)}</div>
      </div>

      {comptes.length === 0 || categories.length === 0 ? (
        <p className="rounded-2xl bg-card p-6 text-center text-sm text-ink-muted">
          Créez d'abord un compte et une catégorie dans les réglages.
        </p>
      ) : (
        charges.length === 0 && (
          <p className="rounded-2xl bg-card p-6 text-center text-sm text-ink-muted">
            Aucune charge récurrente. Ajoutez votre premier loyer, abonnement ou salaire.
          </p>
        )
      )}

      {groupes.map((groupe) => (
        <div key={groupe.id} className="mb-5">
          <div className="label mb-2">{groupe.label}</div>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-card">
            {groupe.charges.map((c) => {
              const compte = comptes.find((cp) => cp.id === c.compteId)
              const categorie = categories.find((cat) => cat.id === c.categorieId)
              return (
                <li key={c.id} className={`flex items-center justify-between px-4 py-3.5 ${c.active ? '' : 'opacity-40'}`}>
                  <div>
                    <div className="text-sm font-medium text-ink">{c.libelle}</div>
                    <div className="text-xs text-ink-muted">
                      {compte?.nom} · {categorie?.nom} · jour {c.jourPrelevement}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`mr-1 text-sm font-medium ${c.type === 'depense' ? 'text-rust' : 'text-moss'}`}>
                      {c.type === 'depense' ? '-' : '+'}
                      {formatMontant(c.montant)}
                    </span>
                    <button onClick={() => basculerActive(c)} className="rounded-full p-2 text-ink-muted hover:bg-subtle">
                      <Power size={16} />
                    </button>
                    <button onClick={() => setEdition(c)} className="rounded-full p-2 text-ink-muted hover:bg-subtle">
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
