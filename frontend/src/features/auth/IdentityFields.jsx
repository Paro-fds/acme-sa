import TextField from '../../components/TextField.jsx'

export const EMPTY_IDENTITY = { last_name: '', first_name: '', birth_date: '' }

export function isIdentityComplete(identity) {
  return Boolean(identity.last_name.trim() && identity.first_name.trim() && identity.birth_date)
}

/** Nom, prénom et date de naissance : communs à la connexion et à la création du mot de passe (US-101). */
export default function IdentityFields({ identity, onChange }) {
  const update = (field) => (event) => onChange({ ...identity, [field]: event.target.value })

  return (
    <>
      <TextField label="Nom de famille" autoComplete="family-name" value={identity.last_name} onChange={update('last_name')} />
      <TextField label="Prénom" autoComplete="given-name" value={identity.first_name} onChange={update('first_name')} />
      <TextField
        label="Date de naissance"
        type="date"
        value={identity.birth_date}
        onChange={update('birth_date')}
        max={new Date().toISOString().slice(0, 10)}
      />
    </>
  )
}
