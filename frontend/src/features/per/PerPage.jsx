import { Link } from 'react-router'
import Page from '../../components/Page.jsx'

const DOCUMENTS = [
  { to: '/per/balance', icon: 'savings', label: 'Balance PER', help: 'Votre épargne retraite à ce jour' },
  { to: '/per/releve', icon: 'description', label: 'Relevé PER', help: 'Votre épargne, mois par mois' },
  { to: '/per/fiche', icon: 'payments', label: 'Fiche de paie', help: 'Vos fiches de paie, à enregistrer en PDF' },
]

/**
 * US-1023 : « Mon PER » est un menu, comme le « Menu principal » du directeur (version du 2026-10-29) ; chaque choix
 * ouvre son document. Le PER reste un module de PAM, une seule connexion (D-61) ; la main levée est côté RH (D-64).
 */
export default function PerPage() {
  return (
    <Page account title="Mon PER" subtitle="Plan d'épargne retraite et paie, en lecture seule.">
      <ul aria-label="Documents du PER" className="grid gap-3 sm:grid-cols-3">
        {DOCUMENTS.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              className="flex min-h-11 items-center gap-4 rounded-xl bg-surface p-5 shadow-card hover:bg-info-bg sm:h-full sm:flex-col sm:items-start"
            >
              <span className="material-symbols-outlined text-[32px] text-primary" aria-hidden="true">
                {item.icon}
              </span>
              <span className="flex flex-1 flex-col gap-1">
                <span className="text-lg font-semibold text-heading">{item.label}</span>
                <span className="text-sm text-help">{item.help}</span>
              </span>
              <span className="material-symbols-outlined text-muted sm:hidden" aria-hidden="true">
                chevron_right
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Page>
  )
}
