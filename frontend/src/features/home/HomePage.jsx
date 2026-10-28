import { Link } from 'react-router'
import team from '../../assets/equipe-acme.jpg'
import PublicHeader from '../../components/PublicHeader.jsx'
import { EMPLOYEE_LOGIN_PATH } from '../../lib/paths.js'

const HR_HELP = 'Une question ? Adressez-vous au service RH de votre agence.'

/** Les 3 bénéfices (Demande 1.1), du point de vue de l'employé, sans promesse de résultat. */
const BENEFITS = [
  { icon: 'trending_up', title: 'Vos diplômes reconnus', text: 'Une fois validés par les RH, ils comptent pour les promotions.' },
  {
    icon: 'person_search',
    title: 'Les postes faits pour vous',
    text: 'Vous voyez les postes ouverts dont vous remplissez les critères, et vous postulez en ligne.',
  },
  { icon: 'photo_camera', title: 'Tout depuis votre téléphone', text: 'Vous déposez vos diplômes en photo et vous suivez leur validation.' },
]

const STEPS = [
  'Connectez-vous avec votre code employé, votre date de naissance et un code reçu par courriel.',
  'Vérifiez les 8 informations de votre profil.',
  'Déposez vos diplômes : les RH les valident.',
]

const PRIMARY_LINK =
  'flex min-h-12 items-center justify-center rounded-lg bg-primary px-6 text-[17px] font-semibold text-white transition-colors hover:bg-primary-active'

/**
 * US-105, US-110 : accueil public. Photo d'une équipe d'ACME SA, ce que l'employé y gagne, trois étapes ;
 * ni mascotte ni chiffre (choix du 2026-10-11) ; aucun pourcentage du dossier avant la connexion (D-08).
 */
export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <PublicHeader
        action={
          <Link
            to={EMPLOYEE_LOGIN_PATH}
            className="hidden min-h-11 items-center rounded-lg border-[1.5px] border-primary px-5 font-semibold text-primary hover:bg-info-bg sm:flex"
          >
            Se connecter
          </Link>
        }
      />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 pt-4 pb-44 sm:px-6 lg:gap-14 lg:py-12">
        <section className="grid items-center gap-6 lg:grid-cols-2 lg:gap-12">
          <img
            src={team}
            alt="Une équipe d'ACME SA en polo jaune, devant une agence"
            width="1024"
            height="683"
            fetchPriority="high"
            className="h-56 w-full rounded-2xl object-cover object-[center_30%] sm:h-72 lg:order-last lg:h-96"
          />
          <div className="flex flex-col gap-4 lg:gap-5">
            <h1 className="text-[28px] leading-[35px] font-bold tracking-tight text-primary lg:text-[46px] lg:leading-[54px]">
              Votre carrière commence par un dossier complet
            </h1>
            <p className="text-[17px] leading-relaxed text-help lg:text-lg">
              Vos diplômes validés comptent pour les promotions et les postes ouverts. Encore faut-il que les RH les connaissent.
            </p>
            <div className="hidden flex-col items-start gap-3 lg:flex">
              <Link to={EMPLOYEE_LOGIN_PATH} className={PRIMARY_LINK}>
                Compléter mon dossier
              </Link>
              <p className="text-help">{HR_HELP}</p>
            </div>
          </div>
        </section>

        <div className="grid gap-10 lg:grid-cols-12 lg:gap-10">
          <section className="flex flex-col gap-3 lg:col-span-7">
            <h2 className="text-xl font-bold">Ce que vous y gagnez</h2>
            <ul aria-label="Ce que vous y gagnez" className="flex flex-col lg:grid lg:grid-cols-3 lg:gap-6">
              {BENEFITS.map((benefit) => (
                <li
                  key={benefit.title}
                  className="flex gap-4 border-t border-border py-4 last:border-b lg:flex-col lg:gap-2 lg:border-t-2 lg:border-primary lg:last:border-b-0"
                >
                  <span className="material-symbols-outlined shrink-0 text-primary" aria-hidden="true">
                    {benefit.icon}
                  </span>
                  <div className="flex flex-col gap-1">
                    <h3 className="font-semibold text-heading">{benefit.title}</h3>
                    <p className="text-[15px] leading-snug text-help">{benefit.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="flex flex-col gap-4 lg:col-span-5">
            <h2 className="text-xl font-bold">Trois étapes</h2>
            <ol aria-label="Trois étapes" className="flex flex-col gap-4">
              {STEPS.map((step, index) => (
                <li key={step} className="flex items-baseline gap-3">
                  <span
                    className="flex size-7 shrink-0 items-center justify-center rounded-full bg-info-bg text-sm font-bold text-primary"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <p className="text-center text-sm text-help lg:hidden">
          Réservé aux employés d'ACME SA. Vos informations restent confidentielles.
        </p>
      </main>

      <footer className="hidden border-t border-border lg:block">
        <p className="mx-auto max-w-6xl px-6 py-5 text-sm text-help">
          Réservé aux employés d'ACME SA. Vos informations restent confidentielles.
        </p>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-40 flex flex-col gap-2 border-t border-border bg-surface px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] shadow-sticky lg:hidden">
        <Link to={EMPLOYEE_LOGIN_PATH} className={PRIMARY_LINK}>
          Compléter mon dossier
        </Link>
        <p className="text-center text-sm text-help">{HR_HELP}</p>
      </div>
    </div>
  )
}
