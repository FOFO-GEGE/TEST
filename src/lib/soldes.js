import { format } from 'date-fns'

/**
 * Fonctions pures de calcul de solde, sans dépendance à Dexie.
 * Solde théorique d'un compte = soldeInitial + transactions du compte
 * postérieures à dateSolde (la date à laquelle soldeInitial était exact).
 *
 * Une transaction datée dans le futur (ex. saisie à l'avance) ne doit pas
 * impacter le solde actuel avant sa date réelle — sinon le prévisionnel
 * répercute son effet dès aujourd'hui au lieu du jour de l'échéance.
 */
export function soldeCompte(compte, transactions, aujourdHui = new Date()) {
  const dateLimite = format(aujourdHui, 'yyyy-MM-dd')
  const mouvements = transactions
    .filter((t) => t.compteId === compte.id && t.date > compte.dateSolde && t.date <= dateLimite)
    .reduce((somme, t) => somme + t.montant, 0)
  return compte.soldeInitial + mouvements
}

export function soldesParCompte(comptes, transactions, aujourdHui = new Date()) {
  const soldes = {}
  for (const compte of comptes) {
    soldes[compte.id] = soldeCompte(compte, transactions, aujourdHui)
  }
  return soldes
}

export function totalComptesCourants(comptes, transactions, aujourdHui = new Date()) {
  return comptes
    .filter((c) => c.type === 'courant' && !c.archive)
    .reduce((somme, c) => somme + soldeCompte(c, transactions, aujourdHui), 0)
}
