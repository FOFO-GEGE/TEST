import { describe, it, expect } from 'vitest'
import { calculerResteAVivre } from './resteAVivre.js'

function charge(overrides) {
  return {
    id: 1,
    libelle: 'Charge',
    montant: 100,
    type: 'depense',
    compteId: 1,
    categorieId: 1,
    frequence: 'mensuel',
    jourPrelevement: 1,
    moisReference: null,
    dateDebut: '2024-01-01',
    dateFin: null,
    active: true,
    ...overrides,
  }
}

const AUJOURDHUI = new Date(2024, 5, 10) // 10 juin 2024

describe('calculerResteAVivre', () => {
  it('déduit les dépenses prévues avant la prochaine paie', () => {
    const charges = [
      charge({ id: 1, libelle: 'Salaire', type: 'revenu', montant: 2000, jourPrelevement: 25 }),
      charge({ id: 2, libelle: 'Abonnement', type: 'depense', montant: 15, jourPrelevement: 20 }),
      charge({ id: 3, libelle: 'Loyer', type: 'depense', montant: 800, jourPrelevement: 5 }),
    ]
    const resultat = calculerResteAVivre({
      charges,
      transactions: [],
      soldeComptesCourants: 1000,
      aujourdHui: AUJOURDHUI,
    })

    expect(resultat.prochaineDatePaie).toBe('2024-06-25')
    expect(resultat.depensesPrevues.map((o) => o.libelle)).toEqual(['Abonnement'])
    expect(resultat.resteAVivre).toBe(1000 - 15)
    expect(resultat.joursRestants).toBe(15)
    expect(resultat.montantParJour).toBeCloseTo((1000 - 15) / 15)
  })

  it('compte une dépense prévue même si une transaction existe déjà à la même date', () => {
    // Toute charge prévue est considérée comme certaine : il n'y a plus de
    // notion de rapprochement à vérifier avant de la compter.
    const charges = [
      charge({ id: 1, libelle: 'Salaire', type: 'revenu', montant: 2000, jourPrelevement: 25 }),
      charge({ id: 2, libelle: 'Abonnement', type: 'depense', montant: 15, jourPrelevement: 20 }),
    ]
    const resultat = calculerResteAVivre({
      charges,
      transactions: [{ chargeId: 2, date: '2024-06-19', montant: -15 }],
      soldeComptesCourants: 1000,
      aujourdHui: AUJOURDHUI,
    })
    expect(resultat.depensesPrevues.map((o) => o.libelle)).toEqual(['Abonnement'])
    expect(resultat.resteAVivre).toBe(1000 - 15)
  })

  it('ajoute les revenus prévus sur la période hors la prochaine paie elle-même', () => {
    const charges = [
      charge({ id: 1, libelle: 'Salaire', type: 'revenu', montant: 2000, jourPrelevement: 25 }),
      charge({ id: 2, libelle: 'Remboursement', type: 'revenu', montant: 50, jourPrelevement: 25 }),
    ]
    const resultat = calculerResteAVivre({
      charges,
      transactions: [],
      soldeComptesCourants: 1000,
      aujourdHui: AUJOURDHUI,
    })
    expect(resultat.prochaineDatePaie).toBe('2024-06-25')
    expect(resultat.revenusPrevus.map((o) => o.libelle)).toEqual(['Remboursement'])
    expect(resultat.resteAVivre).toBe(1000 + 50)
  })

  it('retourne le solde tel quel si aucune charge de revenu n’est active', () => {
    const charges = [charge({ id: 1, libelle: 'Loyer', type: 'depense', montant: 800, jourPrelevement: 5 })]
    const resultat = calculerResteAVivre({
      charges,
      transactions: [],
      soldeComptesCourants: 1000,
      aujourdHui: AUJOURDHUI,
    })
    expect(resultat.resteAVivre).toBe(1000)
    expect(resultat.joursRestants).toBeNull()
    expect(resultat.montantParJour).toBeNull()
    expect(resultat.prochaineDatePaie).toBeNull()
    expect(resultat.depensesPrevues).toEqual([])
  })
})
