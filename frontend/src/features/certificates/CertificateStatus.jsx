import StatusBadge from '../../components/StatusBadge.jsx'

/** RG-26 : Reçu / En vérification → Validé, ou À corriger. */
const STATUSES = {
  RECEIVED: { tone: 'progress', label: 'Reçu' },
  IN_REVIEW: { tone: 'progress', label: 'En vérification' },
  VALIDATED: { tone: 'done', label: 'Validé' },
  TO_CORRECT: { tone: 'error', label: 'À corriger' },
}

export default function CertificateStatus({ status }) {
  const { tone, label } = STATUSES[status] ?? STATUSES.RECEIVED
  return <StatusBadge tone={tone}>{label}</StatusBadge>
}
