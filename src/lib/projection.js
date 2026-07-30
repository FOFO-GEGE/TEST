import { addDays, addMonths, format, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { getOccurrences } from './occurrences.js'

const JOURS_PROJECTION_DEFAUT = 365

/**
 * Fonction pure : projette le solde jour par jour à partir des occurrences
 * prévues des charges récurrentes et des transactions réelles déjà
 * enregistrées mais datées dans le futur (ex. saisie à l'avance). Chaque
 * mouvement n'impacte le solde qu'à sa date réelle, jamais avant — sinon un
 * mouvement d'octobre fausserait déjà la courbe dès aujourd'hui.
 */
export function projeterSoldeJournalier({
  soldeDepart,
  charges,
  ajustements = [],
  transactions = [],
  dateDebut,
  nombreJours = JOURS_PROJECTION_DEFAUT,
}) {
  const debut = parseISO(dateDebut)
  const dateFin = format(addDays(debut, nombreJours), 'yyyy-MM-dd')
  const occurrences = getOccurrences(charges, dateDebut, dateFin, ajustements)
  const transactionsFutures = transactions.filter((t) => t.date > dateDebut)

  const variationParJour = new Map()
  for (const o of occurrences) {
    const signe = o.type === 'depense' ? -1 : 1
    variationParJour.set(o.date, (variationParJour.get(o.date) || 0) + signe * o.montant)
  }
  for (const t of transactionsFutures) {
    variationParJour.set(t.date, (variationParJour.get(t.date) || 0) + t.montant)
  }

  const points = []
  let solde = soldeDepart
  for (let i = 0; i <= nombreJours; i++) {
    const date = format(addDays(debut, i), 'yyyy-MM-dd')
    solde += variationParJour.get(date) || 0
    points.push({ date, solde })
  }
  return points
}

export function resumeMensuel({
  soldeDepart,
  charges,
  ajustements = [],
  transactions = [],
  dateDebut,
  nombreMois = 12,
}) {
  const debut = parseISO(dateDebut)
  const dateFin = format(endOfMonth(addMonths(debut, nombreMois - 1)), 'yyyy-MM-dd')
  const occurrences = getOccurrences(charges, dateDebut, dateFin, ajustements)
  const transactionsFutures = transactions.filter((t) => t.date > dateDebut)

  const mois = []
  let solde = soldeDepart
  for (let i = 0; i < nombreMois; i++) {
    const debutMois = format(startOfMonth(addMonths(debut, i)), 'yyyy-MM-dd')
    const finMois = format(endOfMonth(addMonths(debut, i)), 'yyyy-MM-dd')

    const occurrencesDuMois = occurrences.filter((o) => o.date >= debutMois && o.date <= finMois)
    const transactionsDuMois = transactionsFutures.filter((t) => t.date >= debutMois && t.date <= finMois)

    const revenus =
      occurrencesDuMois.filter((o) => o.type === 'revenu').reduce((s, o) => s + o.montant, 0) +
      transactionsDuMois.filter((t) => t.montant > 0).reduce((s, t) => s + t.montant, 0)
    const depenses =
      occurrencesDuMois.filter((o) => o.type === 'depense').reduce((s, o) => s + o.montant, 0) +
      transactionsDuMois.filter((t) => t.montant < 0).reduce((s, t) => s - t.montant, 0)

    solde += revenus - depenses
    mois.push({ mois: format(addMonths(debut, i), 'yyyy-MM'), revenus, depenses, soldeFinDeMois: solde })
  }
  return mois
}

export function premierePassageSousSeuil(pointsJournaliers, seuil) {
  return pointsJournaliers.find((p) => p.solde < seuil) ?? null
}

// Mois (au format yyyy-MM) où le solde journalier passe au moins un jour
// sous le seuil — plus précis qu'une simple comparaison sur le solde de fin
// de mois, qui peut masquer un creux en cours de mois.
export function moisAvecAlerte(pointsJournaliers, seuil) {
  const mois = new Set()
  for (const p of pointsJournaliers) {
    if (p.solde < seuil) mois.add(p.date.slice(0, 7))
  }
  return mois
}
