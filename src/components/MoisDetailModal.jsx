import { useState } from 'react'
import { parseISO, format, endOfMonth } from 'date-fns'
import { fr } from 'date-fns/locale'
import { CalendarCog, Repeat, Plus, ArrowDownCircle, ArrowUpCircle, Trash2, Pencil } from 'lucide-react'
import { db } from '../db.js'
import { getOccurrences } from '../lib/occurrences.js'
import { formatMontant, formatDate, todayISO } from '../lib/format.js'
import Modal from './Modal.jsx'
import ChargeFormModal from './ChargeFormModal.jsx'
import CreditFormModal from './CreditFormModal.jsx'
import AjustementMoisModal from './AjustementMoisModal.jsx'
import TransactionFormModal from './TransactionFormModal.jsx'
import { inputCls, labelCls, btnPrimaryCls } from './ui.js'

const estCredit = (c) => c.creditMontantTotal != null

export default function MoisDetailModal({ mois, charges, ajustements, transactions, comptes, categories, onClose }) {
  const debutMois = parseISO(`${mois}-01`)
  const debutMoisISO = format(debutMois, 'yyyy-MM-dd')
  const finMoisISO = format(endOfMonth(debutMois), 'yyyy-MM-dd')
  const occurrences = getOccurrences(charges, debutMoisISO, finMoisISO, ajustements)
  const aujourdHui = todayISO()
  const dateParDefaut = aujourdHui >= debutMoisISO && aujourdHui <= finMoisISO ? aujourdHui : debutMoisISO

  const mouvementsDuMois = transactions
    .filter((t) => t.date >= debutMoisISO && t.date <= finMoisISO)
    .sort((a, b) => a.date.localeCompare(b.date))

  const [chargeEnEdition, setChargeEnEdition] = useState(null)
  const [creditEnEdition, setCreditEnEdition] = useState(null)
  const [chargeEnAjustement, setChargeEnAjustement] = useState(null)
  const [mouvementEnEdition, setMouvementEnEdition] = useState(null)
  const [mouvement, setMouvement] = useState({
    signe: 'depense',
    montant: '',
    libelle: '',
    categorieId: categories[0]?.id ?? '',
    compteId: comptes.find((c) => !c.archive)?.id ?? comptes[0]?.id ?? '',
    date: dateParDefaut,
  })

  const ajouterMouvement = async (e) => {
    e.preventDefault()
    const montant = Number(mouvement.montant)
    if (!montant || !mouvement.libelle.trim() || !mouvement.categorieId || !mouvement.compteId) return
    await db.transactions.add({
      date: mouvement.date,
      libelle: mouvement.libelle.trim(),
      montant: mouvement.signe === 'depense' ? -Math.abs(montant) : Math.abs(montant),
      compteId: Number(mouvement.compteId),
      categorieId: Number(mouvement.categorieId),
      chargeId: null,
      note: null,
    })
    setMouvement({ ...mouvement, montant: '', libelle: '' })
  }

  const supprimerMouvement = async (t) => {
    if (confirm(`Supprimer le mouvement « ${t.libelle} » ?`)) await db.transactions.delete(t.id)
  }

  return (
    <Modal titre={format(debutMois, 'MMMM yyyy', { locale: fr })} onClose={onClose}>
      <div className="space-y-6">
        <section>
          <div className="label mb-2">Charges prévues</div>
          {occurrences.length === 0 ? (
            <p className="rounded-2xl bg-card p-4 text-center text-xs text-ink-muted">Aucune charge prévue ce mois-ci.</p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-card">
              {occurrences.map((o, i) => {
                const charge = charges.find((c) => c.id === o.chargeId)
                return (
                  <li key={`${o.chargeId}-${o.date}-${i}`} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-sm text-ink">
                          {o.libelle}
                          {charge && estCredit(charge) && (
                            <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-medium text-gold">
                              crédit
                            </span>
                          )}
                          {o.ajuste && (
                            <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-medium text-gold">
                              ajusté
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-ink-muted">{formatDate(o.date)}</div>
                      </div>
                      <span className={`text-sm font-medium ${o.type === 'depense' ? 'text-rust' : 'text-moss'}`}>
                        {o.type === 'depense' ? '-' : '+'}
                        {formatMontant(o.montant)}
                      </span>
                    </div>
                    {charge && (
                      <div className="mt-2.5 flex gap-2">
                        <button
                          onClick={() => setChargeEnAjustement(charge)}
                          className="flex flex-1 items-center justify-center gap-1 rounded-full border border-line bg-white py-2 text-xs font-medium text-ink"
                        >
                          <CalendarCog size={13} /> Ce mois seulement
                        </button>
                        <button
                          onClick={() => (estCredit(charge) ? setCreditEnEdition(charge) : setChargeEnEdition(charge))}
                          className="flex flex-1 items-center justify-center gap-1 rounded-full py-2 text-xs font-medium text-ink-muted"
                        >
                          <Repeat size={13} /> Tous les mois
                        </button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section>
          <div className="label mb-2">Mouvements réels du mois</div>
          {mouvementsDuMois.length === 0 ? (
            <p className="rounded-2xl bg-card p-4 text-center text-xs text-ink-muted">
              Aucun mouvement saisi pour ce mois.
            </p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-card">
              {mouvementsDuMois.map((t) => {
                const categorie = categories.find((c) => c.id === t.categorieId)
                const compte = comptes.find((c) => c.id === t.compteId)
                return (
                  <li key={t.id} className="flex items-center justify-between px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm text-ink">{t.libelle}</div>
                      <div className="truncate text-xs text-ink-muted">
                        {formatDate(t.date)} · {categorie?.nom} · {compte?.nom}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <span className={`mr-1 text-sm font-medium ${t.montant < 0 ? 'text-rust' : 'text-moss'}`}>
                        {formatMontant(t.montant)}
                      </span>
                      <button
                        onClick={() => setMouvementEnEdition(t)}
                        className="rounded-full p-1.5 text-ink-muted hover:bg-subtle"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => supprimerMouvement(t)}
                        className="rounded-full p-1.5 text-ink-muted hover:bg-subtle"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section>
          <div className="label mb-2">Ajouter un mouvement</div>
          <form onSubmit={ajouterMouvement} className="space-y-2.5 rounded-2xl bg-card p-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMouvement({ ...mouvement, signe: 'depense' })}
                className={`rounded-full p-2.5 ${mouvement.signe === 'depense' ? 'bg-rust text-white' : 'bg-white text-ink-muted'}`}
              >
                <ArrowDownCircle size={18} />
              </button>
              <button
                type="button"
                onClick={() => setMouvement({ ...mouvement, signe: 'revenu' })}
                className={`rounded-full p-2.5 ${mouvement.signe === 'revenu' ? 'bg-moss text-white' : 'bg-white text-ink-muted'}`}
              >
                <ArrowUpCircle size={18} />
              </button>
              <input
                type="number"
                step="0.01"
                placeholder="Montant"
                className={inputCls}
                value={mouvement.montant}
                onChange={(e) => setMouvement({ ...mouvement, montant: e.target.value })}
              />
            </div>
            <input
              placeholder="Libellé"
              className={inputCls}
              value={mouvement.libelle}
              onChange={(e) => setMouvement({ ...mouvement, libelle: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                className={inputCls}
                value={mouvement.categorieId}
                onChange={(e) => setMouvement({ ...mouvement, categorieId: e.target.value })}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
              </select>
              <select
                className={inputCls}
                value={mouvement.compteId}
                onChange={(e) => setMouvement({ ...mouvement, compteId: e.target.value })}
              >
                {comptes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Date</label>
              <input
                type="date"
                className={inputCls}
                min={debutMoisISO}
                max={finMoisISO}
                value={mouvement.date}
                onChange={(e) => setMouvement({ ...mouvement, date: e.target.value })}
              />
            </div>
            <button type="submit" className={`flex items-center justify-center gap-1 ${btnPrimaryCls}`}>
              <Plus size={16} /> Ajouter le mouvement
            </button>
          </form>
        </section>
      </div>

      {chargeEnAjustement && (
        <AjustementMoisModal
          charge={chargeEnAjustement}
          mois={mois}
          ajustement={ajustements.find((a) => a.chargeId === chargeEnAjustement.id && a.mois === mois) ?? null}
          onClose={() => setChargeEnAjustement(null)}
        />
      )}

      {chargeEnEdition && (
        <ChargeFormModal
          charge={chargeEnEdition}
          comptes={comptes}
          categories={categories}
          onClose={() => setChargeEnEdition(null)}
        />
      )}

      {creditEnEdition && (
        <CreditFormModal
          charge={creditEnEdition}
          comptes={comptes}
          categories={categories}
          onClose={() => setCreditEnEdition(null)}
        />
      )}

      {mouvementEnEdition && (
        <TransactionFormModal
          transaction={mouvementEnEdition}
          comptes={comptes}
          categories={categories}
          onClose={() => setMouvementEnEdition(null)}
        />
      )}
    </Modal>
  )
}
