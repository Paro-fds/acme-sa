import { Link } from 'react-router'
import Mascot from '../../components/Mascot.jsx'
import Page from '../../components/Page.jsx'
import { EMPLOYEE_LOGIN_PATH } from '../../lib/paths.js'

/** Les 3 bénéfices du portail (Demande 1.1). Textes sans promesse que le portail ne tient pas seul (tension T4). */
const BENEFITS = [
  {
    icon: 'rocket_launch',
    title: 'Promotion plus rapide',
    text: 'Votre dossier est prêt quand une opportunité se présente.',
  },
  {
    icon: 'manage_search',
    title: 'Repéré pour les postes vacants',
    text: 'Les RH vous trouvent grâce à vos qualifications réelles.',
  },
  {
    icon: 'explore',
    title: 'Votre carrière en main',
    text: 'Voyez votre profil, vos qualifications et les postes ouverts.',
  },
]

/**
 * US-105 : page d'accueil, vue avant la connexion (D-08).
 * Pas de pourcentage ici : l'employé n'est pas encore identifié.
 */
export default function HomePage() {
  return (
    <Page
      title="Portail Carrière"
      actions={
        <Link
          to={EMPLOYEE_LOGIN_PATH}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-base font-semibold text-white transition-colors hover:bg-primary-active"
        >
          <span className="material-symbols-outlined" aria-hidden="true">login</span>
          Se connecter
        </Link>
      }
    >
      <section className="flex flex-col gap-2">
        <p className="text-sm font-semibold tracking-wide text-muted uppercase">Institution de Microfinance — Haïti</p>
        <h2 className="text-[26px] leading-8 font-bold">Votre carrière commence par un dossier complet</h2>
        <p>Le tremplin interne d'évolution géré par les RH d'ACME SA.</p>
      </section>

      <Mascot>
        « Bienvenue, collègue ! Votre parcours au sein d'ACME SA est examiné avec attention et équité, dans un cadre
        strictement confidentiel. »
      </Mascot>

      <section className="flex flex-col gap-3">
        <h2 id="benefits-title" className="text-lg font-semibold">
          Vos opportunités internes
        </h2>
        <ul aria-label="Ce que le portail vous apporte" className="grid gap-3 md:grid-cols-3">
          {BENEFITS.map((benefit) => (
            <li key={benefit.title} className="flex gap-3 rounded-xl border border-border bg-surface p-4 shadow-card md:flex-col">
              <span className="material-symbols-outlined shrink-0 text-primary" aria-hidden="true">
                {benefit.icon}
              </span>
              <div className="flex flex-col gap-1">
                <h3 className="font-semibold">{benefit.title}</h3>
                <p>{benefit.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <p className="flex items-center gap-2 text-help">
        <span className="material-symbols-outlined shrink-0" aria-hidden="true">support_agent</span>
        Une question ? Adressez-vous au service RH de votre agence.
      </p>

      <p className="flex items-center gap-2 text-sm text-muted">
        <span className="material-symbols-outlined shrink-0 text-[20px]" aria-hidden="true">lock</span>
        Accès réservé aux employés d'ACME SA. Vos informations restent strictement confidentielles.
      </p>
    </Page>
  )
}
