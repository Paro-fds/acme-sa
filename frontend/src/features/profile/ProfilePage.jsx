import { useId } from 'react'
import { Link } from 'react-router'
import { getProfile } from '../../api/employee.js'
import Alert from '../../components/Alert.jsx'
import Page from '../../components/Page.jsx'
import { initials } from '../../lib/format.js'
import { useLoader } from '../../lib/useLoader.js'
import { CERTIFICATES_PATH } from '../certificates/paths.js'
import { CONTACT_EDUCATION_PATH, COORDINATES_PATH, HR_INFORMATION_PATH } from '../dossier/paths.js'
import CompletionCard from './CompletionCard.jsx'
import InfoSection from './InfoSection.jsx'
import { UNIT_TO_CONFIRM, profileSections } from './profileSections.js'

function ProfileSummary({ profile }) {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className="rounded-xl bg-surface p-4 shadow-card">
      <div className="flex items-center gap-4">
        <div
          aria-hidden="true"
          className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-white"
        >
          {initials(profile.last_name, profile.first_name)}
        </div>
        <div className="flex min-w-0 flex-col">
          <h2 id={titleId} className="text-xl font-bold break-words">
            {profile.last_name} {profile.first_name}
          </h2>
          <p className="font-semibold text-info-text">{profile.position}</p>
          <p className="flex items-center gap-1 text-sm text-muted">
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">location_on</span>
            <span>{profile.affectation.agency ?? UNIT_TO_CONFIRM}</span>
          </p>
          <p className="text-sm text-muted">Matricule {profile.employee_code}</p>
        </div>
      </div>
    </section>
  )
}

/** US-202 : sections du dossier à compléter (maquettes 08, 09). */
const DOSSIER_SECTIONS = [
  { to: COORDINATES_PATH, icon: 'contact_phone', title: 'Mes coordonnées', text: 'Section 1 / 3 · Téléphone, adresse, email' },
  { to: CONTACT_EDUCATION_PATH, icon: 'school', title: "Contact d'urgence & études", text: "Section 2 / 3 · Personne à prévenir, niveau d'études" },
  { to: HR_INFORMATION_PATH, icon: 'badge', title: 'Mes informations RH', text: "Section 3 / 3 · Agence, poste, date d'embauche" },
]

function NavCard({ to, icon, title, text }) {
  return (
    <Link
      to={to}
      className="flex min-h-16 items-center gap-3 rounded-xl bg-surface p-4 shadow-card hover:bg-canvas"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-info-bg text-info-text" aria-hidden="true">
        <span className="material-symbols-outlined">{icon}</span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-semibold text-heading">{title}</span>
        <span className="text-sm text-help">{text}</span>
      </span>
      <span className="material-symbols-outlined text-muted" aria-hidden="true">chevron_right</span>
    </Link>
  )
}

/** US-201 (dossier et pourcentage), sections du dossier (US-202, US-203), « Mes certificats » (US-204, US-301) et « Mon parcours » (hérité de la V2, D-44). */
export default function ProfilePage() {
  const { data: profile, error, loading } = useLoader(getProfile)

  if (loading) return <Page account title="Mon profil"><p role="status">Chargement…</p></Page>
  if (error) return <Page account title="Mon profil"><Alert>{error.message}</Alert></Page>
  if (!profile) return <Page account title="Mon profil"><Alert>Impossible de charger le profil.</Alert></Page>

  const editable = (fieldName) => profile.editable_fields.includes(fieldName)

  return (
    <Page account title="Mon profil">
      <ProfileSummary profile={profile} />
      <CompletionCard completion={profile.completion} />
      {DOSSIER_SECTIONS.map((section) => (
        <NavCard key={section.to} {...section} />
      ))}
      <NavCard
        to={CERTIFICATES_PATH}
        icon="workspace_premium"
        title="Mes certificats"
        text={profile.completion.is_complete ? 'Déposer et suivre mes certificats' : 'Disponible dès votre profil complet'}
      />
      <NavCard to="/parcours" icon="timeline" title="Mon parcours" text="Diplômes, formations, expériences et compétences" />

      {profileSections(profile).map(({ icon, title, fields }) => (
        <InfoSection
          key={title}
          icon={icon}
          title={title}
          fields={fields.map(({ field, ...rest }) => ({ ...rest, editable: Boolean(field) && editable(field) }))}
        />
      ))}
    </Page>
  )
}
