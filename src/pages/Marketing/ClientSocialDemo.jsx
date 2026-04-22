import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  BellRing,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Heart,
  LogIn,
  Pause,
  Play,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  UserRoundPlus,
} from 'lucide-react'
import './clientSocialDemo.css'

const DEMO_DURATION = 40

const SCENES = [
  {
    id: 'intro',
    step: '01',
    label: 'Intro premium',
    duration: 4,
    title: "Jolof'Era met la reservation salon et l'achat article dans une seule experience.",
    description:
      "Une pub verticale de 40 secondes pour raconter le parcours client avec plus de desir, plus de clarte et plus d'utilite.",
    callout: 'Un reel social qui montre enfin la valeur du produit.',
    bullets: ['Identite Jolof Era claire', 'Promesse client immediate', 'Direction plus lumineuse'],
    palette: {
      background:
        'radial-gradient(circle at 18% 18%, rgba(255,190,132,0.38), transparent 28%), radial-gradient(circle at 84% 76%, rgba(255,121,93,0.28), transparent 30%), linear-gradient(180deg, #fff8ef 0%, #fff2e4 100%)',
      accent: '#b85b2f',
      chip: '#fff3d8',
      glow: 'rgba(255, 190, 132, 0.46)',
    },
  },
  {
    id: 'home',
    step: '02',
    label: 'Page accueil',
    duration: 5,
    title: "La page d'accueil pose la marque, oriente vers salons et boutique, et donne envie d'explorer.",
    description:
      "On voit des categories, une recherche visible et des acces directs vers les grands usages client de Jolof'Era.",
    callout: "L'accueil ne doit pas juste etre beau, il doit guider.",
    bullets: ['Accueil visible', 'Pont direct vers salons', 'Pont direct vers boutique'],
    palette: {
      background:
        'radial-gradient(circle at 16% 16%, rgba(255,214,161,0.36), transparent 26%), radial-gradient(circle at 86% 78%, rgba(255,153,127,0.25), transparent 28%), linear-gradient(180deg, #fffaf4 0%, #fff3ea 100%)',
      accent: '#c96a3f',
      chip: '#fff5df',
      glow: 'rgba(255, 214, 161, 0.48)',
    },
  },
  {
    id: 'signup',
    step: '03',
    label: 'Inscription',
    duration: 4,
    title: "L'inscription doit paraitre simple, rassurante et utile des le premier ecran.",
    description:
      "Le compte client promet tout de suite l'acces aux reservations, aux favoris et aux achats en boutique.",
    callout: 'Un formulaire plus clair convertit mieux.',
    bullets: ['Creation de compte rapide', 'Benefices visibles', 'Rassurance immediate'],
    palette: {
      background:
        'radial-gradient(circle at 18% 18%, rgba(255,221,175,0.34), transparent 26%), radial-gradient(circle at 82% 76%, rgba(255,133,104,0.28), transparent 30%), linear-gradient(180deg, #fff8f0 0%, #fff0e8 100%)',
      accent: '#ba5538',
      chip: '#fff4db',
      glow: 'rgba(255, 165, 118, 0.44)',
    },
  },
  {
    id: 'login',
    step: '04',
    label: 'Connexion',
    duration: 4,
    title: 'La connexion relance le parcours client sans casser le desir ni la confiance.',
    description:
      'Email, Google et securite visible: tout doit donner le sentiment que revenir sur Jolof Era est simple et naturel.',
    callout: 'Connexion fluide, retour rapide vers les usages.',
    bullets: ['Connexion claire', 'Signal de securite', 'Reprise du parcours'],
    palette: {
      background:
        'radial-gradient(circle at 82% 14%, rgba(255,199,148,0.34), transparent 28%), radial-gradient(circle at 20% 84%, rgba(255,145,114,0.22), transparent 30%), linear-gradient(180deg, #fffaf4 0%, #fff3eb 100%)',
      accent: '#b76244',
      chip: '#fff4df',
      glow: 'rgba(255, 199, 148, 0.44)',
    },
  },
  {
    id: 'salons',
    step: '05',
    label: 'Page salons',
    duration: 6,
    title: 'Les pages salons doivent montrer les adresses, les avis, les services et la reservation.',
    description:
      "La demo montre maintenant l'univers salon de facon explicite: recherche, carte salon, details service et choix d'un creneau.",
    callout: "C'est la que la promesse de reservation devient concrete.",
    bullets: ['Page salons visible', 'Fiche salon visible', 'Reservation visible'],
    palette: {
      background:
        'radial-gradient(circle at 16% 18%, rgba(255,209,148,0.38), transparent 26%), radial-gradient(circle at 86% 78%, rgba(255,145,105,0.24), transparent 32%), linear-gradient(180deg, #fff9f2 0%, #fff2e6 100%)',
      accent: '#ba6036',
      chip: '#fff5df',
      glow: 'rgba(255, 209, 148, 0.48)',
    },
  },
  {
    id: 'boutique',
    step: '06',
    label: 'Page boutique',
    duration: 6,
    title: "La boutique doit aussi vivre dans la demo avec ses produits, son panier et son rythme propre.",
    description:
      "Le client voit ici l'univers achat article de Jolof'Era, pas juste une allusion: produits, panier et validation sont reellement mis en scene.",
    callout: 'Le shopping doit paraitre premium, pas secondaire.',
    bullets: ['Page boutique visible', 'Produits bien mis en avant', 'Panier et total visibles'],
    palette: {
      background:
        'radial-gradient(circle at 84% 16%, rgba(255,180,141,0.34), transparent 26%), radial-gradient(circle at 18% 82%, rgba(255,224,177,0.28), transparent 28%), linear-gradient(180deg, #fff8f2 0%, #fff0e6 100%)',
      accent: '#b3573f',
      chip: '#fff4dd',
      glow: 'rgba(255, 180, 141, 0.46)',
    },
  },
  {
    id: 'benefits',
    step: '07',
    label: 'Avantages client',
    duration: 6,
    title: "Le client gagne du temps, garde ses favoris et retrouve ses actions dans une seule experience.",
    description:
      "Jolof'Era devient plus pratique a chaque visite: rappels, historique, favoris et usages centralises renforcent la valeur du compte.",
    callout: 'Le vrai luxe: tout retrouver sans effort.',
    bullets: ['Favoris memorises', 'Historique reserve + achete', 'Rappels utiles'],
    palette: {
      background:
        'radial-gradient(circle at 20% 18%, rgba(255,216,164,0.36), transparent 26%), radial-gradient(circle at 78% 78%, rgba(255,155,119,0.24), transparent 30%), linear-gradient(180deg, #fff9f4 0%, #fff3ea 100%)',
      accent: '#b45e43',
      chip: '#fff4dc',
      glow: 'rgba(255, 216, 164, 0.46)',
    },
  },
  {
    id: 'outro',
    step: '08',
    label: 'Outro',
    duration: 5,
    title: "Jolof'Era. Inscription, connexion, salon et boutique dans une pub enfin complete.",
    description:
      "Une version plus claire, plus animee et plus lumineuse, prete a servir de base pour une vraie publication reseaux sociaux.",
    callout: 'Tout le parcours client. Une seule signature.',
    bullets: ['Marque corrigee', 'Scenes plus visibles', 'Motion plus captivante'],
    palette: {
      background:
        'radial-gradient(circle at 50% 14%, rgba(255,197,139,0.38), transparent 28%), radial-gradient(circle at 50% 84%, rgba(255,141,106,0.24), transparent 30%), linear-gradient(180deg, #fff8f1 0%, #fff0e4 100%)',
      accent: '#ab4c34',
      chip: '#fff5dd',
      glow: 'rgba(255, 197, 139, 0.48)',
    },
  },
]

const sceneCardTransition = {
  initial: { opacity: 0, y: 28, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -20, scale: 0.99, transition: { duration: 0.3, ease: 'easeInOut' } },
}

function getSceneState(elapsed) {
  let offset = 0

  for (let index = 0; index < SCENES.length; index += 1) {
    const scene = SCENES[index]
    const end = offset + scene.duration

    if (elapsed < end || index === SCENES.length - 1) {
      return {
        index,
        scene,
        progress: scene.duration ? Math.min(1, Math.max(0, (elapsed - offset) / scene.duration)) : 0,
      }
    }

    offset = end
  }

  return { index: SCENES.length - 1, scene: SCENES[SCENES.length - 1], progress: 1 }
}

function formatTime(value) {
  const safeValue = Math.max(0, Math.min(DEMO_DURATION, value))
  const minutes = Math.floor(safeValue / 60)
  const seconds = Math.floor(safeValue % 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function FloatCard({ children, className = '', delay = 0 }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: [0, -6, 0] }}
      transition={{
        opacity: { duration: 0.5, delay },
        y: { duration: 4.2, delay, repeat: Infinity, ease: 'easeInOut' },
      }}
    >
      {children}
    </motion.div>
  )
}

function ScreenShell({ children }) {
  return (
    <motion.div
      className="client-social-demo__phone mx-auto h-full w-full max-w-[19.2rem] p-3"
      initial={{ opacity: 0, y: 18, rotate: -1.4, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
      exit={{ opacity: 0, y: -18, rotate: 1.2, scale: 0.98 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="relative h-full overflow-hidden rounded-[2rem] border border-[#f2d7be] bg-[#fffaf4] shadow-[0_22px_60px_rgba(199,124,78,0.18)]">
        {children}
      </div>
    </motion.div>
  )
}

function AppHeader({ title, subtitle, icon: Icon }) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#b07a5a]">Jolof'Era</div>
        <div className="mt-1 text-[1rem] font-black tracking-[-0.04em] text-[#2f190f]">{title}</div>
        {subtitle ? <div className="mt-1 text-xs text-[#8a6451]">{subtitle}</div> : null}
      </div>
      {Icon ? (
        <div className="rounded-full border border-[#f1d6bf] bg-white px-2.5 py-2 text-[#bb6038] shadow-[0_8px_20px_rgba(176,111,73,0.12)]">
          <Icon className="h-4 w-4" />
        </div>
      ) : null}
    </div>
  )
}

function MiniTabBar({ active }) {
  const items = ['Accueil', 'Salons', 'Boutique']

  return (
    <div className="mt-auto grid grid-cols-3 gap-2 rounded-[1.1rem] border border-[#f1dac8] bg-white/90 p-2">
      {items.map((item) => (
        <div
          key={item}
          className={`rounded-[0.85rem] px-2 py-2 text-center text-[11px] font-semibold ${
            active === item ? 'bg-[#2e190f] text-white' : 'bg-[#fff7f0] text-[#9b735d]'
          }`}
        >
          {item}
        </div>
      ))}
    </div>
  )
}

function IntroPhone() {
  return (
    <ScreenShell>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,212,157,0.5),transparent_26%),linear-gradient(180deg,#fffaf4_0%,#fff1e6_100%)]" />
      <div className="relative flex h-full flex-col justify-between px-5 pb-5 pt-11">
        <FloatCard className="rounded-[1.5rem] border border-[#efd8c4] bg-white/90 p-4 shadow-[0_16px_35px_rgba(198,124,74,0.12)]">
          <div className="flex items-center justify-between">
            <div className="rounded-[1.2rem] bg-[#2f190f] px-4 py-3 text-2xl font-black text-white">J</div>
            <Sparkles className="h-5 w-5 text-[#ca6b3d]" />
          </div>
          <div className="mt-4 text-[1.55rem] font-black leading-[1.02] tracking-[-0.05em] text-[#2f190f]">
            Reserve.
            <br />
            Shoppe.
            <br />
            Reviens.
          </div>
          <div className="mt-3 text-sm leading-6 text-[#7c5a48]">
            Jolof'Era connecte salon, boutique et confort client dans une meme app.
          </div>
        </FloatCard>

        <div className="grid grid-cols-2 gap-3">
          <FloatCard className="rounded-[1.3rem] border border-[#efd8c4] bg-[#fff7ee] p-4" delay={0.1}>
            <div className="text-xl font-black text-[#2f190f]">40s</div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-[#a47a63]">narration</div>
          </FloatCard>
          <FloatCard className="rounded-[1.3rem] border border-[#efd8c4] bg-[#fff7ee] p-4" delay={0.18}>
            <div className="text-xl font-black text-[#2f190f]">9:16</div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-[#a47a63]">reseaux</div>
          </FloatCard>
        </div>

        <FloatCard className="rounded-[1.35rem] border border-[#f0d1bb] bg-[#fff3df] px-4 py-3" delay={0.24}>
          <div className="text-xs uppercase tracking-[0.22em] text-[#b0613f]">Signature</div>
          <div className="mt-1 text-sm font-semibold text-[#3b2014]">
            Inscription, connexion, reservation et achat article.
          </div>
        </FloatCard>
      </div>
    </ScreenShell>
  )
}

function HomePhone() {
  return (
    <ScreenShell>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,205,154,0.42),transparent_20%),linear-gradient(180deg,#fffdf9_0%,#fff3e8_100%)]" />
      <div className="relative flex h-full flex-col px-5 pb-5 pt-11">
        <AppHeader title="Accueil" subtitle="Salons et boutique a portee de main" icon={Sparkles} />

        <FloatCard className="mt-4 rounded-[1.2rem] border border-[#eed7c3] bg-white px-4 py-3 shadow-[0_12px_30px_rgba(191,130,95,0.1)]">
          <div className="flex items-center gap-2 text-sm text-[#8a6653]">
            <Search className="h-4 w-4 text-[#bc673f]" />
            Rechercher un salon ou un article
          </div>
        </FloatCard>

        <FloatCard className="mt-4 rounded-[1.5rem] border border-[#f0d6bf] bg-[linear-gradient(135deg,#2f190f_0%,#804328_100%)] p-4 text-white shadow-[0_18px_35px_rgba(89,44,25,0.26)]" delay={0.08}>
          <div className="text-[10px] uppercase tracking-[0.24em] text-white/68">Hero</div>
          <div className="mt-2 text-lg font-black leading-tight">Reservez votre salon ou achetez vos essentiels en toute simplicite.</div>
          <div className="mt-3 inline-flex rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#7c3e23]">
            Explorer maintenant
          </div>
        </FloatCard>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <FloatCard className="rounded-[1.4rem] border border-[#efd6c1] bg-white p-4" delay={0.12}>
            <CalendarDays className="h-5 w-5 text-[#be633b]" />
            <div className="mt-3 text-sm font-bold text-[#2f190f]">Univers salons</div>
            <div className="mt-1 text-xs leading-5 text-[#89624f]">Trouver un salon, voir les avis, choisir un creneau.</div>
          </FloatCard>
          <FloatCard className="rounded-[1.4rem] border border-[#efd6c1] bg-white p-4" delay={0.18}>
            <Store className="h-5 w-5 text-[#be633b]" />
            <div className="mt-3 text-sm font-bold text-[#2f190f]">Univers boutique</div>
            <div className="mt-1 text-xs leading-5 text-[#89624f]">Acheter ses produits, remplir son panier, valider.</div>
          </FloatCard>
        </div>

        <MiniTabBar active="Accueil" />
      </div>
    </ScreenShell>
  )
}

function SignupPhone() {
  return (
    <ScreenShell>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,214,170,0.42),transparent_22%),linear-gradient(180deg,#fffdf9_0%,#fff3ea_100%)]" />
      <div className="relative flex h-full flex-col px-5 pb-5 pt-11">
        <AppHeader title="Inscription client" subtitle="Creer un compte Jolof'Era" icon={UserRoundPlus} />

        <FloatCard className="mt-5 rounded-[1.6rem] border border-[#efd7c4] bg-white p-4 shadow-[0_14px_30px_rgba(188,127,93,0.1)]">
          <div className="text-sm font-semibold text-[#3a2115]">Profitez de vos reservations et achats au meme endroit</div>
          <div className="mt-4 space-y-3">
            {['Nom complet', 'Telephone', 'Email', 'Mot de passe'].map((item) => (
              <div key={item} className="rounded-[1rem] border border-[#f1dfd0] bg-[#fff8f2] px-4 py-3 text-sm text-[#9a7360]">
                {item}
              </div>
            ))}
          </div>
        </FloatCard>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <FloatCard className="rounded-[1.2rem] border border-[#f0d3bc] bg-[#fff4e2] px-3 py-3 text-xs font-semibold text-[#88492b]" delay={0.08}>
            Reservation salon
          </FloatCard>
          <FloatCard className="rounded-[1.2rem] border border-[#f0d3bc] bg-[#fff4e2] px-3 py-3 text-xs font-semibold text-[#88492b]" delay={0.16}>
            Achat article
          </FloatCard>
        </div>

        <FloatCard className="mt-auto rounded-[1.35rem] border border-[#f0d4bb] bg-[#2f190f] px-4 py-3 text-white" delay={0.22}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Creer mon compte</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </FloatCard>
      </div>
    </ScreenShell>
  )
}

function LoginPhone() {
  return (
    <ScreenShell>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,214,167,0.42),transparent_22%),linear-gradient(180deg,#fffdf8_0%,#fff4ea_100%)]" />
      <div className="relative flex h-full flex-col px-5 pb-5 pt-11">
        <AppHeader title="Connexion" subtitle="Bon retour sur Jolof'Era" icon={LogIn} />

        <FloatCard className="mt-6 rounded-[1.6rem] border border-[#efd7c4] bg-white p-4 shadow-[0_14px_30px_rgba(188,127,93,0.1)]">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-[#3a2115]">Retrouve tes favoris et ton historique</div>
            <div className="rounded-full bg-[#ecfff2] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#1d7b48]">
              Securise
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <div className="rounded-[1rem] border border-[#f1dfd0] bg-[#fff8f2] px-4 py-3 text-sm text-[#9a7360]">Email</div>
            <div className="rounded-[1rem] border border-[#f1dfd0] bg-[#fff8f2] px-4 py-3 text-sm text-[#9a7360]">Mot de passe</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-[1rem] bg-[#2f190f] px-3 py-3 text-center text-xs font-semibold text-white">Connexion email</div>
            <div className="rounded-[1rem] border border-[#edd5bf] bg-white px-3 py-3 text-center text-xs font-semibold text-[#3a2115]">
              Continuer avec Google
            </div>
          </div>
        </FloatCard>

        <div className="mt-auto grid grid-cols-2 gap-3">
          <FloatCard className="rounded-[1.2rem] border border-[#efd7c4] bg-white p-4" delay={0.08}>
            <ShieldCheck className="h-5 w-5 text-[#be633b]" />
            <div className="mt-2 text-xs font-semibold text-[#3a2115]">Confiance</div>
          </FloatCard>
          <FloatCard className="rounded-[1.2rem] border border-[#efd7c4] bg-white p-4" delay={0.16}>
            <CheckCircle2 className="h-5 w-5 text-[#1d7b48]" />
            <div className="mt-2 text-xs font-semibold text-[#3a2115]">Retour instantane</div>
          </FloatCard>
        </div>
      </div>
    </ScreenShell>
  )
}

function SalonsPhone() {
  return (
    <ScreenShell>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,212,162,0.42),transparent_24%),linear-gradient(180deg,#fffdf9_0%,#fff3e8_100%)]" />
      <div className="relative flex h-full flex-col px-5 pb-5 pt-11">
        <AppHeader title="Salons" subtitle="Trouver, comparer, reserver" icon={CalendarDays} />

        <FloatCard className="mt-4 rounded-[1.2rem] border border-[#eed7c3] bg-white px-4 py-3 shadow-[0_12px_30px_rgba(191,130,95,0.1)]">
          <div className="flex items-center gap-2 text-sm text-[#8a6653]">
            <Search className="h-4 w-4 text-[#bc673f]" />
            Rechercher un salon
          </div>
        </FloatCard>

        <div className="mt-4 space-y-3">
          <FloatCard className="rounded-[1.4rem] border border-[#efd7c4] bg-white p-4" delay={0.06}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-bold text-[#2f190f]">Maison Signature</div>
                <div className="mt-1 flex items-center gap-1 text-xs text-[#89624f]">
                  <Star className="h-3.5 w-3.5 text-[#bf663f]" />
                  4.9 . Plateau
                </div>
              </div>
              <div className="rounded-full bg-[#fff1df] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#b15e39]">
                Populaire
              </div>
            </div>
            <div className="mt-3 rounded-[1rem] bg-[#fff7f1] p-3">
              <div className="flex items-center justify-between text-sm text-[#2f190f]">
                <span className="font-semibold">Brushing signature</span>
                <span>12 000 FCFA</span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-[#8b6552]">
                <Clock3 className="h-3.5 w-3.5" />
                45 min
              </div>
            </div>
          </FloatCard>

          <FloatCard className="rounded-[1.4rem] border border-[#efd7c4] bg-white p-4" delay={0.14}>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[#ab7c62]">Reservation</div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {['10:00', '11:00', '13:30'].map((slot, index) => (
                <div
                  key={slot}
                  className={`rounded-[0.95rem] px-2 py-2 text-center text-xs font-semibold ${
                    index === 1 ? 'bg-[#2f190f] text-white' : 'bg-[#fff7f0] text-[#946d58]'
                  }`}
                >
                  {slot}
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-[1rem] bg-[#fff2e4] px-3 py-3 text-sm font-semibold text-[#7c4528]">
              Confirmer la reservation
            </div>
          </FloatCard>
        </div>

        <MiniTabBar active="Salons" />
      </div>
    </ScreenShell>
  )
}

function BoutiquePhone() {
  return (
    <ScreenShell>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,211,164,0.42),transparent_24%),linear-gradient(180deg,#fffdf9_0%,#fff3e8_100%)]" />
      <div className="relative flex h-full flex-col px-5 pb-5 pt-11">
        <AppHeader title="Boutique" subtitle="Acheter ses essentiels" icon={ShoppingBag} />

        <div className="mt-4 space-y-3">
          {[
            ['Hair Oil', '9 500 FCFA'],
            ['Glow Mask', '12 000 FCFA'],
          ].map(([name, price], index) => (
            <FloatCard key={name} className="rounded-[1.4rem] border border-[#efd7c4] bg-white p-4" delay={0.06 + index * 0.08}>
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-[1rem] bg-[linear-gradient(135deg,#ffe0bb_0%,#f4a06e_100%)]" />
                <div className="flex-1">
                  <div className="text-sm font-bold text-[#2f190f]">{name}</div>
                  <div className="mt-1 text-xs text-[#8a6552]">Article premium . disponible</div>
                </div>
                <div className="text-xs font-semibold text-[#a05534]">{price}</div>
              </div>
            </FloatCard>
          ))}
        </div>

        <FloatCard className="mt-4 rounded-[1.45rem] border border-[#efd7c4] bg-white p-4" delay={0.18}>
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-[#2f190f]">Panier client</div>
            <div className="rounded-full bg-[#fff1df] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#b15e39]">
              2 articles
            </div>
          </div>
          <div className="mt-3 space-y-2 text-sm text-[#785544]">
            <div className="flex items-center justify-between">
              <span>Hair Oil</span>
              <span>9 500</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Glow Mask</span>
              <span>12 000</span>
            </div>
            <div className="flex items-center justify-between border-t border-[#f1dfd0] pt-3 font-bold text-[#2f190f]">
              <span>Total</span>
              <span>21 500 FCFA</span>
            </div>
          </div>
        </FloatCard>

        <MiniTabBar active="Boutique" />
      </div>
    </ScreenShell>
  )
}

function BenefitsPhone() {
  const items = [
    ['Favoris', Heart],
    ['Historique', CalendarDays],
    ['Rappels', BellRing],
    ['Confiance', ShieldCheck],
  ]

  return (
    <ScreenShell>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,216,169,0.42),transparent_22%),linear-gradient(180deg,#fffdf9_0%,#fff4ea_100%)]" />
      <div className="relative flex h-full flex-col px-5 pb-5 pt-11">
        <AppHeader title="Avantages client" subtitle="Tout retrouver plus vite" icon={Heart} />

        <div className="mt-5 grid grid-cols-2 gap-3">
          {items.map(([label, Icon], index) => (
            <FloatCard key={label} className="rounded-[1.35rem] border border-[#efd7c4] bg-white p-4" delay={0.06 + index * 0.07}>
              <Icon className="h-5 w-5 text-[#bf663f]" />
              <div className="mt-3 text-sm font-bold text-[#2f190f]">{label}</div>
              <div className="mt-1 text-xs leading-5 text-[#8a6653]">
                {label === 'Favoris' && 'Retrouver rapidement ses salons et articles preferes.'}
                {label === 'Historique' && 'Voir ses reservations et ses achats au meme endroit.'}
                {label === 'Rappels' && 'Recevoir des notifications utiles avant chaque rendez vous.'}
                {label === 'Confiance' && 'Profiter d un parcours rassurant jusqu a la validation.'}
              </div>
            </FloatCard>
          ))}
        </div>

        <FloatCard className="mt-auto rounded-[1.45rem] border border-[#efd7c4] bg-[#fff3e3] p-4" delay={0.22}>
          <div className="text-[10px] uppercase tracking-[0.22em] text-[#ab7c62]">Valeur client</div>
          <div className="mt-2 text-sm font-semibold leading-6 text-[#3a2115]">
            Plus le client revient sur Jolof'Era, plus le service devient pratique et naturel.
          </div>
        </FloatCard>
      </div>
    </ScreenShell>
  )
}

function OutroPhone() {
  return (
    <ScreenShell>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,205,152,0.44),transparent_24%),linear-gradient(180deg,#fffaf5_0%,#fff1e4_100%)]" />
      <div className="relative flex h-full flex-col items-center justify-between px-5 pb-7 pt-16 text-center">
        <FloatCard className="rounded-full border border-[#efd7c4] bg-white px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#a16445]">
          Jolof'Era social reel
        </FloatCard>

        <div>
          <motion.div
            className="mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] bg-[#2f190f] text-4xl font-black text-white shadow-[0_20px_40px_rgba(111,60,34,0.24)]"
            animate={{ y: [0, -8, 0], rotate: [0, -2, 0, 2, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          >
            J
          </motion.div>
          <div className="mt-6 text-[1.85rem] font-black leading-[1.02] tracking-[-0.05em] text-[#2f190f]">
            Jolof'Era.
            <br />
            Reserve.
            <br />
            Shoppe.
            <br />
            Reviens.
          </div>
          <div className="mt-4 text-sm leading-6 text-[#7f5d4b]">
            Une demo plus complete, plus claire et plus vivante pour montrer le parcours client.
          </div>
        </div>

        <div className="w-full space-y-3">
          <FloatCard className="rounded-[1.35rem] bg-[#2f190f] px-4 py-3 text-sm font-bold text-white" delay={0.12}>
            Pret pour une base de campagne reseaux sociaux
          </FloatCard>
          <div className="grid grid-cols-3 gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8d6653]">
            <div className="rounded-full border border-[#efd7c4] bg-white px-3 py-2">9:16</div>
            <div className="rounded-full border border-[#efd7c4] bg-white px-3 py-2">Jolof'Era</div>
            <div className="rounded-full border border-[#efd7c4] bg-white px-3 py-2">40 sec</div>
          </div>
        </div>
      </div>
    </ScreenShell>
  )
}

function ScenePhone({ sceneId }) {
  switch (sceneId) {
    case 'intro':
      return <IntroPhone />
    case 'home':
      return <HomePhone />
    case 'signup':
      return <SignupPhone />
    case 'login':
      return <LoginPhone />
    case 'salons':
      return <SalonsPhone />
    case 'boutique':
      return <BoutiquePhone />
    case 'benefits':
      return <BenefitsPhone />
    case 'outro':
      return <OutroPhone />
    default:
      return <IntroPhone />
  }
}

function SceneOverlay({ scene, sceneIndex }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={scene.id}
        className="absolute inset-0"
        variants={sceneCardTransition}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <div className="absolute inset-0" style={{ background: scene.palette.background }} />

        <div className="absolute left-0 right-0 top-0 flex items-center justify-between px-5 pt-5 sm:px-7">
          <div
            className="client-social-demo__badge rounded-full border border-[#edd6c4] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9d6e55]"
            style={{ background: scene.palette.chip }}
          >
            {scene.label}
          </div>
          <div className="client-social-demo__badge rounded-full border border-[#edd6c4] bg-white/86 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9d6e55]">
            Scene {scene.step}/08
          </div>
        </div>

        <div className="relative z-[1] flex h-full flex-col px-5 pb-6 pt-20 sm:px-7 sm:pb-7 sm:pt-24">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-[18.5rem]"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.26em]" style={{ color: scene.palette.accent }}>
              Jolof'Era client experience
            </div>
            <h1 className="mt-3 text-[1.95rem] font-black leading-[0.98] tracking-[-0.06em] text-[#2f190f] sm:text-[2.25rem]">
              {scene.title}
            </h1>
            <p className="mt-4 text-sm leading-6 text-[#7b5a48]">{scene.description}</p>
          </motion.div>

          <div className="relative mt-6 flex-1">
            <div className="client-social-demo__screen-glow" style={{ background: `radial-gradient(circle, ${scene.palette.glow}, transparent 54%)` }} />

            <div className="absolute left-0 right-0 top-0 z-[1] flex items-center justify-between gap-3">
              <FloatCard className="max-w-[8.8rem] rounded-[1.3rem] border border-[#edd7c5] bg-white/88 p-3 shadow-[0_16px_35px_rgba(196,126,85,0.12)]">
                <div className="text-[10px] uppercase tracking-[0.22em] text-[#aa7a61]">Promesse</div>
                <div className="mt-2 text-xs font-semibold leading-5 text-[#382014]">{scene.callout}</div>
              </FloatCard>

              <FloatCard className="rounded-[1.3rem] border border-[#edd7c5] bg-white/88 px-3 py-3 text-right shadow-[0_16px_35px_rgba(196,126,85,0.12)]" delay={0.08}>
                <div className="text-[10px] uppercase tracking-[0.22em] text-[#aa7a61]">Vibe</div>
                <div className="mt-2 text-sm font-semibold text-[#382014]">Bright premium ad</div>
              </FloatCard>
            </div>

            <div className="absolute inset-x-0 top-24 z-[1] mx-auto h-[25.8rem] w-full max-w-[20.2rem] sm:h-[31rem] sm:max-w-[22rem]">
              <AnimatePresence mode="wait">
                <ScenePhone key={scene.id} sceneId={scene.id} />
              </AnimatePresence>
            </div>

            <div className="absolute bottom-0 left-0 right-0 z-[1]">
              <motion.div
                className="rounded-[1.7rem] border border-[#edd6c4] bg-white/90 p-4 shadow-[0_20px_45px_rgba(196,126,85,0.12)]"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#a77960]">Pourquoi ca marche mieux</div>
                  <div className="rounded-full bg-[#fff3e2] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#b0613f]">
                    Reel cut #{sceneIndex + 1}
                  </div>
                </div>
                <div className="grid gap-2.5">
                  {scene.bullets.map((bullet) => (
                    <div key={bullet} className="flex items-center gap-3 rounded-[1rem] border border-[#f1dfd0] bg-[#fff9f3] px-3 py-3">
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                        style={{ background: scene.palette.accent }}
                      >
                        0{sceneIndex + 1}
                      </span>
                      <span className="text-sm font-medium text-[#553627]">{bullet}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

function ClientSocialDemo() {
  const [elapsed, setElapsed] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const animationFrameRef = useRef(null)
  const lastTimestampRef = useRef(null)

  const { index: sceneIndex, scene } = useMemo(() => getSceneState(elapsed), [elapsed])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  useEffect(() => {
    if (!isPlaying) {
      lastTimestampRef.current = null
      return undefined
    }

    const tick = (timestamp) => {
      if (lastTimestampRef.current == null) {
        lastTimestampRef.current = timestamp
      }

      const delta = (timestamp - lastTimestampRef.current) / 1000
      lastTimestampRef.current = timestamp

      setElapsed((current) => Math.min(DEMO_DURATION, current + delta))
      animationFrameRef.current = window.requestAnimationFrame(tick)
    }

    animationFrameRef.current = window.requestAnimationFrame(tick)

    return () => {
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isPlaying])

  useEffect(() => {
    if (elapsed >= DEMO_DURATION && isPlaying) {
      setIsPlaying(false)
    }
  }, [elapsed, isPlaying])

  useEffect(
    () => () => {
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current)
      }
    },
    [],
  )

  const progressPercent = Math.min(100, (elapsed / DEMO_DURATION) * 100)

  const restartDemo = () => {
    lastTimestampRef.current = null
    setElapsed(0)
    setIsPlaying(true)
  }

  return (
    <section className="client-social-demo flex items-center justify-center px-4 py-5 text-[#2f190f] sm:px-6 sm:py-6">
      <div className="client-social-demo__orbit client-social-demo__orbit--one" />
      <div className="client-social-demo__orbit client-social-demo__orbit--two" />

      <div className="relative z-[1] flex w-full max-w-6xl flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl lg:pr-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#efd8c4] bg-white/90 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.26em] text-[#9d6e55] backdrop-blur-xl">
            <Sparkles className="h-3.5 w-3.5 text-[#c56339]" />
            Demo client premium Jolof'Era
          </div>

          <h2 className="mt-4 max-w-lg text-4xl font-black leading-[0.95] tracking-[-0.07em] text-[#2f190f] sm:text-5xl">
            Une demo plus claire, plus animee et plus lumineuse.
          </h2>

          <p className="mt-4 max-w-lg text-sm leading-7 text-[#775847] sm:text-base">
            Cette version montre vraiment l accueil, les pages salons, la boutique, l inscription, la connexion
            et les avantages client, avec une mise en scene premium plus vivante.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPlaying((current) => !current)}
              className="inline-flex items-center gap-2 rounded-full bg-[#2f190f] px-5 py-3 text-sm font-semibold text-white transition hover:translate-y-[-1px] hover:bg-[#462518]"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isPlaying ? 'Pause la demo' : 'Lancer la demo'}
            </button>
            <button
              type="button"
              onClick={restartDemo}
              className="inline-flex items-center gap-2 rounded-full border border-[#efd8c4] bg-white/88 px-5 py-3 text-sm font-semibold text-[#3d2216] transition hover:translate-y-[-1px] hover:bg-white"
            >
              <ArrowRight className="h-4 w-4" />
              Rejouer 40s
            </button>
          </div>

          <div className="mt-6 max-w-md rounded-[1.6rem] border border-[#efd8c4] bg-white/90 p-4 shadow-[0_20px_45px_rgba(196,126,85,0.12)] backdrop-blur-xl">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.24em] text-[#a77960]">
              <span>Progression</span>
              <span>
                {formatTime(elapsed)} / {formatTime(DEMO_DURATION)}
              </span>
            </div>
            <div className="client-social-demo__progress mt-3 h-2 rounded-full">
              <span style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="mt-3 text-sm text-[#6f5242]">
              Scene en cours: <span className="font-semibold text-[#3a2115]">{scene.label}</span>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[28rem] lg:mx-0 lg:max-w-[31rem]">
          <div className="client-social-demo__stage aspect-[9/16] w-full rounded-[2.5rem] p-3 sm:rounded-[2.75rem] sm:p-4">
            <div className="client-social-demo__noise" />
            <SceneOverlay scene={scene} sceneIndex={sceneIndex} />
          </div>
        </div>
      </div>
    </section>
  )
}

export default ClientSocialDemo
