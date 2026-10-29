import Alert from '../../components/Alert.jsx'
import Page from '../../components/Page.jsx'

export const PER_PATH = '/per'

export const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1)

/** US-1023 : une page du PER, avec « Menu principal » (comme `#retour-menu` du directeur) et la mention de la DRH. */
export function PerDocumentPage({ title, children }) {
  return (
    <Page account title={title} backTo={PER_PATH} backLabel="Menu principal">
      <div className="flex flex-col gap-6">
        {children}
        <p className="text-sm text-help">Une question sur votre PER ou votre paie ? Adressez-vous à la DRH.</p>
      </div>
    </Page>
  )
}

/** Lecture du PER impossible : « aucune balance » est une information, une panne est une erreur. */
export function PerError({ error }) {
  return <Alert tone={error.code === 'NO_BALANCE' ? 'info' : 'error'}>{error.message}</Alert>
}
