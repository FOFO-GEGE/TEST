import { addDays, differenceInCalendarDays, format } from 'date-fns'
import { getOccurrences } from './occurrences.js'

// Le cycle le plus long possible (fréquence annuelle) est 12 mois : une
// fenêtre de recherche de 400 jours garantit de croiser la prochaine
// occurrence de revenu si une charge de revenu active existe.
const FENETRE_RECHERCHE_JOURS = 400

/**
 * Fonction pure, sans dépendance à Dexie.
 *
 * Toute charge prévue est considérée comme certaine et comptée directement
 * — il n'y a pas de notion de rapprochement à vérifier ici.
 */
export function calculerResteAVivre({ charges, transactions, ajustements = [], soldeComptesCourants, aujourdHui = new Date() }) {
  const dateDebut = format(aujourdHui, 'yyyy-MM-dd')
  const dateFinRecherche = format(addDays(aujourdHui, FENETRE_RECHERCHE_JOURS), 'yyyy-MM-dd')
  const occurrences = getOccurrences(charges, dateDebut, dateFinRecherche, ajustements)

  const prochainRevenu = occurrences.find((o) => o.type === 'revenu')

  // Sans revenu prévu à l'horizon, il n'y a pas de borne significative pour
  // « la période jusqu'à la prochaine paie » : mieux vaut ne rien déduire
  // que soustraire arbitrairement toutes les charges des 400 prochains
  // jours, ce qui donnerait un chiffre absurde plutôt qu'un calcul correct.
  if (!prochainRevenu) {
    return {
      resteAVivre: soldeComptesCourants,
      joursRestants: null,
      montantParJour: null,
      prochaineDatePaie: null,
      depensesPrevues: [],
      revenusPrevus: [],
    }
  }

  const dateLimite = prochainRevenu.date
  const dansLaPeriode = occurrences.filter((o) => o.date <= dateLimite)

  const depensesPrevues = dansLaPeriode.filter((o) => o.type === 'depense')
  const revenusPrevus = dansLaPeriode.filter((o) => o.type === 'revenu' && o !== prochainRevenu)

  const totalDepenses = depensesPrevues.reduce((s, o) => s + o.montant, 0)
  const totalRevenus = revenusPrevus.reduce((s, o) => s + o.montant, 0)

  const resteAVivre = soldeComptesCourants - totalDepenses + totalRevenus
  const joursRestants = Math.max(1, differenceInCalendarDays(new Date(prochainRevenu.date), aujourdHui))

  return {
    resteAVivre,
    joursRestants,
    montantParJour: resteAVivre / joursRestants,
    prochaineDatePaie: prochainRevenu.date,
    depensesPrevues,
    revenusPrevus,
  }
}
