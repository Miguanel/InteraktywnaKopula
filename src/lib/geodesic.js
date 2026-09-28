/**
 * Generator topologii kopuły geodezyjnej (Class I, podział ikosaedru).
 *
 * Czysty JS – bez zależności od three.js – dzięki temu można go testować
 * w Node/Bun i reużyć np. do generowania listy cięć prętów po stronie serwera.
 *
 * Zwracane wartości są w jednostkach "sfery jednostkowej" (R = 1),
 * z podstawą przesuniętą na y = 0. Skalowanie do metrów robi warstwa 3D.
 */

const PHI = (1 + Math.sqrt(5)) / 2

/** Standardowe wierzchołki ikosaedru. */
const ICO_VERTS = [
  [-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
  [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
  [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1],
]

const ICO_FACES = [
  [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
  [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
  [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
  [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
]

const normalize = ([x, y, z]) => {
  const l = Math.hypot(x, y, z)
  return [x / l, y / l, z / l]
}

/**
 * Obrót tak, aby wierzchołek ikosaedru (0) wypadł na biegunie (+Y).
 * Dla częstotliwości parzystych daje to idealnie płaską podstawę na równiku.
 */
function rotateVertexToPole(v, pole) {
  // oś obrotu = pole × Y, kąt = acos(pole · Y)
  const [px, py, pz] = pole
  const axis = normalize([pz, 0, -px].map((c) => c || 1e-12))
  const angle = Math.acos(py)
  const [ax, ay, az] = axis
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  const t = 1 - c
  const [x, y, z] = v
  return [
    (t * ax * ax + c) * x + (t * ax * ay - s * az) * y + (t * ax * az + s * ay) * z,
    (t * ax * ay + s * az) * x + (t * ay * ay + c) * y + (t * ay * az - s * ax) * z,
    (t * ax * az - s * ay) * x + (t * ay * az + s * ax) * y + (t * az * az + c) * z,
  ]
}

/** Docelowa "wysokość cięcia" sfery dla danej częstotliwości. */
const CUT_TARGET = {
  2: 0, // półkula (1/2)
  3: -0.25, // klasyczna kopuła 5/8
  4: 0, // półkula (1/2)
  5: -0.2, // ~ 5/8 (wariant rozszerzony)
  6: 0,
}

const cache = new Map()

/**
 * @param {number} frequency  2 | 3 | 4 (| 5 | 6)
 * @returns {{
 *   vertices: number[][],        // [x,y,z] po przesunięciu podstawy na y=0 (R=1)
 *   edges: [number, number][],   // pary indeksów wierzchołków (pręty)
 *   faces: [number, number, number][], // trójkąty (panele poszycia)
 *   centerY: number,             // y środka sfery (R=1) – potrzebne do akcesoriów
 *   height: number,              // wysokość kopuły (R=1)
 *   baseRadius: number,          // promień obrysu podstawy (R=1)
 *   strutTypes: {label:string, length:number, count:number}[],
 * }}
 */
export function buildGeodesicDome(frequency = 3) {
  if (cache.has(frequency)) return cache.get(frequency)
  const f = Math.max(1, Math.round(frequency))

  const pole = normalize(ICO_VERTS[0])
  const base = ICO_VERTS.map((v) => rotateVertexToPole(normalize(v), pole))

  // --- 1. Podział każdej ściany ikosaedru (barycentrycznie) i rzut na sferę
  const verts = []
  const index = new Map()
  const key = (v) => v.map((c) => Math.round(c * 1e6)).join(',')
  const addVertex = (v) => {
    const k = key(v)
    if (index.has(k)) return index.get(k)
    index.set(k, verts.length)
    verts.push(v)
    return verts.length - 1
  }

  const faces = []
  for (const [ia, ib, ic] of ICO_FACES) {
    const A = base[ia]
    const B = base[ib]
    const C = base[ic]
    const grid = []
    for (let i = 0; i <= f; i++) {
      grid[i] = []
      for (let j = 0; j <= f - i; j++) {
        const k = f - i - j
        const p = [0, 1, 2].map((d) => (A[d] * k + B[d] * i + C[d] * j) / f)
        grid[i][j] = addVertex(normalize(p))
      }
    }
    for (let i = 0; i < f; i++) {
      for (let j = 0; j < f - i; j++) {
        faces.push([grid[i][j], grid[i + 1][j], grid[i][j + 1]])
        if (j < f - i - 1) faces.push([grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]])
      }
    }
  }

  // --- 2. Wybór poziomu cięcia (najbliższy "pierścień" wierzchołków do celu)
  const target = CUT_TARGET[f] ?? 0
  const levels = [...new Set(verts.map((v) => Math.round(v[1] * 1e5) / 1e5))].sort((a, b) => a - b)
  const cut = levels.reduce((best, l) => (Math.abs(l - target) < Math.abs(best - target) ? l : best), levels[0])
  const EPS = 1e-4

  // --- 3. Zostawiamy ściany leżące w całości nad cięciem
  const kept = faces.filter((tri) => tri.every((i) => verts[i][1] >= cut - EPS))

  // --- 4. Reindeksacja + spłaszczenie podstawy
  const remap = new Map()
  const outVerts = []
  const outFaces = kept.map((tri) =>
    tri.map((i) => {
      if (!remap.has(i)) {
        remap.set(i, outVerts.length)
        const [x, y, z] = verts[i]
        outVerts.push([x, Math.max(0, y - cut), z])
      }
      return remap.get(i)
    }),
  )

  // --- 5. Unikalne krawędzie = pręty
  const edgeSet = new Map()
  for (const [a, b, c] of outFaces) {
    for (const [p, q] of [[a, b], [b, c], [c, a]]) {
      const k = p < q ? `${p}_${q}` : `${q}_${p}`
      if (!edgeSet.has(k)) edgeSet.set(k, p < q ? [p, q] : [q, p])
    }
  }
  const edges = [...edgeSet.values()]

  // --- 6. Klasyfikacja prętów wg długości (A, B, C…) – do specyfikacji
  const groups = new Map()
  for (const [a, b] of edges) {
    const [ax, ay, az] = outVerts[a]
    const [bx, by, bz] = outVerts[b]
    const len = Math.hypot(ax - bx, ay - by, az - bz)
    const k = len.toFixed(3)
    groups.set(k, (groups.get(k) || 0) + 1)
  }
  const strutTypes = [...groups.entries()]
    .map(([len, count]) => ({ length: Number(len), count }))
    .sort((a, b) => a.length - b.length)
    .map((g, i) => ({ ...g, label: String.fromCharCode(65 + i) }))

  // --- 7. Wyrównanie podstawy (dla częstotliwości nieparzystych dolny pierścień
  //        nie jest idealnie płaski – w praktyce kompensuje się to podwaliną /
  //        krótszymi słupkami; tu dosuwamy go do y=0, żeby kopuła stała na gruncie)
  const FLAT_BAND = 0.035
  for (const v of outVerts) if (v[1] < FLAT_BAND) v[1] = 0

  const baseRadius = Math.sqrt(Math.max(0, 1 - cut * cut))
  const result = {
    frequency: f,
    vertices: outVerts,
    edges,
    faces: outFaces,
    centerY: -cut,
    height: 1 - cut,
    baseRadius,
    strutTypes,
  }
  cache.set(frequency, result)
  return result
}
