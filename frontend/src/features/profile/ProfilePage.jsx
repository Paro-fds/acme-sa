import { useState } from 'react'
import { useNavigate } from 'react-router'
import { decide, getProfile } from '../../api/employee.js'
import Alert from '../../components/Alert.jsx'
import Button from '../../components/Button.jsx'
import Card from '../../components/Card.jsx'
import Page from '../../components/Page.jsx'
import { EmployeeStateBadge } from '../../components/StatusBadge.jsx'
import { displayValue, formatDate, formatDateTime } from '../../lib/format.js'
import { useLoader, useUnauthorizedRedirect } from '../../lib/useLoader.js'

function InfoList({ items }) {
  return (
    <dl className="divide-y divide-border">
      {items.map(([label, value]) => (
        <div key={label} className="py-3 first:pt-0 last:pb-0">
          <dt className="text-sm text-muted">{label}</dt>
          <dd className="text-base text-heading">{displayValue(value)}</dd>
        </div>
      ))}
    </dl>
  )
}

/** US-05 (profil), US-06 (état de la mise à jour) et US-08 (choix Oui). */
export default function ProfilePage() {
  const navigate = useNavigate()
  const redirectIfUnauthorized = useUnauthorizedRedirect()
  const { data: profile, error: loadError, loading } = useLoader(getProfile)
  const [error, setError] = useState(null)

  async function startUpdate() {
    try {
      await decide(true)
      navigate('/mise-a-jour/informations')
    } catch (apiError) {
      if (!redirectIfUnauthorized(apiError)) setError(apiError.message)
    }
  }

  if (loading) return <Page account title="Mon profil"><p role="status">Chargement…</p></Page>
  if (loadError) return <Page account title="Mon profil"><Alert>{loadError.message}</Alert></Page>

  const { update } = profile

  return (
    <Page account title="Mon profil">
      <Card>
        <p className="text-xl font-bold text-heading">
          {profile.last_name} {profile.first_name}
        </p>
        <p className="text-info-text">{profile.position}</p>
        <p className="text-sm text-muted">
          Matricule {profile.employee_code} · Agence {profile.agency_code}
        </p>
      </Card>

      <Card title="Ma mise à jour">
        <div className="flex flex-col gap-4">
          <EmployeeStateBadge state={update.state} />
          {update.state === 'DONE' && <p>Mise à jour soumise le {formatDateTime(update.submitted_at)}.</p>}
          {update.state === 'IN_PROGRESS' && (
            <>
              <p>Dernière sauvegarde le {formatDateTime(update.updated_at)}.</p>
              <Button onClick={() => navigate('/mise-a-jour/informations')}>Reprendre la mise à jour</Button>
            </>
          )}
          {update.state === 'NOT_DONE' && (
            <>
              <p className="font-semibold text-heading">Souhaitez-vous mettre à jour votre dossier ?</p>
              <Button onClick={startUpdate}>Oui, mettre à jour mon dossier</Button>
            </>
          )}
          <Alert>{error}</Alert>
        </div>
      </Card>

      <Card title="Identité">
        <InfoList
          items={[
            ['Nom', profile.last_name],
            ['Prénom', profile.first_name],
            ['Date de naissance', formatDate(profile.birth_date)],
          ]}
        />
      </Card>

      <Card title="Coordonnées">
        <InfoList
          items={[
            ['Téléphone', profile.telephone_number],
            ['Email', profile.email_address],
            ['Adresse', profile.address_line_1],
          ]}
        />
      </Card>

      <Card title="Informations professionnelles">
        <InfoList
          items={[
            ['Département', profile.department],
            ['Poste', profile.position],
            ['Contrat', profile.contract_nature],
            ["Date d'embauche", formatDate(profile.hire_date)],
          ]}
        />
      </Card>
    </Page>
  )
}
