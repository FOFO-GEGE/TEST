import { useLiveQuery } from 'dexie-react-hooks'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { AlertTriangle } from 'lucide-react'
import { db } from '../db.js'
import { totalComptesCourants } from '../lib/soldes.js'
import { projeterSoldeJournalier, resumeMensuel, moisAvecAlerte } from '../lib/projection.js'
import { getSeuilAlerte } from '../lib/parametres.js'
import { formatMontant, todayISO } from '../lib/format.js'

export default function Previsionnel() {
  const comptes = useLiveQuery(() => db.comptes.toArray(), [])
  const charges = useLiveQuery(() => db.chargesRecurrentes.toArray(), [])
  const transactions = useLiveQuery(() => db.transactions.toArray(), [])

  if (!comptes || !charges || !transactions) return null

  if (comptes.filter((c) => c.type === 'courant' && !c.archive).length === 0) {
    return (
      <div className="p-4">
        <h1 className="mb-4 text-xl font-semibold text-slate-100">Prévisionnel 12 mois</h1>
        <p className="rounded-xl bg-slate-900 p-6 text-center text-sm text-slate-500">
          Ajoutez un compte courant dans les réglages pour voir la projection.
        </p>
      </div>
    )
  }

  const comptesCourantsIds = new Set(comptes.filter((c) => c.type === 'courant' && !c.archive).map((c) => c.id))
  const chargesCourantes = charges.filter((c) => comptesCourantsIds.has(c.compteId))
  const soldeDepart = totalComptesCourants(comptes, transactions)
  const dateDebut = todayISO()
  const seuil = getSeuilAlerte()

  const points = projeterSoldeJournalier({ soldeDepart, charges: chargesCourantes, dateDebut, nombreJours: 365 })
  const mensuel = resumeMensuel({ soldeDepart, charges: chargesCourantes, dateDebut, nombreMois: 12 })
  const alertes = moisAvecAlerte(points, seuil)

  const donneesGraphique = points.map((p) => ({ date: p.date, solde: Math.round(p.solde * 100) / 100 }))

  return (
    <div className="p-4">
      <h1 className="mb-1 text-xl font-semibold text-slate-100">Prévisionnel 12 mois</h1>
      <p className="mb-4 text-xs text-slate-500">
        Solde des comptes courants projeté à partir des charges récurrentes actives. Seuil d'alerte : {formatMontant(seuil)}.
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
                <tr key={m.mois} className="border-b border-slate-800 last:border-0">
                  <td className="flex items-center gap-1 px-3 py-2 text-slate-200">
                    {m.mois}
                    {enAlerte && <AlertTriangle size={13} className="text-amber-400" />}
                  </td>
                  <td className="px-3 py-2 text-right text-emerald-400">{formatMontant(m.revenus)}</td>
                  <td className="px-3 py-2 text-right text-red-400">{formatMontant(m.depenses)}</td>
                  <td className={`px-3 py-2 text-right font-medium ${enAlerte ? 'text-amber-400' : 'text-slate-100'}`}>
                    {formatMontant(m.soldeFinDeMois)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
