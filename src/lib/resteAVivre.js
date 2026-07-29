import { startOfMonth, endOfMonth, format } from 'date-fns'
import { getOccurrences } from './occurrences.js'

/**
 * Fonction pure, sans dépendance à Dexie.
 *
 * Le reste à vivre est calculé sur le mois calendaire en cours (du 1er au
 * dernier jour), pas par rapport au solde des comptes ni à la prochaine
 * paie : c'est la différence entre les entrées et les sorties du mois. Sans
 * aucun mouvement ni charge sur la période, il vaut donc 0.
 *
 * Les charges prises en compte sont celles réellement marquées sur le mois
 * (occurrences après application des ajustements — montant modifié ou
 * échéance annulée), pas la liste brute des charges récurrentes.
 */
export function calculerResteAVivre({ charges, transactions, ajustements = [], aujourdHui = new Date() }) {
  const debutMois = format(startOfMonth(aujourdHui), 'yyyy-MM-dd')
  const finMois = format(endOfMonth(aujourdHui), 'yyyy-MM-dd')

  const occurrences = getOccurrences(charges, debutMois, finMois, ajustements)
  const transactionsDuMois = transactions.filter((t) => t.date >= debutMois && t.date <= finMois)

  const revenusPrevus = occurrences.filter((o) => o.type === 'revenu')
  const depensesPrevues = occurrences.filter((o) => o.type === 'depense')

  const totalRevenus =
    revenusPrevus.reduce((s, o) => s + o.montant, 0) +
    transactionsDuMois.filter((t) => t.montant > 0).reduce((s, t) => s + t.montant, 0)
  const totalDepenses =
    depensesPrevues.reduce((s, o) => s + o.montant, 0) +
    transactionsDuMois.filter((t) => t.montant < 0).reduce((s, t) => s - t.montant, 0)

  return {
    resteAVivre: totalRevenus - totalDepenses,
    totalRevenus,
    totalDepenses,
    debutMois,
    finMois,
    depensesPrevues,
    revenusPrevus,
  }
}
