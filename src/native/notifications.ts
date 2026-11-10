/**
 * Notifications wrapper.
 * TODAY: in-app inbox (store-derived) + optional browser Notification API.
 * CAPACITOR: npm i @capacitor/push-notifications, then:
 *   import { PushNotifications } from '@capacitor/push-notifications'
 *   const perm = await PushNotifications.requestPermissions()
 *   if (perm.receive === 'granted') { await PushNotifications.register() }
 *   PushNotifications.addListener('registration', t => api.post('/devices', { token: t.value }))
 *   PushNotifications.addListener('pushNotificationReceived', n => ...refresh inbox)
 * Requires Firebase (google-services.json) on Android and APNs setup on iOS.
 */
export async function enablePush(): Promise<'granted' | 'denied' | 'unsupported'> {
  if (!('Notification' in window)) return 'unsupported'
  const r = await Notification.requestPermission()
  return r === 'granted' ? 'granted' : 'denied'
}
export function notifyLocal(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body })
}
