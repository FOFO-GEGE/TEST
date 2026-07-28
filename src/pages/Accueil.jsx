import { useLiveQuery } from 'dexie-react-hooks'
import { CheckCircle } from 'lucide-react'
import { db } from '../db.js'
import { formatMontant, formatDate, todayISO } from '../lib/format.js'
import { soldeCompte, totalComptesCourants } from '../lib/soldes.js'
import { calculerResteAVivre, estRapprochee } from '../lib/resteAVivre.js'
import { getOccurrences } from '../lib/occurrences.js'
import ExportReminderBanner from '../components/ExportReminderBanner.jsx'

export default function Accueil() {
  const comptes = useLiveQuery(() => db.comptes.toArray(), [])
  const charges = useLiveQuery(() => db.chargesRecurrentes.toArray(), [])
  const transactions = useLiveQuery(() => db.transactions.toArray(), [])
  const categories = useLiveQuery(() => db.categories.toArray(), [])

  if (!comptes || !charges || !transactions || !categories) return null

  const comptesActifs = comptes.filter((c) => !c.archive)
  const soldeCourants = totalComptesCourants(comptes, transactions)

  const resultat = calculerResteAVivre({
    charges,
    transactions,
    soldeComptesCourants: soldeCourants,
    aujourdHui: new Date(),
  })

  const dans30Jours = new Date()
  dans30Jours.setDate(dans30Jours.getDate() + 30)
  const echeances = getOccurrences(charges, todayISO(), dans30Jours.toISOString().slice(0, 10))

  const rapprocher = async (occurrence) => {
    const charge = charges.find((c) => c.id === occurrence.chargeId)
    if (!charge) return
    await db.transactions.add({
      date: occurrence.date,
      libelle: occurrence.libelle,
      montant: occurrence.type === 'depense' ? -Math.abs(occurrence.montant) : Math.abs(occurrence.montant),
      compteId: charge.compteId,
      categorieId: charge.categorieId,
      chargeId: charge.id,
      note: null,
    })
  }

  return (
    <div>
      <ExportReminderBanner />

      <div className="p-4">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-900 p-5 text-center shadow-lg">
          <div className="text-xs uppercase tracking-wide text-emerald-200">Reste à vivre</div>
          <div className="mt-1 text-4xl font-bold text-white">{formatMontant(resultat.resteAVivre)}</div>
          <div className="mt-2 flex justify-center gap-4 text-xs text-emerald-200">
            <span>{resultat.joursRestants} jours restants</span>
            <span>{formatMontant(resultat.montantParJour)} / jour</span>
          </div>
          {resultat.prochaineDatePaie && (
            <div className="mt-1 text-xs text-emerald-300">Prochaine paie le {formatDate(resultat.prochaineDatePaie)}</div>
          )}
        </div>

        <div className="mt-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Comptes</h2>
          {comptesActifs.length === 0 ? (
            <p className="rounded-xl bg-slate-900 p-6 text-center text-sm text-slate-500">
              Ajoutez un compte dans les réglages pour commencer.
            </p>
          ) : (
            <ul className="divide-y divide-slate-800 rounded-xl bg-slate-900">
              {comptesActifs.map((c) => (
                <li key={c.id} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-slate-200">{c.nom}</span>
                  <span className="text-sm font-medium text-slate-100">{formatMontant(soldeCompte(c, transactions))}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Échéances des 30 prochains jours
          </h2>
          {echeances.length === 0 ? (
            <p className="rounded-xl bg-slate-900 p-6 text-center text-sm text-slate-500">Aucune échéance à venir.</p>
          ) : (
            <ul className="divide-y divide-slate-800 rounded-xl bg-slate-900">
              {echeances.map((o, i) => {
                const rapprochee = estRapprochee(o, transactions)
                const categorie = categories.find(
                  (cat) => cat.id === charges.find((c) => c.id === o.chargeId)?.categorieId
                )
                return (
                  <li key={`${o.chargeId}-${o.date}-${i}`} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-slate-100">{o.libelle}</div>
                      <div className="text-xs text-slate-500">
                        {formatDate(o.date)} · {categorie?.nom}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${o.type === 'depense' ? 'text-red-400' : 'text-emerald-400'}`}>
                        {o.type === 'depense' ? '-' : '+'}
                        {formatMontant(o.montant)}
                      </span>
                      {rapprochee ? (
                        <CheckCircle size={20} className="text-emerald-500" />
                      ) : (
                        <button
                          onClick={() => rapprocher(o)}
                          className="rounded-lg border border-emerald-700 px-2 py-1 text-xs font-medium text-emerald-400"
                        >
                          Valider
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
