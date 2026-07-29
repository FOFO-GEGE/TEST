import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { AlertTriangle, ChevronRight, List } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { db } from '../db.js'
import { totalComptesCourants } from '../lib/soldes.js'
import { projeterSoldeJournalier, resumeMensuel, moisAvecAlerte, premierePassageSousSeuil } from '../lib/projection.js'
import { calculerResteAVivre } from '../lib/resteAVivre.js'
import { getSeuilAlerte } from '../lib/parametres.js'
import { formatMontant, formatDate, todayISO } from '../lib/format.js'
import MoisDetailModal from '../components/MoisDetailModal.jsx'
import TousMouvementsModal from '../components/TousMouvementsModal.jsx'
import ExportReminderBanner from '../components/ExportReminderBanner.jsx'

export default function Previsionnel() {
  const comptes = useLiveQuery(() => db.comptes.toArray(), [])
  const charges = useLiveQuery(() => db.chargesRecurrentes.toArray(), [])
  const transactions = useLiveQuery(() => db.transactions.toArray(), [])
  const categories = useLiveQuery(() => db.categories.toArray(), [])
  const ajustements = useLiveQuery(() => db.ajustements.toArray(), [])
  const [moisSelectionne, setMoisSelectionne] = useState(null)
  const [tousMouvementsOuvert, setTousMouvementsOuvert] = useState(false)

  if (!comptes || !charges || !transactions || !categories || !ajustements) return null

  const comptesCourants = comptes.filter((c) => c.type === 'courant' && !c.archive)
  if (comptesCourants.length === 0) {
    return (
      <div className="p-4">
        <h1 className="mb-4 text-xl font-semibold text-slate-100">Prévisionnel 12 mois</h1>
        <p className="rounded-xl bg-slate-900 p-6 text-center text-sm text-slate-500">
          Ajoutez un compte courant dans les réglages pour voir la projection.
        </p>
      </div>
    )
  }

  const comptesCourantsIds = new Set(comptesCourants.map((c) => c.id))
  const chargesCourantes = charges.filter((c) => comptesCourantsIds.has(c.compteId))
  const dateDebut = todayISO()
  const soldeDepart = totalComptesCourants(comptes, transactions)
  // La projection reçoit toutes les transactions des comptes courants : les
  // futures alimentent la courbe à leur date, et l'ensemble sert à écarter
  // les échéances déjà validées pour ne pas les compter deux fois.
  const transactionsCourantes = transactions.filter((t) => comptesCourantsIds.has(t.compteId))
  const seuil = getSeuilAlerte()

  const points = projeterSoldeJournalier({
    soldeDepart,
    charges: chargesCourantes,
    ajustements,
    transactions: transactionsCourantes,
    dateDebut,
    nombreJours: 365,
  })
  const mensuel = resumeMensuel({
    soldeDepart,
    charges: chargesCourantes,
    ajustements,
    transactions: transactionsCourantes,
    dateDebut,
    nombreMois: 12,
  })
  const alertes = moisAvecAlerte(points, seuil)
  const alerteSeuil = premierePassageSousSeuil(points, seuil)
  const resteAVivre = calculerResteAVivre({
    charges: chargesCourantes,
    transactions: transactionsCourantes,
    ajustements,
    soldeComptesCourants: soldeDepart,
    aujourdHui: new Date(),
  })

  const donneesGraphique = points.map((p) => ({ date: p.date, solde: Math.round(p.solde * 100) / 100 }))

  return (
    <div>
      <ExportReminderBanner />

      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-100">Prévisionnel 12 mois</h1>
          <button
            onClick={() => setTousMouvementsOuvert(true)}
            className="flex items-center gap-1 text-sm text-emerald-400"
          >
            <List size={16} /> Tous les mouvements
          </button>
        </div>

        <div className="mb-3 rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-900 p-4 text-center shadow-lg">
          <div className="text-xs uppercase tracking-wide text-emerald-200">Reste à vivre</div>
          <div className="mt-0.5 text-3xl font-bold text-white">{formatMontant(resteAVivre.resteAVivre)}</div>
          <div className="mt-1 flex justify-center gap-4 text-xs text-emerald-200">
            <span>{resteAVivre.joursRestants} jours restants</span>
            <span>{formatMontant(resteAVivre.montantParJour)} / jour</span>
          </div>
          {resteAVivre.prochaineDatePaie && (
            <div className="mt-1 text-xs text-emerald-300">
              Prochaine paie le {formatDate(resteAVivre.prochaineDatePaie)}
            </div>
          )}
        </div>

        {alerteSeuil && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-xs text-red-300">
            <AlertTriangle size={16} className="shrink-0" />
            <span>
              Solde projeté sous le seuil ({formatMontant(seuil)}) le {formatDate(alerteSeuil.date)} :{' '}
              {formatMontant(alerteSeuil.solde)}.
            </span>
          </div>
        )}

        <p className="mb-4 text-xs text-slate-500">
          Touchez un mois pour voir son détail, ajuster une charge ou ajouter un mouvement.
        </p>

      <div className="mb-6 h-64 rounded-xl bg-slate-900 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={donneesGraphique}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickFormatter={(d) => d.slice(5)}
              minTickGap={40}
            />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} width={60} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #334155', fontSize: 12 }}
              labelStyle={{ color: '#94a3b8' }}
              formatter={(v) => [formatMontant(v), 'Solde']}
            />
            <ReferenceLine y={seuil} stroke="#f59e0b" strokeDasharray="4 4" />
            <Line type="stepAfter" dataKey="solde" stroke="#34d399" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-hidden rounded-xl bg-slate-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2">Mois</th>
              <th className="px-3 py-2 text-right">Revenus</th>
              <th className="px-3 py-2 text-right">Charges</th>
              <th className="px-3 py-2 text-right">Solde fin de mois</th>
            </tr>
          </thead>
          <tbody>
            {mensuel.map((m) => {
              const enAlerte = alertes.has(m.mois)
              return (
                <tr
                  key={m.mois}
                  onClick={() => setMoisSelectionne(m.mois)}
                  className="cursor-pointer border-b border-slate-800 last:border-0 hover:bg-slate-800/60 active:bg-slate-800"
                >
                  <td className="px-3 py-3 text-slate-200">
                    <span className="flex items-center gap-1">
                      {format(parseISO(`${m.mois}-01`), 'MMM yyyy', { locale: fr })}
                      {enAlerte && <AlertTriangle size={13} className="text-amber-400" />}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right text-emerald-400">{formatMontant(m.revenus)}</td>
                  <td className="px-3 py-3 text-right text-red-400">{formatMontant(m.depenses)}</td>
                  <td className={`px-3 py-3 text-right font-medium ${enAlerte ? 'text-amber-400' : 'text-slate-100'}`}>
                    {formatMontant(m.soldeFinDeMois)}
                  </td>
                  <td className="pr-2 text-slate-500">
                    <ChevronRight size={16} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

        {moisSelectionne && (
          <MoisDetailModal
            mois={moisSelectionne}
            charges={chargesCourantes}
            ajustements={ajustements}
            transactions={transactionsCourantes}
            comptes={comptesCourants}
            categories={categories}
            onClose={() => setMoisSelectionne(null)}
          />
        )}

        {tousMouvementsOuvert && (
          <TousMouvementsModal
            transactions={transactions}
            comptes={comptes}
            categories={categories}
            onClose={() => setTousMouvementsOuvert(false)}
          />
        )}
      </div>
    </div>
  )
}
