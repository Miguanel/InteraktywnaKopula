import { ACCESSORIES } from '../config/accessories'
import Deck from './accessories/Deck'
import OutdoorLights from './accessories/OutdoorLights'
import Plants from './accessories/Plants'
import LedInterior from './accessories/LedInterior'

/**
 * ACCESSORIES – mapowanie id → komponent 3D.
 * Metadane (nazwa, opis, ścieżka .glb) żyją w src/config/accessories.js.
 * Nowe akcesorium = wpis w configu + komponent tutaj.
 */
const COMPONENTS = {
  deck: Deck,
  outdoorLights: OutdoorLights,
  plants: Plants,
  ledInterior: LedInterior,
}

export default function Accessories({ enabled }) {
  return ACCESSORIES.filter((meta) => enabled[meta.id] && COMPONENTS[meta.id]).map((meta) => {
    const Component = COMPONENTS[meta.id]
    return <Component key={meta.id} meta={meta} />
  })
}
