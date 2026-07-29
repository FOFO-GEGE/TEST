import { useState } from 'react'
import { parseISO, format, endOfMonth } from 'date-fns'
import { fr } from 'date-fns/locale'
import { CalendarCog, Repeat, Plus, ArrowDownCircle, ArrowUpCircle, Trash2, Pencil } from 'lucide-react'
import { db } from '../db.js'
import { getOccurrences } from '../lib/occurrences.js'
import { formatMontant, formatDate, todayISO } from '../lib/format.js'
import Modal from './Modal.jsx'
import ChargeFormModal from './ChargeFormModal.jsx'
import AjustementMoisModal from './AjustementMoisModal.jsx'
import TransactionFormModal from './TransactionFormModal.jsx'

const inputCls =
  'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none'
const labelCls = 'mb-1 block text-xs font-medium text-slate-400'

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
      <div className="space-y-5">
        <section>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Charges prévues</h3>
          {occurrences.length === 0 ? (
            <p className="rounded-lg bg-slate-800 p-3 text-center text-xs text-slate-500">
              Aucune charge prévue ce mois-ci.
            </p>
          ) : (
            <ul className="divide-y divide-slate-800 rounded-lg bg-slate-800">
              {occurrences.map((o, i) => {
                const charge = charges.find((c) => c.id === o.chargeId)
                return (
                  <li key={`${o.chargeId}-${o.date}-${i}`} className="px-3 py-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-sm text-slate-200">
                          {o.libelle}
                          {o.ajuste && (
                            <span className="rounded bg-amber-900/60 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                              ajusté
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">{formatDate(o.date)}</div>
                      </div>
                      <span className={`text-sm font-medium ${o.type === 'depense' ? 'text-red-400' : 'text-emerald-400'}`}>
                        {o.type === 'depense' ? '-' : '+'}
                        {formatMontant(o.montant)}
                      </span>
                    </div>
                    {charge && (
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => setChargeEnAjustement(charge)}
                          className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-emerald-800 py-1.5 text-xs font-medium text-emerald-400"
                        >
                          <CalendarCog size={13} /> Ce mois seulement
                        </button>
                        <button
                          onClick={() => setChargeEnEdition(charge)}
                          className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-700 py-1.5 text-xs font-medium text-slate-300"
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
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Mouvements réels du mois
          </h3>
          {mouvementsDuMois.length === 0 ? (
            <p className="rounded-lg bg-slate-800 p-3 text-center text-xs text-slate-500">
              Aucun mouvement saisi pour ce mois.
            </p>
          ) : (
            <ul className="divide-y divide-slate-700 rounded-lg bg-slate-800">
              {mouvementsDuMois.map((t) => {
                const categorie = categories.find((c) => c.id === t.categorieId)
                const compte = comptes.find((c) => c.id === t.compteId)
                return (
                  <li key={t.id} className="flex items-center justify-between px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm text-slate-200">{t.libelle}</div>
                      <div className="truncate text-xs text-slate-500">
                        {formatDate(t.date)} · {categorie?.nom} · {compte?.nom}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`text-sm font-medium ${t.montant < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {formatMontant(t.montant)}
                      </span>
                      <button
                        onClick={() => setMouvementEnEdition(t)}
                        className="rounded-full p-1.5 text-slate-400 hover:bg-slate-700"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => supprimerMouvement(t)}
                        className="rounded-full p-1.5 text-slate-400 hover:bg-slate-700"
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
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Ajouter un mouvement</h3>
          <form onSubmit={ajouterMouvement} className="space-y-2 rounded-lg bg-slate-800 p-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMouvement({ ...mouvement, signe: 'depense' })}
                className={`rounded-lg p-2 ${mouvement.signe === 'depense' ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-400'}`}
              >
                <ArrowDownCircle size={18} />
              </button>
              <button
                type="button"
                onClick={() => setMouvement({ ...mouvement, signe: 'revenu' })}
                className={`rounded-lg p-2 ${mouvement.signe === 'revenu' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400'}`}
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
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-1 rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white"
            >
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
