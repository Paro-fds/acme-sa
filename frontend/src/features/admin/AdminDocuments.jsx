import { employeeDocumentFileUrl } from '../../api/admin.js'
import DocumentItem from './DocumentItem.jsx'
import Block from './Block.jsx'

const plural = (count) => `${count} document${count > 1 ? 's' : ''}`

/** US-21 : documents transmis par l'employé, en lecture seule (« Voir » uniquement). */
export default function AdminDocuments({ documents }) {
  const count = documents.length > 0 && <span className="text-sm text-help">{plural(documents.length)}</span>
  return (
    <Block icon="folder_open" title="Documents" aside={count}>
      {documents.length === 0 ? (
        <p className="text-help">Aucun document transmis</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {documents.map((document) => (
            <DocumentItem key={document.id} document={document} fileUrl={employeeDocumentFileUrl(document.id)} showDate />
          ))}
        </ul>
      )}
    </Block>
  )
}
