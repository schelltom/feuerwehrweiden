# ffw-push – Abo-Speicher für Web-Push

Kleiner Cloudflare Worker, der die Push-Abos der Website in einem KV-Namespace
speichert. Getrennt vom CMS-Login-Worker (`ffw-cms-auth`).

## Einmalige Einrichtung

Aus diesem Ordner heraus (`push-worker/`):

```bash
# 1. Bei Cloudflare anmelden (öffnet den Browser)
npx wrangler login

# 2. KV-Namespace anlegen – gibt eine id aus
npx wrangler kv namespace create SUBS
#    → die ausgegebene id in wrangler.toml bei kv_namespaces eintragen
#      (Platzhalter HIER_KV_ID_EINTRAGEN ersetzen)

# 3. Shared-Secret setzen (dasselbe kommt als GitHub-Secret PUSH_LIST_TOKEN)
#    Einen langen Zufallswert nehmen, z. B.:  openssl rand -hex 32
npx wrangler secret put LIST_TOKEN

# 4. Deployen
npx wrangler deploy
```

Nach dem Deploy zeigt wrangler die URL, z. B.
`https://ffw-push.<subdomain>.workers.dev`.

- Stimmt sie mit `PUSH_WORKER_URL` in `src/config/push.ts` überein? Falls nicht,
  dort anpassen (und als GitHub-Secret `PUSH_WORKER_URL` hinterlegen).

## GitHub-Secrets (Repo → Settings → Secrets and variables → Actions)

| Secret | Wert |
| --- | --- |
| `VAPID_PUBLIC` | öffentlicher VAPID-Key (= der in `src/config/push.ts`) |
| `VAPID_PRIVATE` | privater VAPID-Key (aus `.vapid-keys.local.json`) |
| `VAPID_SUBJECT` | `mailto:…` Kontaktadresse |
| `PUSH_WORKER_URL` | die Worker-URL von oben |
| `PUSH_LIST_TOKEN` | derselbe Wert wie das Worker-Secret `LIST_TOKEN` |

## VAPID-Keys neu erzeugen (falls nötig)

```bash
npx web-push generate-vapid-keys
```

Dann `src/config/push.ts` (public) und die Secrets `VAPID_PUBLIC` /
`VAPID_PRIVATE` aktualisieren. Achtung: Nach dem Wechsel müssen sich alle
Abonnenten neu anmelden.
