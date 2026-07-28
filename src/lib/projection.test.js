import { describe, it, expect } from 'vitest'
import { projeterSoldeJournalier, resumeMensuel, premierePassageSousSeuil, moisAvecAlerte } from './projection.js'

function charge(overrides) {
  return {
    id: 1,
    libelle: 'Charge',
    montant: 100,
    type: 'depense',
    compteId: 1,
    categorieId: 1,
    frequence: 'mensuel',
    jourPrelevement: 10,
    moisReference: null,
    dateDebut: '2024-01-01',
    dateFin: null,
    active: true,
    ...overrides,
  }
}

describe('projeterSoldeJournalier', () => {
  it('applique la variation le jour de l’échéance et la conserve ensuite', () => {
    const points = projeterSoldeJournalier({
      soldeDepart: 500,
      charges: [charge()],
      dateDebut: '2024-01-01',
      nombreJours: 15,
    })
    const avant = points.find((p) => p.date === '2024-01-09')
    const jourJ = points.find((p) => p.date === '2024-01-10')
    const apres = points.find((p) => p.date === '2024-01-11')
    expect(avant.solde).toBe(500)
    expect(jourJ.solde).toBe(400)
    expect(apres.solde).toBe(400)
  })

  it('cumule plusieurs charges le même jour', () => {
    const points = projeterSoldeJournalier({
      soldeDepart: 1000,
      charges: [charge({ id: 1, montant: 100, type: 'depense' }), charge({ id: 2, montant: 2000, type: 'revenu' })],
      dateDebut: '2024-01-01',
      nombreJours: 15,
    })
    expect(points.find((p) => p.date === '2024-01-10').solde).toBe(1000 - 100 + 2000)
  })
})

describe('resumeMensuel', () => {
  it('agrège revenus, dépenses et solde de fin de mois', () => {
    const charges = [
      charge({ id: 1, libelle: 'Salaire', type: 'revenu', montant: 2000, jourPrelevement: 25 }),
      charge({ id: 2, libelle: 'Loyer', type: 'depense', montant: 800, jourPrelevement: 5 }),
    ]
    const mois = resumeMensuel({ soldeDepart: 100, charges, dateDebut: '2024-01-01', nombreMois: 3 })
    expect(mois).toHaveLength(3)
    expect(mois[0]).toMatchObject({ mois: '2024-01', revenus: 2000, depenses: 800, soldeFinDeMois: 100 + 2000 - 800 })
    expect(mois[1].soldeFinDeMois).toBe(100 + 2000 - 800 + 2000 - 800)
    expect(mois[2].mois).toBe('2024-03')
  })
})

describe('premierePassageSousSeuil', () => {
  it('retourne le premier point sous le seuil', () => {
    const points = projeterSoldeJournalier({
      soldeDepart: 500,
      charges: [charge({ montant: 600 })],
      dateDebut: '2024-01-01',
      nombreJours: 15,
    })
    const passage = premierePassageSousSeuil(points, 0)
    expect(passage.date).toBe('2024-01-10')
    expect(passage.solde).toBe(-100)
  })

  it('retourne null si le solde ne passe jamais sous le seuil', () => {
    const points = projeterSoldeJournalier({
      soldeDepart: 5000,
      charges: [charge({ montant: 10 })],
      dateDebut: '2024-01-01',
      nombreJours: 15,
    })
    expect(premierePassageSousSeuil(points, 0)).toBeNull()
  })
})

describe('moisAvecAlerte', () => {
  it('signale les mois où le solde journalier descend sous le seuil', () => {
    const points = projeterSoldeJournalier({
      soldeDepart: 200,
      charges: [charge({ montant: 100, jourPrelevement: 15 })],
      dateDebut: '2024-01-01',
      nombreJours: 30, // reste en janvier (Jan1 → Jan31)
    })
    const alertes = moisAvecAlerte(points, 150)
    expect(alertes.has('2024-01')).toBe(true)
    expect(alertes.size).toBe(1)
  })

  it('ne signale rien si le solde reste au-dessus du seuil', () => {
    const points = projeterSoldeJournalier({
      soldeDepart: 5000,
      charges: [charge({ montant: 10, jourPrelevement: 15 })],
      dateDebut: '2024-01-01',
      nombreJours: 30,
    })
    expect(moisAvecAlerte(points, 0).size).toBe(0)
  })
})
