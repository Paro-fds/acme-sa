/** Dossier renvoyé par GET /api/me/dossier, pour les tests des écrans de US-202. */
export function dossierFixture(overrides = {}) {
  return {
    consent: { information_notice_at: '2026-10-08T09:00:00Z', whatsapp: false },
    telephone: { value: '+509 3722 1111', complete: false, confirmed_at: null },
    address: { value: '12 rue Capois, Port-au-Prince', complete: false, confirmed_at: null },
    email: { value: null, no_email: false, complete: false, confirmed_at: null },
    emergency_contact: { name: null, relationship: null, telephone: null, complete: false, confirmed_at: null },
    education_level: { value: null, complete: false, confirmed_at: null },
    completion: { percent: 0, complete: 0, total: 8 },
    hr_information: [
      { key: 'agency_confirmed', label: "Agence d'affectation", value: 'Agence Démo', status: 'CONFIRMED', answered_at: '2026-10-06T09:00:00Z' },
      { key: 'position_confirmed', label: 'Poste actuel', value: 'Chargée de crédit', status: 'TO_CONFIRM', answered_at: null },
      { key: 'hire_date_confirmed', label: "Date d'embauche", value: '12/03/2018', status: 'TO_CONFIRM', answered_at: null },
    ],
    relationships: [
      { value: 'SPOUSE', label: 'Conjoint·e' },
      { value: 'PARENT', label: 'Parent' },
      { value: 'CHILD', label: 'Enfant' },
      { value: 'SIBLING', label: 'Frère / Sœur' },
      { value: 'OTHER', label: 'Autre' },
    ],
    education_levels: [
      { value: 'PRIMAIRE', label: 'Primaire / Fondamental', examples: "Certificat d'études primaires." },
      { value: 'LICENCE', label: 'Licence', examples: 'Licence universitaire Bac + 3 ou Bac + 4.' },
    ],
    ...overrides,
  }
}

export const NO_CONSENT = { information_notice_at: null, whatsapp: null }
