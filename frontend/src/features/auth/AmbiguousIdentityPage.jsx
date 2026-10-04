import { useNavigate } from 'react-router'
import Button from '../../components/Button.jsx'
import Card from '../../components/Card.jsx'
import Page from '../../components/Page.jsx'

/** US-01 CA-07 : plusieurs dossiers actifs correspondent, aucun n'est ouvert. */
export default function AmbiguousIdentityPage() {
  const navigate = useNavigate()

  return (
    <Page title="Identification" backTo="/" actions={<Button variant="secondary" onClick={() => navigate('/')}>Revenir à l'identification</Button>}>
      <div className="flex flex-col items-center gap-4 pt-4 text-center">
        <div
          className="flex size-16 items-center justify-center rounded-full bg-status-progress-bg text-status-progress-text"
          aria-hidden="true"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 32 }}>
            group
          </span>
        </div>
        <h2 className="text-[26px] leading-8 font-bold">Plusieurs dossiers correspondent</h2>
        <p>
          Plusieurs dossiers correspondent à vos informations. Pour protéger vos données, aucun dossier n'a été ouvert.
        </p>
      </div>
      <Card title="Que faire ?">
        <p>
          Contactez l'administration ACME : elle vérifiera votre dossier et vous indiquera comment accéder au portail.
        </p>
      </Card>
    </Page>
  )
}
