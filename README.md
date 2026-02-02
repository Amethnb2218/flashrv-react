# ⚡ FlashRV - Réservation de Salons de Coiffure au Sénégal

![FlashRV](https://img.shields.io/badge/FlashRV-v1.0.0-blue.svg)
![React](https://img.shields.io/badge/React-18.2.0-61dafb.svg)
![Vite](https://img.shields.io/badge/Vite-7.3.1-646CFF.svg)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4.0-38B2AC.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)

## 📋 Description

**FlashRV** est une application web moderne de réservation de rendez-vous pour les salons de coiffure au Sénégal. Elle permet aux clients de découvrir des salons, réserver des services et payer en ligne via **Wave** ou **Orange Money**.

### ✨ Fonctionnalités principales

- 🔍 **Recherche de salons** par localisation et services
- 📅 **Réservation en ligne** avec sélection de créneaux horaires
- 💳 **Paiement intégré** : Wave, Orange Money, Paiement sur place
- 🔐 **Authentification Google OAuth 2.0**
- 👤 **Tableaux de bord** : Client et Coiffeur
- ⭐ **Système d'avis et notes**
- 📱 **Design responsive** (mobile-first)
- 🌙 **Animations fluides** avec Framer Motion

## 🛠️ Stack Technique

| Catégorie         | Technologies                           |
| ----------------- | -------------------------------------- |
| **Frontend**      | React 18.2, Vite 7.3                   |
| **Styling**       | TailwindCSS 3.4, CSS Modules           |
| **Routing**       | React Router DOM 6.21                  |
| **State**         | React Context API                      |
| **Auth**          | Google OAuth 2.0 (@react-oauth/google) |
| **Animations**    | Framer Motion 10.17                    |
| **HTTP Client**   | Axios 1.6                              |
| **Date/Time**     | date-fns 3.0                           |
| **Notifications** | React Hot Toast                        |
| **Icons**         | React Icons 5.0                        |

## 🚀 Installation

### Prérequis

- Node.js 18+
- npm ou yarn
- [Backend FlashRV](https://github.com/votre-username/flashrv-backend) configuré et running

### Étapes

1. **Cloner le repository**

   ```bash
   git clone https://github.com/votre-username/flashrv-react.git
   cd flashrv-react
   ```

2. **Installer les dépendances**

   ```bash
   npm install
   ```

3. **Configurer les variables d'environnement**

   ```bash
   cp .env.example .env
   ```

   Éditez le fichier `.env` avec vos valeurs :

   ```env
   VITE_GOOGLE_CLIENT_ID=votre-client-id.apps.googleusercontent.com
   VITE_API_URL=http://localhost:4000
   ```

4. **Lancer le serveur de développement**

   ```bash
   npm run dev
   ```

   L'application sera disponible sur `http://localhost:5173`

## 📦 Scripts disponibles

| Commande          | Description                         |
| ----------------- | ----------------------------------- |
| `npm run dev`     | Démarre le serveur de développement |
| `npm run build`   | Build de production                 |
| `npm run preview` | Preview du build de production      |
| `npm run lint`    | Analyse ESLint du code              |

## 🌐 Variables d'environnement

| Variable                | Description                | Requis |
| ----------------------- | -------------------------- | ------ |
| `VITE_GOOGLE_CLIENT_ID` | Client ID Google OAuth 2.0 | ✅     |
| `VITE_API_URL`          | URL de l'API backend       | ✅     |

### Configuration Google OAuth

1. Aller sur [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Créer un projet ou en sélectionner un existant
3. Créer des identifiants OAuth 2.0
4. Ajouter les origines autorisées (ex: `http://localhost:5173`)
5. Copier le Client ID dans votre `.env`

## 📁 Structure du projet

```
flashrv-react/
├── public/
│   └── images/           # Images statiques
├── src/
│   ├── components/       # Composants réutilisables
│   │   ├── Auth/         # Composants d'authentification
│   │   ├── Booking/      # Composants de réservation
│   │   ├── Layout/       # Navbar, Footer, Layout
│   │   ├── Salon/        # Composants salon
│   │   └── UI/           # Composants UI génériques
│   ├── context/          # React Context (Auth, Booking)
│   ├── data/             # Données statiques
│   ├── pages/            # Pages de l'application
│   │   ├── Auth/         # Login, Register, ForgotPassword
│   │   ├── Booking/      # Page de réservation
│   │   ├── Dashboard/    # Tableaux de bord
│   │   ├── Payment/      # Pages de paiement
│   │   ├── Profile/      # Profil utilisateur
│   │   └── Salons/       # Liste et détail salons
│   └── utils/            # Fonctions utilitaires
├── .env.example          # Template variables d'environnement
├── tailwind.config.js    # Configuration Tailwind
├── vite.config.js        # Configuration Vite
└── package.json
```

## 🚀 Déploiement

### Vercel (Recommandé)

1. Connecter le repo GitHub à Vercel
2. Configurer les variables d'environnement dans les settings
3. Déployer automatiquement à chaque push

### Netlify

1. Connecter le repo GitHub à Netlify
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Ajouter les variables d'environnement

### Build manuel

```bash
npm run build
```

Le dossier `dist/` contient les fichiers statiques prêts pour la production.

## 🔗 Backend

Ce frontend nécessite le backend FlashRV pour fonctionner :

- **Technologies** : Node.js, Express, Prisma, SQLite/PostgreSQL
- **API** : REST API avec authentification JWT
- **Paiements** : Wave, Orange Money (Sénégal)

## 📱 Captures d'écran

| Accueil                                      | Réservation                                     | Paiement                                        |
| -------------------------------------------- | ----------------------------------------------- | ----------------------------------------------- |
| ![Home](https://via.placeholder.com/250x400) | ![Booking](https://via.placeholder.com/250x400) | ![Payment](https://via.placeholder.com/250x400) |

## 🤝 Contribution

Les contributions sont les bienvenues !

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push sur la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 License

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 👥 Équipe

Développé avec ❤️ pour le marché sénégalais.

---

**FlashRV** - Réservez votre coiffeur en un flash ⚡
