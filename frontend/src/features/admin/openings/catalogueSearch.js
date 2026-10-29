/** Sans accents ni majuscules, pour comparer les intitulés à la recherche. */
export const plain = (text) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

const STARTS_WITH = 0
const WORD_STARTS = 1
const CONTAINS = 2

/** Mots de l'intitulé : « Sous-directeur des opérations » → sous, directeur, des, operations. */
const titleWords = (title) => plain(title).split(/[^a-z0-9]+/).filter(Boolean)

function group(title, query, words) {
  const text = plain(title)
  if (text.startsWith(query)) return STARTS_WITH
  const starts = titleWords(title)
  if (words.every((word) => starts.some((start) => start.startsWith(word)))) return WORD_STARTS
  return CONTAINS
}

/**
 * US-119 CA-01 : garde les postes dont l'intitulé contient tous les mots cherchés (sans accents ni majuscules).
 * US-126 CA-01 : les range en trois groupes, alphabétiques chacun : l'intitulé commence par la recherche ; chaque mot
 * cherché commence un mot de l'intitulé ; l'intitulé contient seulement les mots. Sans recherche, l'ordre reçu reste.
 */
export function searchProfiles(profiles, search) {
  const query = plain(search).trim().replace(/\s+/g, ' ')
  if (!query) return profiles
  const words = query.split(' ')
  return profiles
    .filter((profile) => words.every((word) => plain(profile.title).includes(word)))
    .map((profile) => ({ profile, rank: group(profile.title, query, words) }))
    .sort((a, b) => a.rank - b.rank || a.profile.title.localeCompare(b.profile.title, 'fr'))
    .map(({ profile }) => profile)
}
