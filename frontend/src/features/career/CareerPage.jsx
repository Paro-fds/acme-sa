import { getMyCareer } from '../../api/career.js'
import Alert from '../../components/Alert.jsx'
import Page from '../../components/Page.jsx'
import { useLoader } from '../../lib/useLoader.js'
import CareerSection from './CareerSection.jsx'

/** D-17 : l'employé sait que son parcours sert à le contacter pour des opportunités internes. */
export const VISIBILITY_NOTICE =
  'Votre parcours est visible par l’administration d’ACME SA, qui peut vous contacter pour des opportunités internes.'

/** US-25 : « Mon parcours », disponible à tout moment, indépendamment de la mise à jour de campagne. */
export default function CareerPage() {
  const { data, error, loading } = useLoader(getMyCareer)

  if (loading) return <Page account title="Mon parcours" backTo="/profil"><p role="status">Chargement…</p></Page>
  if (error) return <Page account title="Mon parcours" backTo="/profil"><Alert>{error.message}</Alert></Page>

  return (
    <Page account title="Mon parcours" backTo="/profil">
      <div className="flex flex-col gap-1">
        <h2 className="text-[26px] leading-8 font-bold">Mon parcours</h2>
        <p className="text-help">Vos diplômes, formations, expériences et compétences, à compléter quand vous le souhaitez.</p>
      </div>

      <Alert tone="info">{VISIBILITY_NOTICE}</Alert>

      {data.kinds.map((kind) => (
        <CareerSection key={kind.kind} {...kind} />
      ))}
    </Page>
  )
}
