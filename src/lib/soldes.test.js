import { describe, it, expect } from 'vitest'
import { soldeCompte, totalComptesCourants } from './soldes.js'

describe('soldeCompte', () => {
  const compte = { id: 1, soldeInitial: 1000, dateSolde: '2024-06-01' }

  it('ajoute uniquement les transactions postérieures à dateSolde', () => {
    const transactions = [
      { compteId: 1, date: '2024-05-15', montant: -500 },
      { compteId: 1, date: '2024-06-01', montant: -999 },
      { compteId: 1, date: '2024-06-10', montant: -100 },
      { compteId: 1, date: '2024-06-20', montant: 50 },
      { compteId: 2, date: '2024-06-15', montant: -1000000 },
    ]
    expect(soldeCompte(compte, transactions)).toBe(1000 - 100 + 50)
  })

  it('retourne soldeInitial si aucune transaction postérieure', () => {
    expect(soldeCompte(compte, [])).toBe(1000)
  })
})

describe('totalComptesCourants', () => {
  it('ignore les comptes épargne et archivés', () => {
    const comptes = [
      { id: 1, type: 'courant', archive: false, soldeInitial: 100, dateSolde: '2024-01-01' },
      { id: 2, type: 'epargne', archive: false, soldeInitial: 5000, dateSolde: '2024-01-01' },
      { id: 3, type: 'courant', archive: true, soldeInitial: 200, dateSolde: '2024-01-01' },
    ]
    expect(totalComptesCourants(comptes, [])).toBe(100)
  })
})
