/**
 * REJESTR AKCESORIÓW (metadane)
 * ---------------------------------------------------------------
 * `model` – ścieżka do pliku .glb w /public/models.
 *   • null  → renderowany jest placeholder z prostych brył (działa od razu),
 *   • '…glb' → ten sam komponent automatycznie ładuje model przez useGLTF
 *               (patrz src/scene/accessories/ModelSlot.jsx). Nic więcej
 *               nie trzeba zmieniać – pozycjonowanie zostaje po stronie komponentu.
 *
 * `interior: true` – akcesorium znajduje się w środku kopuły; UI podpowie
 *   wtedy włączenie trybu "Podgląd wnętrza" przy nieprzezroczystym poszyciu.
 */
export const ACCESSORIES = [
  {
    id: 'deck',
    name: 'Podest drewniany',
    description: 'Taras z desek modrzewiowych ze schodkami wejściowymi.',
    group: 'Na zewnątrz',
    interior: false,
    model: null, // np. './models/deck.glb'
  },
  {
    id: 'outdoorLights',
    name: 'Oświetlenie zewnętrzne',
    description: 'Słupki świetlne LED wokół podstawy kopuły.',
    group: 'Na zewnątrz',
    interior: false,
    model: null, // np. './models/bollard-lamp.glb'
  },
  {
    id: 'plants',
    name: 'Rośliny w donicach',
    description: 'Zielona aranżacja wokół wejścia i tarasu.',
    group: 'Na zewnątrz',
    interior: false,
    model: null, // np. './models/plant-pot.glb'
  },
  {
    id: 'ledInterior',
    name: 'Girlandy LED',
    description: 'Ciepłe, ściemnialne oświetlenie wzdłuż konstrukcji.',
    group: 'Oświetlenie konstrukcji',
    interior: true,
    model: null, // (girlanda generowana proceduralnie – model opcjonalny dla żarówki)
  },
]

export const ACCESSORY_IDS = ACCESSORIES.map((a) => a.id)
export const getAccessory = (id) => ACCESSORIES.find((a) => a.id === id)
