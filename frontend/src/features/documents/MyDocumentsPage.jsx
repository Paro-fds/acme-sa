import { useId } from 'react'
import { useNavigate } from 'react-router'
import { documentFileUrl, listMyDocuments } from '../../api/documents.js'
import { getMyUpdate } from '../../api/employee.js'
import Alert from '../../components/Alert.jsx'
import Button from '../../components/Button.jsx'
import Page from '../../components/Page.jsx'
import { useLoader } from '../../lib/useLoader.js'
import DocumentItem from './DocumentItem.jsx'

const GROUPS = [
  { type: 'DIPLOME', title: 'Diplômes', icon: 'school' },
  { type: 'CERTIFICAT', title: 'Certificats', icon: 'verified' },
  { type: 'ATTESTATION', title: 'Attestations', icon: 'description' },
  { type: 'AUTRE', title: 'Autres', icon: 'more_horiz' },
]

const plural = (count) => `${count} document${count > 1 ? 's' : ''}`

const loadPage = () => Promise.all([listMyDocuments(), getMyUpdate()])

function DocumentGroup({ title, icon, documents }) {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-info-bg text-info-text" aria-hidden="true">
            <span className="material-symbols-outlined text-[18px]">{icon}</span>
          </span>
          <h3 id={titleId} className="text-lg font-semibold">{title}</h3>
        </div>
        <span className="text-sm text-help">{plural(documents.length)}</span>
      </div>
      <ul className="flex flex-col gap-2">
        {documents.map((document) => (
          <DocumentItem key={document.id} document={document} fileUrl={documentFileUrl(document.id)} showDate />
        ))}
      </ul>
    </section>
  )
}

/** Accès à l'ajout de documents, tant que la mise à jour n'est pas soumise (D-04). */
function AddDocumentsButton({ state }) {
  const navigate = useNavigate()
  if (state === 'DONE') return null
  return state === 'IN_PROGRESS' ? (
    <Button variant="secondary" onClick={() => navigate('/mise-a-jour/documents')}>
      <span className="material-symbols-outlined" aria-hidden="true">add_circle</span>
      Ajouter un document
    </Button>
  ) : (
    <Button variant="secondary" onClick={() => navigate('/profil')}>
      <span className="material-symbols-outlined" aria-hidden="true">edit_document</span>
      Mettre à jour mon dossier
    </Button>
  )
}

/** US-07 : « Mes documents », regroupés par type. */
export default function MyDocumentsPage() {
  const { data, error, loading } = useLoader(loadPage)

  if (loading) return <Page account title="Mes documents" backTo="/profil"><p role="status">Chargement…</p></Page>
  if (error) return <Page account title="Mes documents" backTo="/profil"><Alert>{error.message}</Alert></Page>

  const [documents, update] = data

  return (
    <Page account title="Mes documents" backTo="/profil">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[26px] leading-8 font-bold">Mes documents</h2>
          {documents.length > 0 && (
            <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-white">{plural(documents.length)}</span>
          )}
        </div>
        <p className="text-help">Retrouvez les diplômes, certificats et attestations joints à votre dossier.</p>
      </div>

      {documents.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-6 text-center shadow-card">
          <span className="flex size-14 items-center justify-center rounded-full bg-status-neutral-bg text-muted" aria-hidden="true">
            <span className="material-symbols-outlined text-[28px]">folder_off</span>
          </span>
          <p className="text-lg font-semibold text-heading">Aucun document pour le moment</p>
          <p className="text-sm text-help">Vous pouvez joindre des documents pendant la mise à jour de votre dossier.</p>
          <div className="w-full">
            <AddDocumentsButton state={update.state} />
          </div>
        </div>
      ) : (
        <>
          {GROUPS.map((group) => {
            const groupDocuments = documents.filter((document) => document.document_type === group.type)
            return groupDocuments.length > 0 && <DocumentGroup key={group.type} {...group} documents={groupDocuments} />
          })}
          <AddDocumentsButton state={update.state} />
        </>
      )}
    </Page>
  )
}
