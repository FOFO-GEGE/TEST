import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { db } from '../db.js'
import { totalComptesCourants } from '../lib/soldes.js'
import { projeterSoldeJournalier, resumeMensuel, moisAvecAlerte } from '../lib/projection.js'
import { getSeuilAlerte } from '../lib/parametres.js'
import { formatMontant, todayISO } from '../lib/format.js'
import MoisDetailModal from '../components/MoisDetailModal.jsx'

export default function Previsionnel() {
  const comptes = useLiveQuery(() => db.comptes.toArray(), [])
  const charges = useLiveQuery(() => db.chargesRecurrentes.toArray(), [])
  const transactions = useLiveQuery(() => db.transactions.toArray(), [])
  const categories = useLiveQuery(() => db.categories.toArray(), [])
  const ajustements = useLiveQuery(() => db.ajustements.toArray(), [])
  const [moisSelectionne, setMoisSelectionne] = useState(null)

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

  const donneesGraphique = points.map((p) => ({ date: p.date, solde: Math.round(p.solde * 100) / 100 }))

  // Cliquer sur la courbe ouvre le mois du point touché, comme une ligne
  // du tableau : sur mobile c'est le geste le plus naturel pour « ce creux
  // de novembre, qu'est-ce qui le cause ? ».
  const ouvrirMoisDepuisGraphique = (etat) => {
    const dateCliquee = etat?.activeLabel
    if (typeof dateCliquee === 'string') setMoisSelectionne(dateCliquee.slice(0, 7))
  }

  return (
    <div className="p-4">
      <h1 className="mb-1 text-xl font-semibold text-slate-100">Prévisionnel 12 mois</h1>
      <p className="mb-4 text-xs text-slate-500">
        Solde des comptes courants projeté à partir des charges récurrentes actives. Seuil d'alerte : {formatMontant(seuil)}.
        Cliquez sur un mois pour réadapter une charge ou ajouter un mouvement exceptionnel.
      </p>

      <div className="mb-6 h-64 rounded-xl bg-slate-900 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={donneesGraphique} onClick={ouvrirMoisDepuisGraphique} style={{ cursor: 'pointer' }}>
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
          comptes={comptesCourants}
          categories={categories}
          onClose={() => setMoisSelectionne(null)}
        />
      )}
    </div>
  )
}
