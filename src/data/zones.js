/**
 * Zones et quartiers du Sénégal — Région de Dakar
 * Structure : zone → quartiers[]
 * Facilement extensible pour ajouter de nouvelles zones/quartiers
 */

export const zones = [
  {
    zone: "Dakar — Plateau & Centre",
    quartiers: [
      "Plateau", "Médina", "Grand Dakar", "Fann", "Point E", "Zone A", "Zone B",
      "Rebeuss", "Colobane", "Gueule Tapée", "Gibraltar", "Hann", "Bel-Air",
      "Gorée", "Sandaga", "Centenaire", "Derklé", "Karack"
    ]
  },
  {
    zone: "Dakar — Almadies & Ngor",
    quartiers: [
      "Almadies", "Almadies 2", "Ngor", "Ouakam", "Mamelles", "Virage",
      "Mermoz", "Sacré-Cœur", "Sacré-Cœur 1", "Sacré-Cœur 2", "Sacré-Cœur 3",
      "Cité Keur Gorgui", "Nord Foire", "Ouest Foire", "Yoff", "Yoff Virage",
      "Yoff Tongor", "Yoff Layène", "Yoff Diamalaye", "Cité Biagui",
      "Liberté 1", "Liberté 2", "Liberté 3", "Liberté 4", "Liberté 5", "Liberté 6",
      "Amitié 1", "Amitié 2", "Amitié 3"
    ]
  },
  {
    zone: "Dakar — HLM & Sicap",
    quartiers: [
      "HLM", "HLM Grand Médine", "HLM Grand Yoff", "HLM 5",
      "Sicap Baobab", "Sicap Liberté", "Sicap Foire", "Sicap Karack",
      "Sicap Sacré-Cœur", "Sicap Mermoz", "Sicap Amitié", "Sicap Mbao",
      "Dieuppeul", "Dieuppeul 1", "Dieuppeul 2", "Dieuppeul 3", "Dieuppeul 4",
      "Derklé", "Castors", "Grand Yoff", "Cité SHS"
    ]
  },
  {
    zone: "Parcelles Assainies & Cambérène",
    quartiers: [
      "Parcelles Assainies U1", "Parcelles Assainies U2", "Parcelles Assainies U3",
      "Parcelles Assainies U4", "Parcelles Assainies U5", "Parcelles Assainies U6",
      "Parcelles Assainies U7", "Parcelles Assainies U8", "Parcelles Assainies U9",
      "Parcelles Assainies U10", "Parcelles Assainies U11", "Parcelles Assainies U12",
      "Parcelles Assainies U13", "Parcelles Assainies U14", "Parcelles Assainies U15",
      "Parcelles Assainies U16", "Parcelles Assainies U17", "Parcelles Assainies U18",
      "Parcelles Assainies U19", "Parcelles Assainies U20", "Parcelles Assainies U21",
      "Parcelles Assainies U22", "Parcelles Assainies U23", "Parcelles Assainies U24",
      "Parcelles Assainies U25", "Parcelles Assainies U26",
      "Cambérène", "Cambérène 1", "Cambérène 2",
      "Patte d'Oie", "Patte d'Oie Builders"
    ]
  },
  {
    zone: "Pikine",
    quartiers: [
      "Pikine", "Pikine Ancien", "Pikine Est", "Pikine Ouest", "Pikine Nord",
      "Pikine Icotaf", "Pikine Tally Boumack", "Pikine Tally Bou Bess",
      "Pikine Tally Bou Mack", "Pikine Guinaw Rail Nord", "Pikine Guinaw Rail Sud",
      "Dalifort", "Thiaroye", "Thiaroye Gare", "Thiaroye Sur Mer",
      "Thiaroye Azur", "Thiaroye Kao", "Diamaguène", "Diamaguène Sicap Mbao",
      "Tivaouane Peul", "Tivaouane Diacksao", "Mbao", "Petit Mbao", "Grand Mbao",
      "Keur Mbaye Fall", "Médina Gounass"
    ]
  },
  {
    zone: "Guédiawaye",
    quartiers: [
      "Guédiawaye", "Golf Sud", "Sam Notaire", "Ndiarème Limamoulaye",
      "Wakhinane Nimzatt", "Wakhinane 1", "Wakhinane 2", "Wakhinane 3",
      "Médina Gounass", "Notaire", "Bountou Pikine",
      "Cité Aïnoumadi", "Cité Douane"
    ]
  },
  {
    zone: "Keur Massar",
    quartiers: [
      "Keur Massar", "Keur Massar Nord", "Keur Massar Sud",
      "Keur Massar Extension", "Keur Massar Arafat",
      "Yeumbeul", "Yeumbeul Nord", "Yeumbeul Sud",
      "Malika", "Malika Plage", "Jaxaay", "Tivaoune Peulh"
    ]
  },
  {
    zone: "Rufisque",
    quartiers: [
      "Rufisque", "Rufisque Nord", "Rufisque Est", "Rufisque Ouest",
      "Rufisque Centre", "Colobane Rufisque", "Arafat Rufisque",
      "Bargny", "Bargny Guédj", "Diamniadio", "Sébikhotane",
      "Sangalkam", "Bambilor", "Jaxaay", "Tivaouane Peulh",
      "Sendou", "Ndiakhirate", "Kounoune"
    ]
  },
  {
    zone: "Grand Dakar — Autres",
    quartiers: [
      "Mariste", "Cité des Eaux", "Cité ISRA", "Cité Universitaire",
      "UCAD", "Fass", "Fass Delorme", "Fass Paillotte",
      "Fenêtre Mermoz", "Front de Terre", "Grand Médine",
      "Hann Bel-Air", "Hann Mariste", "Hann Pêcheurs",
      "Mbackiyou Faye", "Niary Tally",
      "Ouagou Niayes", "Usine Niari Tally",
      "Route de l'Aéroport", "Route de Ngor",
      "VDN", "Cité Tobago", "Cité Soprim", "Keur Damel"
    ]
  }
]

/**
 * Liste plate de tous les quartiers (pour recherche / compatibilité)
 */
export const allQuartiers = zones.flatMap(z => z.quartiers)

/**
 * Flat list preserving zone info: [{ quartier, zone }]
 */
export const quartiersWithZone = zones.flatMap(z =>
  z.quartiers.map(q => ({ quartier: q, zone: z.zone }))
)

/**
 * Ancien export pour compatibilité
 */
export const neighborhoods = allQuartiers
