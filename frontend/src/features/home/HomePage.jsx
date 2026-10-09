import { Link } from 'react-router'
import logo from '../../assets/logo-acme.png'
import { EMPLOYEE_LOGIN_PATH } from '../../lib/paths.js'

/** Les 3 bénéfices du portail (Demande 1.1), formulés sans promesse de résultat. */
const BENEFITS = [
  {
    icon: 'rocket_launch',
    title: 'Promotion plus rapide',
    subtitle: 'Préparez votre dossier',
    text: 'Votre dossier est prêt quand une opportunité se présente.',
  },
  {
    icon: 'manage_search',
    title: 'Repéré pour les postes vacants',
    subtitle: 'Qualifications visibles',
    text: 'Les RH vous trouvent grâce à vos qualifications réelles.',
  },
  {
    icon: 'explore',
    title: 'Votre carrière en main',
    subtitle: 'Autonomie et clarté',
    text: 'Voyez votre profil, vos qualifications et les postes ouverts.',
  },
]

function WelcomeMessage() {
  return (
    <figure aria-label="La Penseuse" className="flex items-start gap-3 rounded-xl bg-section p-4 shadow-card">
      <div className="flex w-12 shrink-0 flex-col items-center gap-1">
        <span className="relative flex size-12 items-center justify-center rounded-full bg-highlight text-primary">
          <span className="material-symbols-outlined text-2xl" aria-hidden="true">psychology_alt</span>
          <span className="absolute -right-0.5 -bottom-0.5 size-3.5 rounded-full bg-brand-red ring-2 ring-section" />
        </span>
        <span className="text-center text-xs font-semibold leading-tight text-primary">
          Mascotte :<br />La Penseuse
        </span>
      </div>
      <figcaption className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-highlight px-2 py-1 text-xs font-semibold text-primary">
          <span className="material-symbols-outlined text-sm" aria-hidden="true">auto_awesome</span>
          Conseil RH bienveillant
        </span>
        <span className="leading-relaxed">
          « Bienvenue collègue ! Votre parcours au sein d'ACME SA est examiné avec attention et équité, dans un cadre
          strictement confidentiel. »
        </span>
      </figcaption>
    </figure>
  )
}

function AgencyReach() {
  return (
    <section aria-label="Réseau ACME SA" className="relative flex h-36 flex-col justify-end overflow-hidden rounded-xl bg-primary p-4 text-white shadow-card">
      <span className="absolute -top-8 -right-4 size-36 rounded-full bg-white/10" aria-hidden="true" />
      <span className="absolute top-4 right-16 size-16 rounded-full bg-white/5" aria-hidden="true" />
      <div className="relative max-w-full rounded-lg bg-primary/85 p-3 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-on-primary-container" aria-hidden="true">groups</span>
          <h2 className="font-semibold">28 agences interconnectées</h2>
        </div>
        <p className="mt-1 text-sm text-white/90">Un réseau au service des équipes d'ACME SA.</p>
      </div>
    </section>
  )
}

function BenefitCard({ benefit }) {
  return (
    <li className="flex flex-col gap-2 rounded-xl bg-surface p-4 shadow-card transition-transform active:scale-[0.99]">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-info-bg text-primary">
          <span className="material-symbols-outlined" aria-hidden="true">{benefit.icon}</span>
        </span>
        <div className="min-w-0">
          <h3 className="font-bold text-primary">{benefit.title}</h3>
          <span className="text-sm text-help">{benefit.subtitle}</span>
        </div>
      </div>
      <p className="pl-14 text-help">{benefit.text}</p>
    </li>
  )
}

/**
 * US-105 : accueil public inspiré de l'écran 01 validé (D-08).
 * Les seuls chiffres affichés sont les 364 collaborateurs et 28 agences confirmés.
 */
export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 pt-4 pb-56 sm:px-6">
        <section className="flex flex-col gap-2">
          <div className="mb-1 flex items-center justify-between gap-2">
            <div className="flex shrink-0 items-center rounded bg-primary px-3 py-1.5 shadow-card">
              <img src={logo} alt="ACME SA" width="44" height="32" className="h-8 w-11 rounded-sm bg-white object-contain p-0.5" />
            </div>
            <div className="flex min-w-0 items-center gap-1.5 rounded-full bg-info-bg px-2.5 py-1.5 text-sm text-help">
              <span className="material-symbols-outlined shrink-0 text-primary" aria-hidden="true">account_balance</span>
              <span className="truncate">Institution de Microfinance — Haïti</span>
            </div>
          </div>
          <h1 className="text-[26px] leading-[34px] font-bold tracking-tight text-primary sm:text-[32px] sm:leading-10">
            Votre carrière commence par un dossier complet
          </h1>
          <p className="text-help">Le tremplin interne d'évolution géré par les RH d'ACME SA.</p>
        </section>

        <WelcomeMessage />
        <AgencyReach />

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Vos opportunités internes</h2>
            <span className="shrink-0 text-sm font-medium text-help">Portail Carrière</span>
          </div>
          <ul aria-label="Ce que le portail vous apporte" className="grid gap-3 md:grid-cols-2">
            {BENEFITS.map((benefit) => <BenefitCard key={benefit.title} benefit={benefit} />)}
          </ul>
        </section>

        <section aria-label="Collaborateurs ACME SA" className="flex items-center gap-3 rounded-xl bg-section p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-highlight text-primary">
            <span className="material-symbols-outlined" aria-hidden="true">groups</span>
          </span>
          <div className="min-w-0">
            <h2 className="font-semibold">364 collaborateurs ACME SA</h2>
            <p className="text-sm text-help">Un espace commun pour le suivi de votre dossier professionnel.</p>
          </div>
        </section>
      </main>

      <footer className="fixed right-0 bottom-0 left-0 z-40 flex flex-col items-center border-t border-border bg-surface px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] shadow-sticky">
        <p className="mb-2 flex w-full items-center justify-center gap-1.5 text-center text-sm text-help">
          <span className="material-symbols-outlined shrink-0 text-primary" aria-hidden="true">lock</span>
          Accès réservé aux 364 collaborateurs ACME SA · Vos informations restent confidentielles.
        </p>
        <Link
          to={EMPLOYEE_LOGIN_PATH}
          className="flex min-h-12 w-full max-w-3xl items-center justify-center gap-2 rounded-lg bg-primary px-5 font-semibold text-white transition-colors hover:bg-primary-active"
        >
          <span className="material-symbols-outlined" aria-hidden="true">login</span>
          Se connecter
        </Link>
        <p className="mt-1 inline-flex min-h-11 items-center justify-center gap-1.5 text-center text-sm font-medium text-primary">
          <span className="material-symbols-outlined text-base" aria-hidden="true">contact_support</span>
          Besoin d’aide pour vous connecter ? Contactez les RH
        </p>
      </footer>
    </div>
  )
}
