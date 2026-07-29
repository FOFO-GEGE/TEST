import { useState } from 'react'
import { db } from '../db.js'
import { formatMontant, todayISO } from '../lib/format.js'
import { calculerMensualites, calculerPeriodeCredit } from '../lib/credit.js'
import Modal from './Modal.jsx'
import { inputCls, labelCls, btnPrimaryCls } from './ui.js'

// Un crédit / achat en plusieurs fois n'est pas un nouveau concept dans le
// modèle : c'est une charge mensuelle ordinaire avec une date de fin fixée
// pour ne générer que N occurrences. Le montant est calculé à partir du
// total voulu, réparti sur les mensualités (dernier mois ajusté pour
// l'arrondi via le mécanisme d'ajustement déjà utilisé pour « ce mois
// seulement »).
export default function CreditFormModal({ comptes, categories, onClose }) {
  const categoriesDepense = categories.filter((c) => c.type === 'depense')
  const [form, setForm] = useState({
    libelle: '',
    montantTotal: '',
    nombreMois: 3,
    moisDepart: todayISO().slice(0, 7),
    jourPrelevement: 5,
    compteId: comptes.find((c) => !c.archive)?.id ?? comptes[0]?.id ?? '',
    categorieId: categoriesDepense[0]?.id ?? '',
  })

  const montantTotal = Number(form.montantTotal)
  const nombreMois = Math.max(1, Math.min(60, Number(form.nombreMois) || 1))
  const previsualisable = montantTotal > 0 && !!form.moisDepart

  const mensualites = previsualisable ? calculerMensualites(montantTotal, nombreMois) : []
  const periode = previsualisable ? calculerPeriodeCredit(form.moisDepart, nombreMois) : null

  const enregistrer = async (e) => {
    e.preventDefault()
    if (!form.libelle.trim() || !montantTotal || !form.compteId || !form.categorieId || !periode) return

    const [montantBase] = mensualites
    const montantDernier = mensualites[mensualites.length - 1]

    const chargeId = await db.chargesRecurrentes.add({
      libelle: form.libelle.trim(),
      montant: montantBase,
      type: 'depense',
      compteId: Number(form.compteId),
      categorieId: Number(form.categorieId),
      frequence: 'mensuel',
      jourPrelevement: Math.min(31, Math.max(1, Number(form.jourPrelevement) || 1)),
      moisReference: null,
      dateDebut: periode.dateDebut,
      dateFin: periode.dateFin,
      active: true,
    })

    if (montantDernier !== montantBase) {
      await db.ajustements.add({
        chargeId,
        mois: periode.dernierMois,
        montant: montantDernier,
        annulee: false,
      })
    }

    onClose()
  }

  return (
    <Modal titre="Crédit en plusieurs mois" onClose={onClose}>
      <form onSubmit={enregistrer} className="space-y-3">
        <div>
          <label className={labelCls}>Libellé</label>
          <input
            className={inputCls}
            value={form.libelle}
            onChange={(e) => setForm({ ...form, libelle: e.target.value })}
            placeholder="Canapé, réparation voiture…"
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Montant total</label>
            <input
              type="number"
              step="0.01"
              className={inputCls}
              value={form.montantTotal}
              onChange={(e) => setForm({ ...form, montantTotal: e.target.value })}
              placeholder="500.00"
            />
          </div>
          <div>
            <label className={labelCls}>Nombre de mois</label>
            <input
              type="number"
              min="1"
              max="60"
              className={inputCls}
              value={form.nombreMois}
              onChange={(e) => setForm({ ...form, nombreMois: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Premier mois</label>
            <input
              type="month"
              className={inputCls}
              value={form.moisDepart}
              onChange={(e) => setForm({ ...form, moisDepart: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>Jour de prélèvement</label>
            <input
              type="number"
              min="1"
              max="31"
              className={inputCls}
              value={form.jourPrelevement}
              onChange={(e) => setForm({ ...form, jourPrelevement: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className={labelCls}>Compte</label>
          <select
            className={inputCls}
            value={form.compteId}
            onChange={(e) => setForm({ ...form, compteId: e.target.value })}
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
            value={form.categorieId}
            onChange={(e) => setForm({ ...form, categorieId: e.target.value })}
          >
            {categoriesDepense.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </div>

        {previsualisable && (
          <div>
            <div className={labelCls}>Répartition</div>
            <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-card">
              {mensualites.map((montant, i) => {
                const mois = new Date(form.moisDepart + '-01')
                mois.setMonth(mois.getMonth() + i)
                return (
                  <li key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="capitalize text-ink-muted">
                      {mois.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                    </span>
                    <span className="font-medium text-rust">{formatMontant(montant)}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        <button type="submit" disabled={!previsualisable} className={btnPrimaryCls}>
          Enregistrer le crédit
        </button>
      </form>
    </Modal>
  )
}
