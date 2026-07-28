/**
 * Fonctions pures de calcul de solde, sans dépendance à Dexie.
 * Solde théorique d'un compte = soldeInitial + transactions du compte
 * postérieures à dateSolde (la date à laquelle soldeInitial était exact).
 */
export function soldeCompte(compte, transactions) {
  const mouvements = transactions
    .filter((t) => t.compteId === compte.id && t.date > compte.dateSolde)
    .reduce((somme, t) => somme + t.montant, 0)
  return compte.soldeInitial + mouvements
}

export function soldesParCompte(comptes, transactions) {
  const soldes = {}
  for (const compte of comptes) {
    soldes[compte.id] = soldeCompte(compte, transactions)
  }
  return soldes
}

export function totalComptesCourants(comptes, transactions) {
  return comptes
    .filter((c) => c.type === 'courant' && !c.archive)
    .reduce((somme, c) => somme + soldeCompte(c, transactions), 0)
}
