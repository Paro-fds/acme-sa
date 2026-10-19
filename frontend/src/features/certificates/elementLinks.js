import { CONTACT_EDUCATION_PATH, COORDINATES_PATH, HR_INFORMATION_PATH } from '../dossier/paths.js'

/** US-204 CA-01 : chaque élément manquant mène directement à l'écran où le compléter. */
export const ELEMENT_LINKS = {
  telephone: { to: COORDINATES_PATH, action: 'Ajouter mon téléphone' },
  address: { to: COORDINATES_PATH, action: 'Ajouter mon adresse' },
  email: { to: COORDINATES_PATH, action: 'Ajouter mon email' },
  emergency_contact: { to: CONTACT_EDUCATION_PATH, action: "Ajouter mon contact d'urgence" },
  education_level: { to: CONTACT_EDUCATION_PATH, action: "Indiquer mon niveau d'études" },
  agency_confirmed: { to: HR_INFORMATION_PATH, action: 'Confirmer mon agence' },
  position_confirmed: { to: HR_INFORMATION_PATH, action: 'Confirmer mon poste' },
  hire_date_confirmed: { to: HR_INFORMATION_PATH, action: "Confirmer ma date d'embauche" },
}
