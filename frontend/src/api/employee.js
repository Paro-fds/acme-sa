import { request } from './client.js'

export function getProfile() {
  return request('/me/profile')
}
