// ============================================
// DONNÉES DE PRODUCTION - FLASHRV'
// Prêt pour connexion API Backend Node.js
// ============================================

// Images de salons et coiffure afro (personnes noires/sénégalaises)
const salonImages = {
  // Salons de coiffure afro
  elegance: "https://cdn0.mariages.net/vendor/0452/3_2/960/jpg/320376-117030248442065-1955405434-n1_3_110452.jpeg",
  beautyQueen: "https://www.unboncoiffeur.fr/cache/media/thumb_news_l/files/images/coiffeurs/photos/owners/2021/06/60c33b1d507455.91114078-coiffure-sup-hair-joue-les-tours.jpg",
  locksStyle: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=800",
  glamour: "https://images.unsplash.com/photo-1595959183082-7b570b7e1dab?w=800",
  naturelBeau: "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800",
  salonModerne: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800",
  africanBeauty: "https://images.unsplash.com/photo-1516914589923-f105f1535f88?w=800",
  coiffureAfro: "https://images.unsplash.com/photo-1596728325488-58c87691e9af?w=800",
  tressesAfro: "https://images.unsplash.com/photo-1595959183082-7b570b7e1dab?w=800",
  
  // Studios de shooting photo - Images professionnelles
  shootingStudio1: "https://www.alioze.com/wp-content/uploads/2020/07/agence-photographe-1536x864.jpg",
  shootingStudio2: "https://tse3.mm.bing.net/th/id/OIP.1K9YuaVB7KNFX56_oMAf9gHaEc?rs=1&pid=ImgDetMain",
  shootingStudio3: "https://th.bing.com/th/id/OIP.EmQuPvpuOeWFFbzT4pT65wAAAA?w=286&h=180",
  shootingStudio4: "https://tse4.mm.bing.net/th/id/OIP.lUQXMV4WBT49ifk_FmfU7gHaE7?rs=1&pid=ImgDetMain",
  shootingPortrait: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800",
  // Shooting photos femmes africaines
  shootingAfro1: "https://images.unsplash.com/photo-1523264653568-d3d4032d1476?w=800",
  shootingAfro2: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800",
  shootingAfro3: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800",
  shootingAfro4: "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=800",
  shootingAfro5: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800",
  studioLight: "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800",
  studioSetup: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=800",
  
  // Barbershops - Salons pour hommes
  barber1: "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/1b/a3/b4/7c/coin-coiffure.jpg?w=1200&h=1200&s=1",
  barber2: "https://cdn1.treatwell.net/images/view/v2.i9659787.w1080.h720.xE325B138/",
  barberAfro1: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800",
  barberAfro2: "https://images.unsplash.com/photo-1521490683712-35a1cb235d1c?w=800",
  barberAfro3: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=800"
}

// Images des coiffeurs/coiffeuses (personnes noires africaines)
const staffImages = {
  aminata: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150",
  fatou: "https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=150",
  mariama: "https://images.unsplash.com/photo-1596728325488-58c87691e9af?w=150",
  awa: "https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=150",
  khady: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150",
  ibrahima: "https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=150",
  ousmane: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
  aissatou: "https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=150",
  ndeyeFatou: "https://images.unsplash.com/photo-1596728325488-58c87691e9af?w=150",
  rokhaya: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150",
  bineta: "https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=150",
  coumba: "https://images.unsplash.com/photo-1596728325488-58c87691e9af?w=150",
}

// Image fallback
export const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800"
export const FALLBACK_AVATAR = "https://ui-avatars.com/api/?background=8B5CF6&color=fff&name="

// Salons avec données réalistes
export const salons = [
  {
    id: 1,
    name: "Élégance Africaine",
    slug: "elegance-africaine",
    salonType: "coiffure", // coiffure, beaute, mixte
    description: "Salon de coiffure afro premium spécialisé dans les tresses, tissages et soins capillaires naturels. Notre équipe de 5 experts vous accueille dans un cadre luxueux et moderne au cœur du Plateau.",
    shortDescription: "Tresses, tissages et soins naturels haut de gamme",
    address: "123 Rue Félix Faure, Plateau",
    city: "Dakar",
    neighborhood: "Plateau",
    phone: "+221 77 123 45 67",
    whatsapp: "+221771234567",
    email: "contact@elegance-africaine.sn",
    rating: 4.9,
    reviewCount: 0,
    priceRange: "Premium",
    minPrice: 5000,
    maxPrice: 80000,
    depositPercentage: 30,
    cancellationPolicy: "Annulation gratuite jusqu'à 24h avant. Après: acompte non remboursable.",
    noShowPolicy: "En cas de non-présentation, l'acompte est conservé et votre score de fiabilité est impacté.",
    images: [salonImages.elegance, salonImages.africanBeauty, salonImages.coiffureAfro],
    coverImage: salonImages.elegance,
    openingHours: {
      monday: { open: "09:00", close: "19:00" },
      tuesday: { open: "09:00", close: "19:00" },
      wednesday: { open: "09:00", close: "19:00" },
      thursday: { open: "09:00", close: "20:00" },
      friday: { open: "09:00", close: "20:00" },
      saturday: { open: "08:00", close: "18:00" },
      sunday: null
    },
    amenities: ["wifi", "parking", "climatisation", "café", "cartes acceptées", "wave", "orange money"],
    specialties: ["Tresses africaines", "Tissages", "Locks", "Soins naturels"],
    coordinates: { lat: 14.6937, lng: -17.4441 },
    verified: true,
    featured: true,
    acceptsOnlinePayment: true,
    loyaltyProgram: true
  },
  {
    id: 2,
    name: "Beauty Queen Institute",
    slug: "beauty-queen",
    salonType: "beaute", // institut de beauté
    description: "Institut de beauté complet offrant coiffure, maquillage professionnel, manucure et soins du visage. L'adresse incontournable des femmes exigeantes à Dakar depuis 2018.",
    shortDescription: "Institut beauté complet - Coiffure, maquillage, ongles",
    address: "45 Avenue Bourguiba, Mermoz",
    city: "Dakar",
    neighborhood: "Mermoz",
    phone: "+221 78 234 56 78",
    whatsapp: "+221782345678",
    email: "info@beautyqueen.sn",
    rating: 4.7,
    reviewCount: 0,
    priceRange: "Moyen",
    minPrice: 3000,
    maxPrice: 50000,
    depositPercentage: 25,
    cancellationPolicy: "Annulation gratuite jusqu'à 12h avant. Après: 50% de l'acompte retenu.",
    noShowPolicy: "Après 2 no-shows, votre compte sera suspendu temporairement.",
    images: [salonImages.beautyQueen, salonImages.glamour, salonImages.salonModerne],
    coverImage: salonImages.beautyQueen,
    openingHours: {
      monday: { open: "08:00", close: "18:00" },
      tuesday: { open: "08:00", close: "18:00" },
      wednesday: { open: "08:00", close: "18:00" },
      thursday: { open: "08:00", close: "18:00" },
      friday: { open: "08:00", close: "18:00" },
      saturday: { open: "09:00", close: "17:00" },
      sunday: null
    },
    amenities: ["wifi", "climatisation", "cartes acceptées", "wave"],
    specialties: ["Maquillage", "Manucure", "Soins visage", "Coiffure"],
    coordinates: { lat: 14.7067, lng: -17.4677 },
    verified: true,
    featured: true,
    acceptsOnlinePayment: true,
    loyaltyProgram: true
  },
  {
    id: 3,
    name: "Locks & Style Studio",
    slug: "locks-style",
    salonType: "coiffure", // spécialiste locks
    description: "Spécialistes des locks et coiffures naturelles depuis 2015. Nous sublimions vos cheveux avec des techniques ancestrales revisitées.",
    shortDescription: "Experts locks, twists et coiffures naturelles",
    address: "78 Rue 10, Médina",
    city: "Dakar",
    neighborhood: "Médina",
    phone: "+221 76 345 67 89",
    whatsapp: "+221763456789",
    email: "hello@locksstyle.sn",
    rating: 4.8,
    reviewCount: 0,
    priceRange: "Moyen",
    minPrice: 8000,
    maxPrice: 35000,
    depositPercentage: 20,
    cancellationPolicy: "Annulation gratuite jusqu'à 24h avant.",
    noShowPolicy: "Acompte non remboursable en cas de non-présentation.",
    images: [salonImages.locksStyle, salonImages.coiffureAfro, salonImages.naturelBeau],
    coverImage: salonImages.locksStyle,
    openingHours: {
      monday: { open: "09:00", close: "18:00" },
      tuesday: { open: "09:00", close: "18:00" },
      wednesday: { open: "09:00", close: "18:00" },
      thursday: { open: "09:00", close: "18:00" },
      friday: { open: "09:00", close: "18:00" },
      saturday: { open: "09:00", close: "16:00" },
      sunday: null
    },
    amenities: ["wifi", "climatisation", "orange money"],
    specialties: ["Locks", "Twists", "Coiffures naturelles", "Freeform"],
    coordinates: { lat: 14.6847, lng: -17.4400 },
    verified: true,
    featured: false,
    acceptsOnlinePayment: true,
    loyaltyProgram: false
  },
  {
    id: 4,
    name: "Glamour Studio Dakar",
    slug: "glamour-studio",
    salonType: "mixte", // coiffure + beauté
    description: "Studio de beauté moderne pour les femmes exigeantes. Spécialistes des événements: mariages, soirées, cérémonies. Forfaits VIP disponibles avec service à domicile.",
    shortDescription: "Coiffure événementielle & maquillage mariée",
    address: "12 Avenue Cheikh Anta Diop, Point E",
    city: "Dakar",
    neighborhood: "Point E",
    phone: "+221 77 456 78 90",
    whatsapp: "+221774567890",
    email: "glamour@studio.sn",
    rating: 4.9,
    reviewCount: 0,
    priceRange: "Premium",
    minPrice: 15000,
    maxPrice: 150000,
    depositPercentage: 50,
    cancellationPolicy: "Mariages: 50% acompte non remboursable. Autres: annulation 48h avant.",
    noShowPolicy: "Acompte intégralement conservé.",
    images: [salonImages.glamour, salonImages.elegance, salonImages.beautyQueen],
    coverImage: salonImages.glamour,
    openingHours: {
      monday: { open: "10:00", close: "19:00" },
      tuesday: { open: "10:00", close: "19:00" },
      wednesday: { open: "10:00", close: "19:00" },
      thursday: { open: "10:00", close: "20:00" },
      friday: { open: "10:00", close: "20:00" },
      saturday: { open: "09:00", close: "18:00" },
      sunday: { open: "10:00", close: "14:00" }
    },
    amenities: ["wifi", "parking", "climatisation", "café", "cartes acceptées", "spa", "wave", "orange money"],
    specialties: ["Coiffure événementielle", "Maquillage mariée", "Soins spa", "Service VIP"],
    coordinates: { lat: 14.6950, lng: -17.4600 },
    verified: true,
    featured: true,
    acceptsOnlinePayment: true,
    loyaltyProgram: true
  },
  {
    id: 5,
    name: "Naturel & Beau",
    slug: "naturel-beau",
    salonType: "coiffure", // soins capillaires naturels
    description: "Votre salon dédié aux soins capillaires naturels et bio. Produits 100% naturels pour des cheveux en pleine santé.",
    shortDescription: "Soins naturels & produits bio pour cheveux",
    address: "56 Rue Carnot, Grand Dakar",
    city: "Dakar",
    neighborhood: "Grand Dakar",
    phone: "+221 78 567 89 01",
    whatsapp: "+221785678901",
    email: "contact@naturelbeau.sn",
    rating: 4.6,
    reviewCount: 0,
    priceRange: "Économique",
    minPrice: 3000,
    maxPrice: 20000,
    depositPercentage: 20,
    cancellationPolicy: "Annulation gratuite jusqu'à 6h avant.",
    noShowPolicy: "Premier no-show: avertissement. Deuxième: suspension 1 mois.",
    images: [salonImages.naturelBeau, salonImages.coiffureAfro, salonImages.africanBeauty],
    coverImage: salonImages.naturelBeau,
    openingHours: {
      monday: { open: "08:00", close: "17:00" },
      tuesday: { open: "08:00", close: "17:00" },
      wednesday: { open: "08:00", close: "17:00" },
      thursday: { open: "08:00", close: "17:00" },
      friday: { open: "08:00", close: "17:00" },
      saturday: { open: "08:00", close: "15:00" },
      sunday: null
    },
    amenities: ["wifi", "orange money"],
    specialties: ["Soins naturels", "Produits bio", "Henné", "Conseil capillaire"],
    coordinates: { lat: 14.6800, lng: -17.4350 },
    verified: true,
    featured: false,
    acceptsOnlinePayment: true,
    loyaltyProgram: false
  },
  {
    id: 6,
    name: "Afro Chic Almadies",
    slug: "afro-chic",
    salonType: "coiffure", // coiffure afro moderne
    description: "Le salon tendance des Almadies. Spécialisé dans les coiffures afro modernes, box braids, cornrows et styles contemporains.",
    shortDescription: "Coiffures afro modernes & styles tendance",
    address: "Route des Almadies, près de Sea Plaza",
    city: "Dakar",
    neighborhood: "Almadies",
    phone: "+221 77 888 99 00",
    whatsapp: "+221778889900",
    email: "hello@afrochic.sn",
    rating: 4.8,
    reviewCount: 0,
    priceRange: "Premium",
    minPrice: 10000,
    maxPrice: 75000,
    depositPercentage: 30,
    cancellationPolicy: "Annulation gratuite jusqu'à 24h avant.",
    noShowPolicy: "Acompte non remboursable + impact sur score de fiabilité.",
    images: [salonImages.salonModerne, salonImages.elegance, salonImages.locksStyle],
    coverImage: salonImages.salonModerne,
    openingHours: {
      monday: { open: "10:00", close: "20:00" },
      tuesday: { open: "10:00", close: "20:00" },
      wednesday: { open: "10:00", close: "20:00" },
      thursday: { open: "10:00", close: "21:00" },
      friday: { open: "10:00", close: "21:00" },
      saturday: { open: "09:00", close: "20:00" },
      sunday: { open: "12:00", close: "18:00" }
    },
    amenities: ["wifi", "parking", "climatisation", "café", "cartes acceptées", "wave", "orange money"],
    specialties: ["Box braids", "Cornrows", "Tissages", "Styles tendance"],
    coordinates: { lat: 14.7450, lng: -17.5200 },
    verified: true,
    featured: true,
    acceptsOnlinePayment: true,
    loyaltyProgram: true
  },
  {
    id: 7,
    name: "Dakar Photo Studio",
    slug: "dakar-photo-studio",
    type: "shooting",
    description: "Studio photo professionnel spécialisé dans les portraits, shootings mode et événements. Équipement haut de gamme et photographes expérimentés pour capturer vos plus beaux moments.",
    shortDescription: "Studio photo professionnel - Portraits & Mode",
    address: "25 Rue Amadou Assane Ndoye, Plateau",
    city: "Dakar",
    neighborhood: "Plateau",
    phone: "+221 77 999 88 77",
    whatsapp: "+221779998877",
    email: "contact@dakarphoto.sn",
    rating: 4.9,
    reviewCount: 0,
    priceRange: "Premium",
    minPrice: 25000,
    maxPrice: 200000,
    depositPercentage: 50,
    cancellationPolicy: "Annulation gratuite jusqu'à 48h avant. Après: 50% de l'acompte retenu.",
    noShowPolicy: "Acompte intégralement conservé en cas de non-présentation.",
    images: [salonImages.shootingStudio1, salonImages.shootingStudio2, salonImages.shootingStudio3],
    coverImage: salonImages.shootingStudio1,
    openingHours: {
      monday: { open: "09:00", close: "18:00" },
      tuesday: { open: "09:00", close: "18:00" },
      wednesday: { open: "09:00", close: "18:00" },
      thursday: { open: "09:00", close: "18:00" },
      friday: { open: "09:00", close: "18:00" },
      saturday: { open: "10:00", close: "17:00" },
      sunday: null
    },
    amenities: ["wifi", "parking", "climatisation", "vestiaire", "maquillage inclus", "cartes acceptées", "wave", "orange money"],
    specialties: ["Portrait", "Mode", "Mariage", "Événements", "Book photo"],
    coordinates: { lat: 14.6920, lng: -17.4450 },
    verified: true,
    featured: true,
    acceptsOnlinePayment: true,
    loyaltyProgram: true
  },
  {
    id: 8,
    name: "Flash Studio Almadies",
    slug: "flash-studio-almadies",
    type: "shooting",
    description: "Studio photo haut de gamme aux Almadies. Spécialisé dans les shootings mode, portraits artistiques et photos de mariage. Équipement professionnel Profoto et photographes primés.",
    shortDescription: "Studio photo premium - Mode & Portraits artistiques",
    address: "15 Route des Almadies, près de Terrou-Bi",
    city: "Dakar",
    neighborhood: "Almadies",
    phone: "+221 77 555 44 33",
    whatsapp: "+221775554433",
    email: "contact@flashstudio.sn",
    rating: 4.8,
    reviewCount: 0,
    priceRange: "Premium",
    minPrice: 30000,
    maxPrice: 250000,
    depositPercentage: 50,
    cancellationPolicy: "Annulation gratuite jusqu'à 72h avant. Après: 30% de l'acompte retenu.",
    noShowPolicy: "Acompte intégralement conservé en cas de non-présentation.",
    images: [salonImages.shootingStudio4, salonImages.studioLight, salonImages.shootingAfro2],
    coverImage: salonImages.shootingStudio4,
    openingHours: {
      monday: { open: "10:00", close: "19:00" },
      tuesday: { open: "10:00", close: "19:00" },
      wednesday: { open: "10:00", close: "19:00" },
      thursday: { open: "10:00", close: "19:00" },
      friday: { open: "10:00", close: "19:00" },
      saturday: { open: "09:00", close: "18:00" },
      sunday: { open: "10:00", close: "16:00" }
    },
    amenities: ["wifi", "parking", "climatisation", "vestiaire", "maquillage inclus", "studio extérieur", "cartes acceptées", "wave", "orange money"],
    specialties: ["Mode", "Portrait artistique", "Mariage", "Grossesse", "Famille"],
    coordinates: { lat: 14.7480, lng: -17.5100 },
    verified: true,
    featured: true,
    acceptsOnlinePayment: true,
    loyaltyProgram: true
  },
  {
    id: 9,
    name: "Sénégal Portraits",
    slug: "senegal-portraits",
    type: "shooting",
    description: "Studio photo intimiste spécialisé dans les portraits personnels et professionnels. Ambiance chaleureuse et équipe 100% féminine pour vous mettre à l'aise.",
    shortDescription: "Portraits personnels & professionnels",
    address: "88 Rue Amadou Hampâté Bâ, Mermoz",
    city: "Dakar",
    neighborhood: "Mermoz",
    phone: "+221 78 666 77 88",
    whatsapp: "+221786667788",
    email: "hello@senegalportraits.sn",
    rating: 4.7,
    reviewCount: 0,
    priceRange: "Moyen",
    minPrice: 15000,
    maxPrice: 100000,
    depositPercentage: 40,
    cancellationPolicy: "Annulation gratuite jusqu'à 24h avant.",
    noShowPolicy: "Premier no-show: avertissement. Deuxième: acompte retenu.",
    images: [salonImages.shootingStudio3, salonImages.shootingAfro4, salonImages.studioSetup],
    coverImage: salonImages.shootingStudio3,
    openingHours: {
      monday: { open: "09:00", close: "18:00" },
      tuesday: { open: "09:00", close: "18:00" },
      wednesday: { open: "09:00", close: "18:00" },
      thursday: { open: "09:00", close: "18:00" },
      friday: { open: "09:00", close: "18:00" },
      saturday: { open: "10:00", close: "16:00" },
      sunday: null
    },
    amenities: ["wifi", "climatisation", "vestiaire", "maquillage en option", "wave", "orange money"],
    specialties: ["Portrait CV", "LinkedIn", "Photo identité pro", "Portrait couple", "Portrait famille"],
    coordinates: { lat: 14.7100, lng: -17.4680 },
    verified: true,
    featured: false,
    acceptsOnlinePayment: true,
    loyaltyProgram: false
  },
  {
    id: 10,
    name: "King's Barber Dakar",
    slug: "kings-barber-dakar",
    type: "barber",
    description: "Le barbershop de référence à Dakar pour hommes. Coupes tendances, dégradés parfaits, taille de barbe et soins masculins. Ambiance moderne et décontractée.",
    shortDescription: "Barbershop premium - Coupes & Barbes pour hommes",
    address: "42 Avenue Léopold Sédar Senghor, Plateau",
    city: "Dakar",
    neighborhood: "Plateau",
    phone: "+221 77 111 22 33",
    whatsapp: "+221771112233",
    email: "contact@kingsbarber.sn",
    rating: 4.9,
    reviewCount: 0,
    priceRange: "Moyen",
    minPrice: 3000,
    maxPrice: 25000,
    depositPercentage: 20,
    cancellationPolicy: "Annulation gratuite jusqu'à 2h avant.",
    noShowPolicy: "Après 2 no-shows, compte suspendu 1 mois.",
    images: [salonImages.barber1, salonImages.barberAfro1, salonImages.barberAfro2],
    coverImage: salonImages.barber1,
    openingHours: {
      monday: { open: "08:00", close: "20:00" },
      tuesday: { open: "08:00", close: "20:00" },
      wednesday: { open: "08:00", close: "20:00" },
      thursday: { open: "08:00", close: "20:00" },
      friday: { open: "08:00", close: "21:00" },
      saturday: { open: "08:00", close: "21:00" },
      sunday: { open: "09:00", close: "15:00" }
    },
    amenities: ["wifi", "climatisation", "TV", "café", "wave", "orange money"],
    specialties: ["Dégradé", "Barbe", "Rasage traditionnel", "Coupe afro", "Lineup"],
    coordinates: { lat: 14.6930, lng: -17.4420 },
    verified: true,
    featured: true,
    acceptsOnlinePayment: true,
    loyaltyProgram: true
  },
  {
    id: 11,
    name: "Fresh Cut Almadies",
    slug: "fresh-cut-almadies",
    type: "barber",
    description: "Barbershop moderne aux Almadies. Spécialistes des coupes afro, dégradés américains et entretien barbe. L'adresse des hommes stylés de Dakar.",
    shortDescription: "Barbershop moderne - Dégradés & Styles afro",
    address: "Route des Almadies, face Sea Plaza",
    city: "Dakar",
    neighborhood: "Almadies",
    phone: "+221 78 222 33 44",
    whatsapp: "+221782223344",
    email: "hello@freshcut.sn",
    rating: 4.8,
    reviewCount: 0,
    priceRange: "Premium",
    minPrice: 5000,
    maxPrice: 35000,
    depositPercentage: 25,
    cancellationPolicy: "Annulation gratuite jusqu'à 4h avant.",
    noShowPolicy: "Acompte non remboursable en cas de non-présentation.",
    images: [salonImages.barber2, salonImages.barberAfro3, salonImages.barberAfro1],
    coverImage: salonImages.barber2,
    openingHours: {
      monday: { open: "09:00", close: "20:00" },
      tuesday: { open: "09:00", close: "20:00" },
      wednesday: { open: "09:00", close: "20:00" },
      thursday: { open: "09:00", close: "21:00" },
      friday: { open: "09:00", close: "21:00" },
      saturday: { open: "08:00", close: "21:00" },
      sunday: { open: "10:00", close: "16:00" }
    },
    amenities: ["wifi", "parking", "climatisation", "TV grand écran", "PlayStation", "café", "cartes acceptées", "wave", "orange money"],
    specialties: ["Dégradé américain", "Coupe afro", "Design cheveux", "Barbe sculptée", "Soins visage homme"],
    coordinates: { lat: 14.7440, lng: -17.5180 },
    verified: true,
    featured: true,
    acceptsOnlinePayment: true,
    loyaltyProgram: true
  }
]

// Services par salon avec prix et acompte
export const servicesBySalon = {
  1: [
    { id: 101, name: "Tresses africaines classiques", duration: 180, price: 15000, category: "Tresses", description: "Tresses traditionnelles", popular: true },
    { id: 102, name: "Box braids", duration: 300, price: 35000, category: "Tresses", description: "Box braids small, medium ou large", popular: true },
    { id: 103, name: "Knotless braids", duration: 360, price: 45000, category: "Tresses", description: "Tresses sans nœuds" },
    { id: 104, name: "Tissage complet + mèches", duration: 120, price: 45000, category: "Tissage", description: "Tissage complet, mèches incluses", popular: true },
    { id: 105, name: "Soin protéiné profond", duration: 45, price: 10000, category: "Soins", description: "Traitement réparateur" },
    { id: 106, name: "Coupe + Brushing", duration: 60, price: 8000, category: "Coupe", description: "Coupe tendance" }
  ],
  2: [
    { id: 201, name: "Maquillage jour", duration: 45, price: 8000, category: "Maquillage", popular: true },
    { id: 202, name: "Maquillage soirée", duration: 60, price: 12000, category: "Maquillage" },
    { id: 203, name: "Maquillage mariée", duration: 90, price: 25000, category: "Maquillage", popular: true },
    { id: 204, name: "Manucure semi-permanent", duration: 45, price: 6000, category: "Ongles" },
    { id: 205, name: "Pose gel complète", duration: 90, price: 15000, category: "Ongles", popular: true },
    { id: 206, name: "Soin visage hydratant", duration: 60, price: 10000, category: "Soins visage" }
  ],
  3: [
    { id: 301, name: "Pose de locks (starter)", duration: 180, price: 25000, category: "Locks", popular: true },
    { id: 302, name: "Entretien locks", duration: 90, price: 10000, category: "Locks", popular: true },
    { id: 303, name: "Retwist", duration: 60, price: 8000, category: "Locks" },
    { id: 304, name: "Twists vanille", duration: 180, price: 18000, category: "Twists" },
    { id: 305, name: "Coiffure afro naturelle", duration: 60, price: 8000, category: "Naturel" }
  ],
  4: [
    { id: 401, name: "Coiffure mariée", duration: 120, price: 50000, category: "Événementiel", popular: true },
    { id: 402, name: "Maquillage mariée HD", duration: 90, price: 40000, category: "Événementiel", popular: true },
    { id: 403, name: "Forfait mariée complet", duration: 210, price: 80000, category: "Événementiel", popular: true },
    { id: 404, name: "Coiffure événement", duration: 90, price: 25000, category: "Événementiel" },
    { id: 405, name: "Service VIP à domicile", duration: 240, price: 150000, category: "VIP" }
  ],
  5: [
    { id: 501, name: "Soin henné naturel", duration: 90, price: 8000, category: "Naturel", popular: true },
    { id: 502, name: "Masque naturel DIY", duration: 45, price: 5000, category: "Naturel" },
    { id: 503, name: "Définition boucles", duration: 60, price: 6000, category: "Naturel", popular: true },
    { id: 504, name: "Consultation capillaire", duration: 30, price: 3000, category: "Conseil" }
  ],
  6: [
    { id: 601, name: "Box braids tendance", duration: 300, price: 40000, category: "Tresses", popular: true },
    { id: 602, name: "Cornrows design", duration: 180, price: 25000, category: "Tresses", popular: true },
    { id: 603, name: "Passion twists", duration: 300, price: 45000, category: "Twists" },
    { id: 604, name: "Butterfly locs", duration: 360, price: 55000, category: "Locks" },
    { id: 605, name: "Tissage brésilien premium", duration: 120, price: 60000, category: "Tissage" }
  ],
  7: [
    { id: 701, name: "Portrait individuel", duration: 60, price: 25000, category: "Shooting", description: "Séance portrait en studio", popular: true },
    { id: 702, name: "Shooting mode", duration: 120, price: 50000, category: "Shooting", description: "Séance mode avec changements de tenues", popular: true },
    { id: 703, name: "Book photo complet", duration: 180, price: 75000, category: "Shooting", description: "Book professionnel 20 photos retouchées", popular: true },
    { id: 704, name: "Shooting couple", duration: 90, price: 40000, category: "Shooting", description: "Séance photo en couple" },
    { id: 705, name: "Shooting mariage", duration: 480, price: 200000, category: "Shooting", description: "Couverture complète mariage" },
    { id: 706, name: "Photo CV / LinkedIn", duration: 30, price: 15000, category: "Shooting", description: "Portrait professionnel" }
  ],
  8: [
    { id: 801, name: "Shooting mode éditorial", duration: 180, price: 80000, category: "Shooting", description: "Séance mode haut de gamme avec direction artistique", popular: true },
    { id: 802, name: "Portrait artistique", duration: 90, price: 45000, category: "Shooting", description: "Portrait créatif avec éclairage studio", popular: true },
    { id: 803, name: "Shooting grossesse", duration: 60, price: 35000, category: "Shooting", description: "Séance maternité en studio ou extérieur", popular: true },
    { id: 804, name: "Shooting famille", duration: 90, price: 50000, category: "Shooting", description: "Photos de famille professionnelles" },
    { id: 805, name: "Book mannequin pro", duration: 240, price: 150000, category: "Shooting", description: "Book complet 30 photos + retouches HD" },
    { id: 806, name: "Couverture mariage prestige", duration: 600, price: 250000, category: "Shooting", description: "Mariage complet + album luxe" }
  ],
  9: [
    { id: 901, name: "Photo CV professionnel", duration: 20, price: 15000, category: "Shooting", description: "Portrait corporate fond uni", popular: true },
    { id: 902, name: "Photo LinkedIn premium", duration: 30, price: 20000, category: "Shooting", description: "Portrait professionnel optimisé réseaux", popular: true },
    { id: 903, name: "Portrait personnel", duration: 45, price: 25000, category: "Shooting", description: "Séance portrait décontractée", popular: true },
    { id: 904, name: "Portrait couple", duration: 60, price: 35000, category: "Shooting", description: "Photos de couple en studio" },
    { id: 905, name: "Mini shooting famille", duration: 45, price: 30000, category: "Shooting", description: "Séance courte famille (4 pers. max)" },
    { id: 906, name: "Photo identité haut de gamme", duration: 15, price: 10000, category: "Shooting", description: "Photos d'identité qualité studio" }
  ],
  10: [
    { id: 1001, name: "Coupe classique homme", duration: 30, price: 3000, category: "Coupe", description: "Coupe simple et propre", popular: true },
    { id: 1002, name: "Dégradé américain", duration: 45, price: 5000, category: "Coupe", description: "Fade américain tous styles", popular: true },
    { id: 1003, name: "Dégradé + Design", duration: 60, price: 8000, category: "Coupe", description: "Dégradé avec design personnalisé", popular: true },
    { id: 1004, name: "Taille barbe", duration: 20, price: 2500, category: "Barbe", description: "Taille et mise en forme barbe" },
    { id: 1005, name: "Rasage traditionnel", duration: 30, price: 4000, category: "Barbe", description: "Rasage au blaireau et serviette chaude" },
    { id: 1006, name: "Coupe + Barbe complète", duration: 60, price: 7000, category: "Forfait", description: "Forfait coupe et barbe", popular: true },
    { id: 1007, name: "Lineup / Contours", duration: 15, price: 2000, category: "Coupe", description: "Traçage des contours" },
    { id: 1008, name: "Soin visage homme", duration: 30, price: 5000, category: "Soins", description: "Nettoyage et hydratation" }
  ],
  11: [
    { id: 1101, name: "Dégradé signature", duration: 45, price: 6000, category: "Coupe", description: "Notre dégradé signature", popular: true },
    { id: 1102, name: "Coupe afro homme", duration: 40, price: 5000, category: "Coupe", description: "Coupe spéciale cheveux afro", popular: true },
    { id: 1103, name: "Dégradé + Waves", duration: 60, price: 10000, category: "Coupe", description: "Dégradé avec mise en waves", popular: true },
    { id: 1104, name: "Barbe sculptée", duration: 30, price: 4000, category: "Barbe", description: "Sculpture et taille barbe" },
    { id: 1105, name: "Design cheveux", duration: 45, price: 8000, category: "Coupe", description: "Dessins et motifs personnalisés" },
    { id: 1106, name: "Forfait VIP", duration: 90, price: 15000, category: "Forfait", description: "Coupe + Barbe + Soin + Massage", popular: true },
    { id: 1107, name: "Coloration homme", duration: 60, price: 12000, category: "Coloration", description: "Coloration cheveux ou barbe" },
    { id: 1108, name: "Soin visage premium", duration: 45, price: 8000, category: "Soins", description: "Soin complet visage homme" }
  ]
}

// Coiffeurs et photographes par salon
export const coiffeursBySalon = {
  1: [
    { id: 1, name: "Aminata Sow", specialty: "Tresses & Tissages", rating: 4.9, image: staffImages.aminata, experience: "8 ans", available: true },
    { id: 2, name: "Fatou Ndiaye", specialty: "Soins capillaires", rating: 4.8, image: staffImages.fatou, experience: "5 ans", available: true },
    { id: 3, name: "Mariama Diallo", specialty: "Coloration", rating: 4.7, image: staffImages.mariama, experience: "6 ans", available: true }
  ],
  2: [
    { id: 4, name: "Awa Fall", specialty: "Maquillage", rating: 4.9, image: staffImages.awa, experience: "7 ans", available: true },
    { id: 5, name: "Khady Gueye", specialty: "Manucure", rating: 4.6, image: staffImages.khady, experience: "4 ans", available: true }
  ],
  3: [
    { id: 6, name: "Ibrahima Ba", specialty: "Locks", rating: 4.9, image: staffImages.ibrahima, experience: "10 ans", available: true },
    { id: 7, name: "Ousmane Diop", specialty: "Twists", rating: 4.8, image: staffImages.ousmane, experience: "6 ans", available: true }
  ],
  4: [
    { id: 8, name: "Aïssatou Sarr", specialty: "Coiffure événementielle", rating: 5.0, image: staffImages.aissatou, experience: "12 ans", available: true },
    { id: 9, name: "Ndèye Fatou Sy", specialty: "Maquillage mariée", rating: 4.9, image: staffImages.ndeyeFatou, experience: "9 ans", available: true }
  ],
  5: [
    { id: 10, name: "Rokhaya Mbaye", specialty: "Soins naturels", rating: 4.7, image: staffImages.rokhaya, experience: "5 ans", available: true }
  ],
  6: [
    { id: 11, name: "Bineta Diaw", specialty: "Box braids", rating: 4.9, image: staffImages.bineta, experience: "7 ans", available: true },
    { id: 12, name: "Coumba Faye", specialty: "Tissages premium", rating: 4.8, image: staffImages.coumba, experience: "8 ans", available: true }
  ],
  7: [
    { id: 13, name: "Moussa Niang", specialty: "Photographe portrait", rating: 5.0, image: staffImages.ousmane, experience: "10 ans", available: true },
    { id: 14, name: "Adama Diop", specialty: "Photographe mode", rating: 4.9, image: staffImages.ibrahima, experience: "8 ans", available: true }
  ],
  8: [
    { id: 15, name: "Cheikh Mbaye", specialty: "Photographe mode", rating: 5.0, image: staffImages.ibrahima, experience: "12 ans", available: true },
    { id: 16, name: "Souleymane Faye", specialty: "Photographe mariage", rating: 4.9, image: staffImages.ousmane, experience: "9 ans", available: true },
    { id: 17, name: "Pape Diallo", specialty: "Retoucheur photo", rating: 4.8, image: staffImages.ibrahima, experience: "6 ans", available: true }
  ],
  9: [
    { id: 18, name: "Aïda Thiam", specialty: "Photographe portrait", rating: 4.9, image: staffImages.aminata, experience: "7 ans", available: true },
    { id: 19, name: "Fatou Seck", specialty: "Photographe corporate", rating: 4.7, image: staffImages.fatou, experience: "5 ans", available: true }
  ],
  10: [
    { id: 20, name: "Mamadou Diallo", specialty: "Dégradés & Coupes", rating: 4.9, image: staffImages.ibrahima, experience: "8 ans", available: true },
    { id: 21, name: "Abdoulaye Seck", specialty: "Barbe & Rasage", rating: 4.8, image: staffImages.ousmane, experience: "6 ans", available: true },
    { id: 22, name: "Modou Fall", specialty: "Design cheveux", rating: 4.7, image: staffImages.ibrahima, experience: "5 ans", available: true }
  ],
  11: [
    { id: 23, name: "Pape Ndiaye", specialty: "Dégradé américain", rating: 5.0, image: staffImages.ousmane, experience: "10 ans", available: true },
    { id: 24, name: "Cheikh Diop", specialty: "Coupe afro", rating: 4.9, image: staffImages.ibrahima, experience: "7 ans", available: true },
    { id: 25, name: "Serigne Mbaye", specialty: "Barbe & Soins", rating: 4.8, image: staffImages.ousmane, experience: "6 ans", available: true }
  ]
}

// Avis clients - Vides pour la production (les vrais avis seront collectés via l'API)
export const reviews = []

// Quartiers de Dakar — Liste complète dans zones.js
// Import + re-export pour compatibilité
import { neighborhoods } from './zones'
export { neighborhoods }

// Catégories de services
export const categories = [
  { id: "barber", name: "Barbershop", icon: "💈", description: "Coupes hommes, dégradés, barbe" },
  { id: "shooting", name: "Shooting Photo", icon: "📸", description: "Studios photo, portraits, mode" },
  { id: "tresses", name: "Tresses", icon: "✨", description: "Tresses africaines, box braids, cornrows" },
  { id: "tissage", name: "Tissage", icon: "💇‍♀️", description: "Tissages, perruques, extensions" },
  { id: "locks", name: "Locks", icon: "🔗", description: "Locks, twists, freeform" },
  { id: "soins", name: "Soins", icon: "💆‍♀️", description: "Soins capillaires et traitements" },
  { id: "maquillage", name: "Maquillage", icon: "💄", description: "Maquillage jour, soirée, mariée" },
  { id: "ongles", name: "Ongles", icon: "💅", description: "Manucure, pédicure, nail art" },
  { id: "evenementiel", name: "Événementiel", icon: "👰", description: "Mariages et événements" },
  { id: "naturel", name: "Naturel", icon: "🌿", description: "Soins bio et naturels" }
]

// Configuration fidélité
export const loyaltyConfig = {
  bookingsForReward: 10,
  rewardType: "free_service",
  maxRewardValue: 30000,
  expirationMonths: 12
}

// Helper: Obtenir un salon avec tous ses détails
export const getSalonById = (id) => {
  const salon = salons.find(s => s.id === parseInt(id))
  if (!salon) return null
  
  return {
    ...salon,
    image: salon.coverImage || salon.images?.[0],
    services: servicesBySalon[salon.id] || [],
    coiffeurs: coiffeursBySalon[salon.id] || [],
    salonReviews: reviews.filter(r => r.salonId === salon.id)
  }
}

// Helper: Obtenir tous les salons enrichis
export const getAllSalons = () => {
  return salons.map(salon => ({
    ...salon,
    image: salon.coverImage || salon.images?.[0],
    services: servicesBySalon[salon.id] || [],
    coiffeurs: coiffeursBySalon[salon.id] || []
  }))
}

// Helper: Calculer l'acompte
export const calculateDeposit = (services, salon) => {
  const total = services.reduce((sum, s) => sum + s.price, 0)
  const depositPercentage = salon?.depositPercentage || 25
  return Math.round(total * depositPercentage / 100)
}

export default { salons, servicesBySalon, coiffeursBySalon, reviews, categories, neighborhoods }
