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
      <div className="p-5">
        <h1 className="mb-4 font-display text-2xl italic text-ink">Prévisionnel</h1>
        <p className="rounded-2xl bg-card p-6 text-center text-sm text-ink-muted">
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
  const aujourdhuiLabel = format(new Date(), 'EEEE d MMMM', { locale: fr })

  return (
    <div>
      <ExportReminderBanner />

      <div className="p-5">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <div className="label">{aujourdhuiLabel}</div>
            <h1 className="mt-0.5 font-display text-3xl italic text-ink">Reste à vivre</h1>
          </div>
          <button
            onClick={() => setTousMouvementsOuvert(true)}
            className="flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-2 text-xs font-medium text-ink"
          >
            <List size={14} /> Mouvements
          </button>
        </div>

        <div className="mb-3">
          <div className="font-display text-6xl italic leading-none text-ink">
            {formatMontant(resteAVivre.resteAVivre)}
          </div>
          {resteAVivre.prochaineDatePaie ? (
            <>
              <div className="mt-3 flex gap-5 text-sm text-ink-muted">
                <span>
                  <span className="font-medium text-ink">{resteAVivre.joursRestants}</span> jours restants
                </span>
                <span>
                  <span className="font-medium text-ink">{formatMontant(resteAVivre.montantParJour)}</span> / jour
                </span>
              </div>
              <div className="mt-1 text-sm text-ink-muted">
                Prochaine paie le {formatDate(resteAVivre.prochaineDatePaie)}
              </div>
            </>
          ) : (
            <div className="mt-3 text-sm text-ink-muted">
              Ajoutez une charge de type revenu pour calculer la période jusqu'à la prochaine paie.
            </div>
          )}
        </div>

        {alerteSeuil && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 text-xs text-gold">
            <AlertTriangle size={16} className="shrink-0" />
            <span>
              Solde projeté sous le seuil ({formatMontant(seuil)}) le {formatDate(alerteSeuil.date)} :{' '}
              {formatMontant(alerteSeuil.solde)}.
            </span>
          </div>
        )}

        <div className="mb-2 flex items-center justify-between">
          <div className="label">Trajectoire · 12 mois</div>
        </div>

        <div className="mb-6 h-56 rounded-2xl bg-card p-3 pr-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={donneesGraphique} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#ddd7c8" strokeDasharray="2 4" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#8c8676' }}
                tickFormatter={(d) => d.slice(5)}
                minTickGap={40}
                axisLine={{ stroke: '#ddd7c8' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#8c8676' }}
                width={52}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: '#f6f3ec',
                  border: '1px solid #ddd7c8',
                  borderRadius: 12,
                  fontSize: 12,
                }}
                labelStyle={{ color: '#8c8676' }}
                formatter={(v) => [formatMontant(v), 'Solde']}
              />
              <ReferenceLine y={seuil} stroke="#a9793a" strokeDasharray="3 4" strokeOpacity={0.6} />
              <Line type="stepAfter" dataKey="solde" stroke="#211d17" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mb-2 flex items-center justify-between">
          <div className="label">Détail par mois</div>
          <div className="text-[11px] text-ink-muted">Touchez un mois pour l'ajuster</div>
        </div>

        <div className="overflow-hidden rounded-2xl bg-card">
          {mensuel.map((m, i) => {
            const enAlerte = alertes.has(m.mois)
            return (
              <button
                key={m.mois}
                onClick={() => setMoisSelectionne(m.mois)}
                className={`flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors active:bg-subtle ${
                  i > 0 ? 'border-t border-line' : ''
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium capitalize text-ink">
                    {format(parseISO(`${m.mois}-01`), 'MMM yyyy', { locale: fr })}
                  </span>
                  {enAlerte && <AlertTriangle size={13} className="text-gold" />}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right text-xs text-ink-muted">
                    <div className="text-moss">{formatMontant(m.revenus)}</div>
                    <div className="text-rust">{formatMontant(m.depenses)}</div>
                  </div>
                  <div className={`w-24 text-right text-sm font-medium ${enAlerte ? 'text-gold' : 'text-ink'}`}>
                    {formatMontant(m.soldeFinDeMois)}
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-ink-muted" />
                </div>
              </button>
            )
          })}
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
