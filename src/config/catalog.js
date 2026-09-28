/**
 * KATALOG OPCJI KONFIGURATORA
 * ---------------------------------------------------------------
 * Jedno źródło prawdy dla wszystkich wyborów w UI i w scenie 3D.
 * Dodanie nowej opcji (np. koloru poszycia) = dopisanie obiektu tutaj.
 * Ceny celowo pominięte – konfigurator kończy się zapytaniem ofertowym.
 */

export const DIAMETER = {
  min: 4,
  max: 12,
  step: 0.5,
  default: 6,
  /** Średnice z oferty Domedron – wyróżnione w UI jako standardowe */
  standard: [6, 10],
}

/** Gęstość siatki (częstotliwość podziału ikosaedru) */
export const FREQUENCIES = [
  {
    id: 2,
    label: '2V',
    name: 'Podstawowa',
    description: 'Mniej prętów, szybki montaż. Dla małych kopuł.',
    recommendedMax: 6,
  },
  {
    id: 3,
    label: '3V',
    name: 'Standard',
    description: 'Kopuła 5/8 – wyższe ściany boczne, więcej miejsca.',
    recommendedMax: 10,
  },
  {
    id: 4,
    label: '4V',
    name: 'Wzmocniona',
    description: 'Gęsta siatka, najlepsza sztywność i gładka bryła.',
    recommendedMax: 12,
  },
]

/** Materiał konstrukcji (wg oferty: stal ocynkowana lub aluminium) */
export const FRAMES = [
  {
    id: 'steel',
    name: 'Stal ocynkowana',
    description: 'Maksymalna wytrzymałość, konstrukcja stała.',
    color: '#8d949a',
    metalness: 0.75,
    roughness: 0.45,
    strutRadius: 0.028, // m
    hubRadius: 0.06, // m
  },
  {
    id: 'aluminium',
    name: 'Aluminium',
    description: 'Lekka, odporna na korozję – idealna do kopuł mobilnych.',
    color: '#d3d7db',
    metalness: 0.9,
    roughness: 0.28,
    strutRadius: 0.024,
    hubRadius: 0.052,
  },
]

/** Poszycie bazowe (materiał domyślny wszystkich paneli) */
export const COVERS = [
  {
    id: 'greenhouse',
    name: 'Folia szklarniowa',
    description: 'Przezroczysta, wpuszcza maksimum światła.',
    swatch: 'linear-gradient(135deg,#e9f4f6 0%,#b9d3d8 100%)',
    color: '#dff0f2',
    opacity: 0.22,
    roughness: 0.08,
    transparent: true,
  },
  {
    id: 'pvc-white',
    name: 'Plandeka PVC – biała',
    description: 'Klasyczny wygląd glampingu, rozprasza światło.',
    swatch: '#f4f1ea',
    color: '#f1ede4',
    opacity: 1,
    roughness: 0.75,
    transparent: false,
  },
  {
    id: 'pvc-sand',
    name: 'Plandeka PVC – piaskowa',
    description: 'Ciepły, naturalny odcień wtapiający się w krajobraz.',
    swatch: '#d8c4a0',
    color: '#d6c29d',
    opacity: 1,
    roughness: 0.8,
    transparent: false,
  },
  {
    id: 'pvc-graphite',
    name: 'Plandeka PVC – grafitowa',
    description: 'Nowoczesny, elegancki charakter.',
    swatch: '#4a4d52',
    color: '#4b4e53',
    opacity: 1,
    roughness: 0.7,
    transparent: false,
  },
  {
    id: 'none',
    name: 'Bez poszycia – sam szkielet',
    description: 'Sama konstrukcja – np. pod własne tkaniny dekoracyjne lub jako pergola.',
    swatch:
      'repeating-linear-gradient(135deg, transparent 0 7px, #a9adb3 7px 9px), repeating-linear-gradient(45deg, transparent 0 7px, #a9adb3 7px 9px), #2a0810',
    color: '#ffffff',
    opacity: 0,
    roughness: 1,
    transparent: true,
    skeleton: true,
  },
]

/** Wykończenie konstrukcji (malowanie proszkowe) */
export const FRAME_FINISHES = [
  { id: 'natural', name: 'Surowe', swatch: 'linear-gradient(135deg,#d9dde1,#8d949a)', color: null },
  { id: 'black', name: 'Czarny mat', swatch: '#1f1f22', color: '#232326', metalness: 0.3, roughness: 0.55 },
  { id: 'anthracite', name: 'Antracyt', swatch: '#3d4147', color: '#3d4147', metalness: 0.4, roughness: 0.5 },
  { id: 'white', name: 'Biały', swatch: '#efede7', color: '#eceae3', metalness: 0.15, roughness: 0.5 },
  { id: 'gold', name: 'Złoty', swatch: 'linear-gradient(135deg,#f6e2a8,#b98a39)', color: '#c9a24a', metalness: 0.85, roughness: 0.3 },
]

/**
 * Przeznaczenie – "presety" ustawiające sensowne wartości startowe.
 * Klient może później dowolnie zmieniać poszczególne opcje.
 *
 *  items      – [typ, odległość od środka (0..1 promienia podłogi), kąt°, obrót° | 'center']
 *               kąt 0° = wejście (+Z), 180° = tył kopuły
 *  panelRules – reguły malowania paneli: { fromH, toH (0..1 wysokości), azimuth: [środek°, ±zakres°], code }
 *  frameRules – dekoracje konstrukcji: { target: 'edge'|'hub', fromH, toH, every, horizontal, code }
 */
export const PRESETS = [
  {
    id: 'glamping',
    name: 'Dom kopułowy',
    tagline: 'Glamping na drewnianym podeście',
    icon: 'home',
    config: {
      diameter: 6,
      frequency: 3,
      frame: 'steel',
      frameFinish: 'natural',
      cover: 'pvc-white',
      panoramicWindow: true,
      accessories: { deck: true, ledInterior: true, outdoorLights: true, plants: true },
    },
    items: [
      ['bed', 0.42, 180, 0],
      ['rug', 0.12, 0, 0],
      ['stove', 0.62, -125, 'center'],
      ['floorLamp', 0.7, 145, 0],
      ['table', 0.45, 75, 0],
    ],
    panelRules: [],
    frameRules: [{ target: 'edge', fromH: 0.62, toH: 0.74, code: 'string:warm' }],
  },
  {
    id: 'greenhouse',
    name: 'Szklarnia kopułowa',
    tagline: 'Uprawy całoroczne, także hydroponiczne',
    icon: 'leaf',
    config: {
      diameter: 6,
      frequency: 3,
      frame: 'aluminium',
      frameFinish: 'natural',
      cover: 'greenhouse',
      panoramicWindow: false,
      accessories: { deck: false, ledInterior: false, outdoorLights: false, plants: true },
    },
    items: [
      ['plantPot', 0.66, 70, 0],
      ['plantPot', 0.66, 110, 0],
      ['plantPot', 0.66, 160, 0],
      ['plantPot', 0.66, 200, 0],
      ['plantPot', 0.66, 250, 0],
      ['plantPot', 0.66, 290, 0],
      ['table', 0.15, 180, 0],
    ],
    panelRules: [],
    frameRules: [
      { target: 'edge', fromH: 0, toH: 0.3, horizontal: false, code: 'vine:ivy' },
      { target: 'hub', fromH: 0.45, toH: 0.75, every: 2, code: 'pot:trailing' },
    ],
  },
  {
    id: 'event',
    name: 'Kopuła eventowa',
    tagline: 'Festiwale, warsztaty, strefy chill-out',
    icon: 'spark',
    config: {
      diameter: 10,
      frequency: 4,
      frame: 'aluminium',
      frameFinish: 'natural',
      cover: 'pvc-white',
      panoramicWindow: false,
      accessories: { deck: false, ledInterior: true, outdoorLights: true, plants: false },
    },
    items: [
      ['speaker', 0.6, 150, 'center'],
      ['speaker', 0.6, -150, 'center'],
      ['subwoofer', 0.62, 180, 'center'],
      ['uvLamp', 0.72, 95, 'center'],
      ['uvLamp', 0.72, -95, 'center'],
      ['beanbag', 0.38, 35, 'center'],
      ['beanbag', 0.4, 100, 'center'],
      ['beanbag', 0.4, -100, 'center'],
      ['beanbag', 0.38, -35, 'center'],
      ['ledBar', 0.25, 180, 90],
    ],
    // dolna część ścian w neonowej koronce – jak na realizacjach festiwalowych Domedron
    panelRules: [{ fromH: 0, toH: 0.52, code: 'decor:lace:neonYellow' }],
    frameRules: [
      { target: 'edge', fromH: 0.62, toH: 0.74, code: 'beam:magenta' },
      { target: 'hub', fromH: 0.8, toH: 0.97, code: 'spot:cyan' },
    ],
  },
]

export const DEFAULT_PRESET = 'glamping'
