import { addDays, differenceInCalendarDays, format } from 'date-fns'
import { getOccurrences, estRapprochee } from './occurrences.js'

export { estRapprochee }

// Le cycle le plus long possible (fréquence annuelle) est 12 mois : une
// fenêtre de recherche de 400 jours garantit de croiser la prochaine
// occurrence de revenu si une charge de revenu active existe.
const FENETRE_RECHERCHE_JOURS = 400

/**
 * Fonction pure, sans dépendance à Dexie.
 *
 * Une occurrence déjà rapprochée correspond à une transaction réelle déjà
 * comptée dans soldeComptesCourants : elle est donc exclue du calcul aussi
 * bien côté dépenses que côté revenus, pour éviter un double comptage.
 */
export function calculerResteAVivre({
  charges,
  transactions,
  ajustements = [],
  soldeComptesCourants,
  aujourdHui = new Date(),
}) {
  const dateDebut = format(aujourdHui, 'yyyy-MM-dd')
  const dateFinRecherche = format(addDays(aujourdHui, FENETRE_RECHERCHE_JOURS), 'yyyy-MM-dd')
  const occurrences = getOccurrences(charges, dateDebut, dateFinRecherche, ajustements)

  const prochainRevenu = occurrences.find((o) => o.type === 'revenu')
  const dateLimite = prochainRevenu ? prochainRevenu.date : dateFinRecherche
  const dansLaPeriode = occurrences.filter((o) => o.date <= dateLimite)

  const depensesPrevues = dansLaPeriode.filter((o) => o.type === 'depense' && !estRapprochee(o, transactions))
  const revenusPrevus = dansLaPeriode.filter(
    (o) => o.type === 'revenu' && o !== prochainRevenu && !estRapprochee(o, transactions)
  )

  const totalDepenses = depensesPrevues.reduce((s, o) => s + o.montant, 0)
  const totalRevenus = revenusPrevus.reduce((s, o) => s + o.montant, 0)

  const resteAVivre = soldeComptesCourants - totalDepenses + totalRevenus

  const joursRestants = prochainRevenu
    ? Math.max(1, differenceInCalendarDays(new Date(prochainRevenu.date), aujourdHui))
    : FENETRE_RECHERCHE_JOURS

  return {
    resteAVivre,
    joursRestants,
    montantParJour: resteAVivre / joursRestants,
    prochaineDatePaie: prochainRevenu?.date ?? null,
    depensesPrevues,
    revenusPrevus,
  }
}
