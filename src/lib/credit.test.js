import { describe, it, expect } from 'vitest'
import { calculerMensualites, calculerPeriodeCredit } from './credit.js'

describe('calculerMensualites', () => {
  it('répartit un montant qui ne divise pas rond, le dernier mois absorbe l’écart', () => {
    const mensualites = calculerMensualites(500, 3)
    expect(mensualites).toEqual([166.66, 166.66, 166.68])
    expect(mensualites.reduce((s, m) => s + m, 0)).toBeCloseTo(500, 2)
  })

  it('répartit un montant qui divise rond sans écart sur le dernier mois', () => {
    expect(calculerMensualites(300, 3)).toEqual([100, 100, 100])
  })

  it('gère une seule mensualité', () => {
    expect(calculerMensualites(100, 1)).toEqual([100])
  })

  it('ne dépasse jamais le montant total, quel que soit le nombre de mois', () => {
    const mensualites = calculerMensualites(1000, 7)
    const total = mensualites.reduce((s, m) => s + m, 0)
    expect(total).toBeCloseTo(1000, 2)
    expect(total).toBeLessThanOrEqual(1000)
  })
})

describe('calculerPeriodeCredit', () => {
  it('calcule la date de début, la date de fin et le dernier mois', () => {
    const { dateDebut, dateFin, dernierMois } = calculerPeriodeCredit('2026-08', 3)
    expect(dateDebut).toBe('2026-08-01')
    expect(dateFin).toBe('2026-10-31')
    expect(dernierMois).toBe('2026-10')
  })

  it('gère un seul mois', () => {
    const { dateDebut, dateFin, dernierMois } = calculerPeriodeCredit('2026-08', 1)
    expect(dateDebut).toBe('2026-08-01')
    expect(dateFin).toBe('2026-08-31')
    expect(dernierMois).toBe('2026-08')
  })

  it('traverse une fin d’année correctement', () => {
    const { dateFin, dernierMois } = calculerPeriodeCredit('2026-11', 4)
    expect(dateFin).toBe('2027-02-28')
    expect(dernierMois).toBe('2027-02')
  })
})
