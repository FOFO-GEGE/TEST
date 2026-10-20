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
  it('vaut 0 sans aucune charge ni mouvement sur le mois', () => {
    const resultat = calculerResteAVivre({ charges: [], transactions: [], aujourdHui: AUJOURDHUI })
    expect(resultat.resteAVivre).toBe(0)
    expect(resultat.totalRevenus).toBe(0)
    expect(resultat.totalDepenses).toBe(0)
    expect(resultat.debutMois).toBe('2024-06-01')
    expect(resultat.finMois).toBe('2024-06-30')
  })

  it('fait la différence entre entrées et sorties des charges du mois en cours', () => {
    const charges = [
      charge({ id: 1, libelle: 'Salaire', type: 'revenu', montant: 2000, jourPrelevement: 25 }),
      charge({ id: 2, libelle: 'Abonnement', type: 'depense', montant: 15, jourPrelevement: 20 }),
      charge({ id: 3, libelle: 'Loyer', type: 'depense', montant: 800, jourPrelevement: 5 }),
    ]
    const resultat = calculerResteAVivre({ charges, transactions: [], aujourdHui: AUJOURDHUI })

    expect(resultat.totalRevenus).toBe(2000)
    expect(resultat.totalDepenses).toBe(815)
    expect(resultat.resteAVivre).toBe(2000 - 815)
  })

  it('ignore les charges des autres mois', () => {
    const charges = [
      charge({ id: 1, libelle: 'Loyer juillet', type: 'depense', montant: 800, jourPrelevement: 5, dateDebut: '2024-07-01' }),
    ]
    const resultat = calculerResteAVivre({ charges, transactions: [], aujourdHui: AUJOURDHUI })
    expect(resultat.resteAVivre).toBe(0)
  })

  it('tient compte des mouvements réels du mois en plus des charges', () => {
    const charges = [charge({ id: 1, libelle: 'Loyer', type: 'depense', montant: 800, jourPrelevement: 5 })]
    const resultat = calculerResteAVivre({
      charges,
      transactions: [
        { date: '2024-06-12', montant: -30 },
        { date: '2024-06-15', montant: 100 },
        { date: '2024-07-01', montant: -9999 }, // hors du mois en cours, ignoré
      ],
      aujourdHui: AUJOURDHUI,
    })
    expect(resultat.totalDepenses).toBe(830)
    expect(resultat.totalRevenus).toBe(100)
    expect(resultat.resteAVivre).toBe(100 - 830)
  })

  it('applique les ajustements du mois (montant modifié ou échéance annulée)', () => {
    const charges = [charge({ id: 1, libelle: 'Loyer', type: 'depense', montant: 800, jourPrelevement: 5 })]
    const resultat = calculerResteAVivre({
      charges,
      transactions: [],
      ajustements: [{ chargeId: 1, mois: '2024-06', montant: 750, annulee: false }],
      aujourdHui: AUJOURDHUI,
    })
    expect(resultat.totalDepenses).toBe(750)
  })
})
