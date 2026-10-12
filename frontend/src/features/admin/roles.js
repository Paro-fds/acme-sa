/**
 * US-108 (choix du 2026-10-11, cahier des charges §4.3) : rubriques et actions de l'espace RH selon le rôle.
 * Le serveur refuse de toute façon ce qui n'est pas permis ; l'écran n'affiche simplement pas ce qui ne sert pas.
 */
const ALL = ['ADMIN', 'AGENT_RH', 'REFERENTIAL', 'READONLY']

export const ACCESS = {
  dashboard: ALL,
  employees: ALL,
  validation: ['ADMIN', 'AGENT_RH', 'READONLY'],
  openings: ['ADMIN', 'AGENT_RH', 'READONLY'],
  reports: ['ADMIN', 'AGENT_RH', 'READONLY'],
  referential: ['ADMIN', 'REFERENTIAL'],
  accounts: ['ADMIN'],
  audit: ['ADMIN'],
  resetAccess: ['ADMIN'],
}

/** Vrai si ce rôle a accès ; rôle encore inconnu (chargement) : seulement ce qui est ouvert à tous. */
export function can(role, access) {
  const allowed = ACCESS[access]
  return role ? allowed.includes(role) : allowed === ALL
}
