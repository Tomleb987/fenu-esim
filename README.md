# Fenua SIM

Application de gestion de cartes SIM développée avec Next.js, TypeScript, Tailwind CSS et Supabase.

## Prérequis

- Node.js 18.x ou supérieur
- npm ou yarn
- Un compte Supabase

## Installation

1. Clonez le dépôt :
```bash
git clone [URL_DU_REPO]
cd fenuasim-v4
```

2. Installez les dépendances :
```bash
npm install
# ou
yarn install
```

3. Créez un fichier `.env.local` à la racine du projet avec les variables suivantes :
```
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_clé_anon_supabase
```

4. Lancez le serveur de développement :
```bash
npm run dev
# ou
yarn dev
```

L'application sera accessible à l'adresse [http://localhost:3000](http://localhost:3000).

## Déploiement sur Vercel

1. Créez un compte sur [Vercel](https://vercel.com) si ce n'est pas déjà fait.

2. Importez votre projet depuis GitHub.

3. Configurez les variables d'environnement dans les paramètres du projet Vercel :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. Déployez !

## Structure du projet

```
src/
  ├── pages/          # Pages et routes API
  ├── lib/            # Utilitaires et configuration
  └── styles/         # Styles globaux
```

## Fonctionnalités

- Authentification avec Supabase Auth
- Dashboard protégé
- API REST pour la gestion des utilisateurs
- Interface responsive avec Tailwind CSS

## Technologies utilisées

- Next.js 14
- TypeScript
- Tailwind CSS
- Supabase (Auth + Database)
- React 18
