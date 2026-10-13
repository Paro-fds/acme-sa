import { describe, expect, it } from 'vitest'
import { buildTimeline, filterEvents, seniorityLabel, visibleFilters } from './timeline.js'

const PROFILE = {
  position: 'Agent de crédit',
  affectation: { agency: 'Agence Démo Nord' },
  hire_date: '2018-09-03',
}

const entry = (kind, fields) => ({ id: `${kind}-${fields.title}`, kind, organization: null, location: null, start_month: null, end_month: null, duration_hours: null, description: null, ...fields })

const CAREER = {
  kinds: [
    { kind: 'QUALIFICATION', items: [entry('QUALIFICATION', { title: 'Bac', qualification_type_label: 'Diplôme', organization: 'Lycée Démo', start_month: '2014-07' })] },
    { kind: 'TRAINING', items: [entry('TRAINING', { title: 'Analyse du risque de crédit', organization: 'ACME SA', start_month: '2024-06', end_month: '2024-06', duration_hours: 24 })] },
    { kind: 'EXPERIENCE', items: [entry('EXPERIENCE', { title: 'Caissier', organization: 'Coopérative Démo', location: 'Port-au-Prince', start_month: '2016-01', end_month: '2018-08' })] },
    { kind: 'SKILL', items: [{ id: 's1', kind: 'SKILL', title: 'Excel', skill_level_label: 'Avancé' }] },
  ],
}

const cert = (fields) => ({ id: fields.title, type_label: 'Diplôme', institution: 'Université Démo', is_archived: false, ...fields })

const CERTIFICATES = {
  certificates: [
    cert({ title: 'Licence en sciences comptables', year: 2019, status: 'VALIDATED', status_label: 'Validé' }),
    cert({ title: 'Master en finance', year: 2026, status: 'IN_REVIEW', status_label: 'En vérification' }),
    cert({ title: 'Attestation illisible', year: 2025, status: 'TO_CORRECT', status_label: 'À corriger' }),
    cert({ title: 'Ancienne licence', year: 2019, status: 'VALIDATED', status_label: 'Validé', is_archived: true }),
  ],
}

const TODAY = new Date('2026-10-12T12:00:00Z')

describe('US-114 — frise de « Ma carrière »', () => {
  it('CA-01 : « Aujourd’hui » donne le poste, l’agence et l’ancienneté chez ACME SA', () => {
    const { today } = buildTimeline({ profile: PROFILE, career: CAREER, certificates: CERTIFICATES }, TODAY)
    expect(today).toEqual({ position: 'Agent de crédit', agency: 'Agence Démo Nord', seniority: '8 ans chez ACME SA' })
  })

  it('CA-01 : ancienneté en années complètes', () => {
    expect(seniorityLabel('2025-11-01', TODAY)).toBe('Moins d’un an chez ACME SA')
    expect(seniorityLabel('2025-10-12', TODAY)).toBe('1 an chez ACME SA')
    expect(seniorityLabel('2018-10-13', TODAY)).toBe('7 ans chez ACME SA')
    expect(seniorityLabel(null, TODAY)).toBeNull()
  })

  it('CA-02 : du plus récent au plus ancien, avec la source de chaque élément', () => {
    const { events } = buildTimeline({ profile: PROFILE, career: CAREER, certificates: CERTIFICATES }, TODAY)
    expect(events.map((event) => [event.year, event.title, event.source])).toEqual([
      ['2026', 'Master en finance', 'IN_REVIEW'],
      ['2024', 'Analyse du risque de crédit', 'DECLARED'],
      ['2019', 'Licence en sciences comptables', 'VALIDATED'],
      ['2018', 'Entrée chez ACME SA', 'HR'],
      ['2016', 'Caissier', 'DECLARED'],
      ['2014', 'Bac', 'DECLARED'],
    ])
  })

  it('CA-02 : un certificat à corriger ou remplacé n’apparaît pas', () => {
    const { events } = buildTimeline({ profile: PROFILE, career: CAREER, certificates: CERTIFICATES }, TODAY)
    const titles = events.map((event) => event.title)
    expect(titles).not.toContain('Attestation illisible')
    expect(titles).not.toContain('Ancienne licence')
  })

  it('CA-02 : dates et détails lisibles', () => {
    const { events } = buildTimeline({ profile: PROFILE, career: CAREER, certificates: CERTIFICATES }, TODAY)
    const byTitle = Object.fromEntries(events.map((event) => [event.title, event]))
    expect(byTitle['Entrée chez ACME SA']).toMatchObject({ group: 'ACME', when: 'septembre 2018', detail: 'Embauche le 03/09/2018' })
    expect(byTitle['Licence en sciences comptables']).toMatchObject({ group: 'QUALIFICATION', when: 'obtenu en 2019', detail: 'Diplôme · Université Démo' })
    expect(byTitle.Caissier).toMatchObject({ group: 'EXPERIENCE', when: 'janv. 2016 → août 2018', detail: 'Coopérative Démo, Port-au-Prince' })
    expect(byTitle['Analyse du risque de crédit']).toMatchObject({ group: 'TRAINING', detail: 'ACME SA · 24 h' })
  })

  it('CA-02 : les compétences sont à part, en étiquettes', () => {
    const { events, skills } = buildTimeline({ profile: PROFILE, career: CAREER, certificates: CERTIFICATES }, TODAY)
    expect(skills).toEqual([{ id: 's1', title: 'Excel', level: 'Avancé' }])
    expect(events.map((event) => event.title)).not.toContain('Excel')
  })

  it('sans date d’embauche ni parcours : frise vide, sans erreur', () => {
    const { today, events } = buildTimeline({ profile: { ...PROFILE, hire_date: null }, career: { kinds: [] }, certificates: { certificates: [] } }, TODAY)
    expect(today.seniority).toBeNull()
    expect(events).toEqual([])
  })

  it('CA-03 : les filtres', () => {
    const { events } = buildTimeline({ profile: PROFILE, career: CAREER, certificates: CERTIFICATES }, TODAY)
    expect(filterEvents(events, 'ALL')).toHaveLength(6)
    expect(filterEvents(events, 'ACME').map((event) => event.title)).toEqual(['Entrée chez ACME SA'])
    expect(filterEvents(events, 'QUALIFICATION').map((event) => event.title)).toEqual(['Master en finance', 'Licence en sciences comptables', 'Bac'])
    expect(filterEvents(events, 'TRAINING')).toHaveLength(1)
    expect(filterEvents(events, 'EXPERIENCE')).toHaveLength(1)
  })

  it('Formations et Expériences : un filtre seulement s’il y a un élément (saisie avec US-803)', () => {
    const { events } = buildTimeline({ profile: PROFILE, career: { kinds: [] }, certificates: CERTIFICATES }, TODAY)
    expect(visibleFilters(events).map((filter) => filter.label)).toEqual(['Tout', 'Chez ACME', 'Diplômes'])

    const withHistory = buildTimeline({ profile: PROFILE, career: CAREER, certificates: CERTIFICATES }, TODAY).events
    expect(visibleFilters(withHistory).map((filter) => filter.label)).toEqual(['Tout', 'Chez ACME', 'Diplômes', 'Formations', 'Expériences'])
  })
})
