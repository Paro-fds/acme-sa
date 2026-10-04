import { formatDate, formatGender } from '../../lib/format.js'

/**
 * Sections « Identité », « Coordonnées », « Informations professionnelles » d'un dossier,
 * communes au profil employé (US-05) et au dossier vu par l'admin (US-20).
 * `field` : code du champ modifiable correspondant, s'il y en a un.
 */
export function profileSections(profile) {
  return [
    {
      icon: 'person',
      title: 'Identité',
      fields: [
        { label: 'Nom', value: profile.last_name, field: 'last_name' },
        { label: 'Prénom', value: profile.first_name, field: 'first_name' },
        { label: 'Sexe', value: formatGender(profile.gender) },
        { label: 'Date de naissance', value: formatDate(profile.birth_date) },
      ],
    },
    {
      icon: 'contacts',
      title: 'Coordonnées',
      fields: [
        { label: 'Téléphone', value: profile.telephone_number, field: 'telephone_number' },
        { label: 'Email', value: profile.email_address, field: 'email_address' },
        { label: 'Adresse', value: profile.address_line_1, field: 'address_line_1' },
      ],
    },
    {
      icon: 'business_center',
      title: 'Informations professionnelles',
      fields: [
        { label: 'Matricule', value: profile.employee_code },
        { label: 'Agence', value: profile.agency_code },
        { label: 'Département', value: profile.department },
        { label: 'Poste', value: profile.position },
        { label: 'Grade', value: profile.grade },
        { label: 'Niveau', value: profile.level },
        { label: 'Contrat', value: profile.contract_nature },
        { label: "Date d'embauche", value: formatDate(profile.hire_date) },
      ],
    },
  ]
}
