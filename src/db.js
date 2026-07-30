import Dexie from 'dexie'

// Version du schéma exposée pour l'export/import (backup.js), indépendante
// du numéro de version Dexie ci-dessous.
export const SCHEMA_VERSION = 2

export const db = new Dexie('budget-perso')

db.version(1).stores({
  comptes: '++id, type, archive',
  categories: '++id, type',
  chargesRecurrentes: '++id, compteId, categorieId, frequence, active',
  transactions: '++id, date, compteId, categorieId, chargeId',
})

// v2 : ajustements ponctuels d'une charge sur un mois donné (montant
// différent, ou échéance annulée pour ce mois-là uniquement). Ils ne
// persistent pas les occurrences — celles-ci restent calculées à la volée —
// mais seulement les exceptions déclarées par l'utilisateur.
db.version(2).stores({
  ajustements: '++id, chargeId, mois, [chargeId+mois]',
})

const CATEGORIES_PAR_DEFAUT = [
  { nom: 'Salaire', type: 'revenu', couleur: '#22c55e', budgetMensuel: null },
  { nom: 'Autres revenus', type: 'revenu', couleur: '#84cc16', budgetMensuel: null },
  { nom: 'Logement', type: 'depense', couleur: '#ef4444', budgetMensuel: null },
  { nom: 'Alimentation', type: 'depense', couleur: '#f97316', budgetMensuel: null },
  { nom: 'Transport', type: 'depense', couleur: '#f59e0b', budgetMensuel: null },
  { nom: 'Assurances', type: 'depense', couleur: '#eab308', budgetMensuel: null },
  { nom: 'Santé', type: 'depense', couleur: '#14b8a6', budgetMensuel: null },
  { nom: 'Loisirs', type: 'depense', couleur: '#06b6d4', budgetMensuel: null },
  { nom: 'Abonnements', type: 'depense', couleur: '#3b82f6', budgetMensuel: null },
  { nom: 'Épargne', type: 'depense', couleur: '#6366f1', budgetMensuel: null },
  { nom: 'Impôts', type: 'depense', couleur: '#8b5cf6', budgetMensuel: null },
  { nom: 'Divers', type: 'depense', couleur: '#a855f7', budgetMensuel: null },
]

db.on('populate', () => {
  db.categories.bulkAdd(CATEGORIES_PAR_DEFAUT)
})
