# Odoo ⇄ Supabase Sync (GitHub Actions)

Ce dossier contient le job d'intégration entre Supabase et Odoo exécuté par GitHub Actions.

## Démarrage rapide

1. Copier ce dossier `ops/odoo-sync/` dans votre dépôt.
2. Créer les **Secrets** dans GitHub (`Settings → Environments → dev/prod → Secrets`):
   - `SUPABASE_URL`, `SUPABASE_KEY`
   - `ODOO_URL`, `ODOO_DB`, `ODOO_USER`, `ODOO_PASSWORD`
3. Lancer le workflow manuellement (**Actions → Odoo ⇄ Supabase Sync → Run workflow**) avec `env=dev` et `dry_run=true`.
4. Passer en prod : `env=prod` et `dry_run=false` quand c'est validé.

## Exécution locale (debug)
```bash
uv sync
export $(grep -v '^#' .env | xargs)
uv run python sync_supabase_odoo.py
```

> Le script principal est `sync_supabase_odoo.py`. Remplacez-le par votre logique actuelle si nécessaire.