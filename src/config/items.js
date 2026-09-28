/**
 * KATALOG ELEMENTÓW ARANŻACJI (przesuwane przez klienta)
 * ---------------------------------------------------------------
 *  radius – promień "śladu" na podłodze [m] (kolizja ze ścianą, pierścień zaznaczenia)
 *  height – wysokość elementu [m] (kontrola, czy mieści się pod ścianą kopuły)
 *  hang   – element podwieszany (liczony przy suficie, nie przy podłodze)
 *  model  – ścieżka do .glb (null = placeholder z brył). Pivot modelu: środek
 *           podstawy (lub punkt zawieszenia dla hang: true), jednostki: metry,
 *           przód elementu skierowany w +Z.
 */
export const ITEMS = [
  // --- Oświetlenie
  {
    id: 'ledBar',
    name: 'Listwa świetlna LED',
    group: 'Oświetlenie',
    description: 'Podłużna lampa 120 cm podwieszana pod konstrukcją.',
    radius: 0.65,
    height: 0.2,
    hang: true,
    model: null,
  },
  {
    id: 'floorLamp',
    name: 'Lampa podłogowa',
    group: 'Oświetlenie',
    description: 'Stojąca lampa z ciepłym, rozproszonym światłem.',
    radius: 0.25,
    height: 1.6,
    model: null,
  },
  {
    id: 'ledStrip',
    name: 'Listwa LED przypodłogowa',
    group: 'Oświetlenie',
    description: 'Podłużna listwa świetlna 150 cm ustawiana na podłodze.',
    radius: 0.78,
    height: 0.12,
    model: null,
  },
  {
    id: 'uvLamp',
    name: 'Naświetlacz UV',
    group: 'Oświetlenie',
    description: 'Rozświetla tkaniny dekoracyjne neonowym blaskiem (tryb nocny).',
    radius: 0.3,
    height: 1.3,
    model: null,
  },
  // --- Nagłośnienie
  {
    id: 'speaker',
    name: 'Kolumna na statywie',
    group: 'Nagłośnienie',
    description: 'Głośnik szerokopasmowy na statywie.',
    radius: 0.35,
    height: 1.8,
    model: null,
  },
  {
    id: 'subwoofer',
    name: 'Subwoofer',
    group: 'Nagłośnienie',
    description: 'Niskotonowy głośnik podłogowy.',
    radius: 0.4,
    height: 0.6,
    model: null,
  },
  // --- Wyposażenie
  {
    id: 'bed',
    name: 'Łóżko 160×200',
    group: 'Wyposażenie',
    description: 'Podwójne łóżko z drewnianą ramą.',
    radius: 1.2,
    height: 0.9,
    model: null,
  },
  {
    id: 'beanbag',
    name: 'Pufa / worek',
    group: 'Wyposażenie',
    description: 'Duże siedzisko – strefa chill-out.',
    radius: 0.5,
    height: 0.6,
    model: null,
  },
  {
    id: 'table',
    name: 'Stolik okrągły',
    group: 'Wyposażenie',
    description: 'Stolik kawowy Ø 80 cm.',
    radius: 0.45,
    height: 0.5,
    model: null,
  },
  {
    id: 'rug',
    name: 'Dywan okrągły',
    group: 'Wyposażenie',
    description: 'Miękki dywan Ø 200 cm.',
    radius: 1.0,
    height: 0.02,
    model: null,
  },
  {
    id: 'stove',
    name: 'Piecyk z kominem',
    group: 'Wyposażenie',
    description: 'Koza z przejściem kominowym przez poszycie.',
    radius: 0.4,
    height: 1.0,
    model: null,
  },
  {
    id: 'plantPot',
    name: 'Roślina w donicy',
    group: 'Wyposażenie',
    description: 'Zieleń do wnętrza lub szklarni.',
    radius: 0.3,
    height: 1.2,
    model: null,
  },
]

export const ITEM_GROUPS = [...new Set(ITEMS.map((i) => i.group))]
export const getItem = (id) => ITEMS.find((i) => i.id === id)
export const MAX_ITEMS = 40
