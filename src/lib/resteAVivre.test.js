import { describe, it, expect } from 'vitest'
import { calculerResteAVivre, estRapprochee } from './resteAVivre.js'

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

describe('estRapprochee', () => {
  it('reconnaît une transaction dans la fenêtre de ± 5 jours', () => {
    const occurrence = { chargeId: 1, date: '2024-06-20' }
    expect(estRapprochee(occurrence, [{ chargeId: 1, date: '2024-06-24' }])).toBe(true)
    expect(estRapprochee(occurrence, [{ chargeId: 1, date: '2024-06-15' }])).toBe(true)
  })

  it('rejette une transaction hors fenêtre ou avec un autre chargeId', () => {
    const occurrence = { chargeId: 1, date: '2024-06-20' }
    expect(estRapprochee(occurrence, [{ chargeId: 1, date: '2024-06-14' }])).toBe(false)
    expect(estRapprochee(occurrence, [{ chargeId: 2, date: '2024-06-20' }])).toBe(false)
  })
})

describe('calculerResteAVivre', () => {
  it('déduit les dépenses prévues non rapprochées avant la prochaine paie', () => {
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

  it('ignore une dépense déjà rapprochée', () => {
    const charges = [
      charge({ id: 1, libelle: 'Salaire', type: 'revenu', montant: 2000, jourPrelevement: 25 }),
      charge({ id: 2, libelle: 'Abonnement', type: 'depense', montant: 15, jourPrelevement: 20 }),
    ]
    const resultat = calculerResteAVivre({
      charges,
      transactions: [{ chargeId: 2, date: '2024-06-19' }],
      soldeComptesCourants: 1000,
      aujourdHui: AUJOURDHUI,
    })
    expect(resultat.depensesPrevues).toEqual([])
    expect(resultat.resteAVivre).toBe(1000)
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
})
