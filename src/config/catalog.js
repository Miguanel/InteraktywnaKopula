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

/** Poszycie */
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
]

/**
 * Przeznaczenie – "presety" ustawiające sensowne wartości startowe.
 * Klient może później dowolnie zmieniać poszczególne opcje.
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
      cover: 'pvc-white',
      panoramicWindow: true,
      accessories: { deck: true, ledInterior: true, stove: true, outdoorLights: true, plants: true, speakers: false },
    },
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
      cover: 'greenhouse',
      panoramicWindow: false,
      accessories: { deck: false, ledInterior: false, stove: false, outdoorLights: false, plants: true, speakers: false },
    },
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
      cover: 'pvc-white',
      panoramicWindow: false,
      accessories: { deck: false, ledInterior: true, stove: false, outdoorLights: true, plants: false, speakers: true },
    },
  },
]

export const DEFAULT_PRESET = 'glamping'
