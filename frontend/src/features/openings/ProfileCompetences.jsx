/** US-121 : compétences attendues pour un poste de la matrice du directeur, toujours visibles. */
export default function ProfileCompetences({ competences }) {
  if (!competences?.length) return null
  return (
    <div className="flex flex-col gap-2">
      <p className="text-base font-semibold text-heading">Compétences attendues</p>
      <ul aria-label="Compétences" className="flex flex-wrap gap-2">
        {competences.map((competence) => (
          <li key={competence} className="rounded-lg bg-section px-3 py-1.5 text-sm break-words text-body">
            {competence}
          </li>
        ))}
      </ul>
    </div>
  )
}
