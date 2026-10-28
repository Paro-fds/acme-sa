import PasswordField from '../../components/PasswordField.jsx'

export const BIRTH_DATE_LENGTH = 8

/**
 * US-1014 (modèle d'authentification du directeur) : la date de naissance en huit chiffres, jour mois année,
 * sans barre oblique, dans un champ masqué comme un mot de passe (Afficher / Masquer).
 * Le navigateur ne garde que les chiffres, au plus huit ; le serveur lit la date et répond de la même façon
 * qu'elle soit fausse ou impossible.
 */
export default function BirthDateField({ value, onChange }) {
  return (
    <PasswordField
      label="Date de naissance"
      help="Jour, mois, année : 27101990 pour le 27 octobre 1990."
      inputMode="numeric"
      autoComplete="off"
      maxLength={BIRTH_DATE_LENGTH}
      value={value}
      onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, BIRTH_DATE_LENGTH))}
    />
  )
}
