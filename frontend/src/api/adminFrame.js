import { request } from './client.js'

/** US-108 : nom et rôle du compte, et compteurs réels du menu de l'espace RH (écran A02). */
export async function getAdminFrame() {
  const [me, counts] = await Promise.all([request('/admin/me'), request('/admin/menu-counts')])
  return { me, counts }
}
