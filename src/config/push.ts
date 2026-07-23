/**
 * Öffentliche Web-Push-Konfiguration (darf im Client stehen).
 *
 * - VAPID_PUBLIC_KEY: der ÖFFENTLICHE Schlüssel. Der private Gegenpart liegt
 *   NUR in .vapid-keys.local.json (gitignored) und als Secret in GitHub/Worker.
 *   Neu erzeugen mit `npx web-push generate-vapid-keys` (dann hier + Secrets
 *   aktualisieren).
 * - PUSH_WORKER_URL: der Cloudflare-Worker, der die Abos in KV speichert.
 *   Falls dein workers.dev-Subdomain anders heißt, hier anpassen.
 */
export const VAPID_PUBLIC_KEY =
  'BOQbxWTYTVjFq78eVXLACgqEq9uK3JmPA3PIQaWTnb3Aus0QGZKzg1tf-zYssaZITxg4fmiOn6tuGdZXkD7rgOE';

export const PUSH_WORKER_URL = 'https://ffw-push.thomas-schell.workers.dev';
