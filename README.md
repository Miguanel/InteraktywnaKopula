# Domedron – konfigurator kopuły 3D (prototyp CPQ)

Interaktywny konfigurator kopuły geodezyjnej dla [Misteriada / Domedron](https://misteriada.com/projects/domedron).
Klient obraca model 3D, zmienia średnicę, gęstość siatki, konstrukcję, poszycie i wyposażenie,
a na końcu wysyła zapytanie ofertowe z kompletną specyfikacją.

**Stos:** React 19 · @react-three/fiber 9 · @react-three/drei 10 · three.js · zustand · Tailwind CSS 4 · Vite 8

## Uruchomienie

Wymagany Node.js 20.19+ lub 22.12+.

```powershell
npm install
npm run dev        # http://localhost:5173
npm run build      # produkcyjny build → dist/
npm run preview    # podgląd buildu
```

## Architektura

```
src/
├─ ConfiguratorApp.jsx        # layout (desktop: 3D + panel po prawej, mobile: 3D u góry, panel pod spodem)
├─ store/useConfigurator.js   # globalny stan (zustand): konfiguracja, panele, elementy, link #c=…
├─ config/
│  ├─ catalog.js              # średnice, siatki, konstrukcje, wykończenia, poszycia, presety
│  ├─ accessories.js          # elementy otoczenia (podest, oświetlenie, rośliny, girlandy)
│  ├─ items.js                # katalog przesuwanych elementów wnętrza
│  └─ panels.js               # materiały pojedynczych paneli (szkło, otwór, tkaniny)
├─ lib/
│  ├─ geodesic.js             # generator topologii kopuły (czysty JS)
│  ├─ domeMath.js             # granice wnętrza, pierścienie paneli, przenoszenie paneli między siatkami
│  ├─ patterns.js             # proceduralne grafiki tkanin dekoracyjnych
│  └─ specs.js                # wymiary, typy prętów, podsumowanie do zapytania
├─ scene/
│  ├─ DomeScene.jsx           # Canvas, światła, dzień/noc, kamera (reset, widok z góry), skróty klawiszowe
│  ├─ GeodesicDome.jsx        # pręty, węzły, panele wg materiału, edytor paneli (picker), przedsionek
│  ├─ Accessories.jsx         # elementy otoczenia
│  ├─ accessories/            # podest, lampy, rośliny, girlandy, ModelSlot (🔌 .glb), sylwetka
│  └─ items/                  # ItemsLayer (przeciąganie, zaznaczenie, komin) + placeholders
└─ ui/
   ├─ UIOverlay.jsx           # panel konfiguracji + podsumowanie + CTA
   ├─ PanelEditor.jsx         # paleta materiałów i tkanin, tryb malowania
   ├─ InteriorEditor.jsx      # katalog i lista elementów wnętrza
   ├─ ViewerOverlay.jsx       # narzędzia podglądu, pasek akcji zaznaczonego elementu
   ├─ InquiryModal.jsx        # formularz zapytania ofertowego
   └─ controls.jsx, icons.jsx
```

### Geometria

`buildGeodesicDome(freq)` dzieli ikosaedr (Class I), rzutuje na sferę i przycina:
2V i 4V → półkula, 3V → klasyczna kopuła 5/8. Liczby się zgadzają z tabelami konstrukcyjnymi
(2V: 26 węzłów / 65 prętów, 3V 5/8: 61 / 165, 4V: 91 / 250). Pręty i węzły mają stałą grubość
w metrach, więc przy zmianie średnicy przeliczane są tylko macierze instancji.

### Edytor paneli (materiały pojedynczych trójkątów)

W sekcji **Ściany i panele** klient wybiera poszycie bazowe, w tym wariant „Bez poszycia – sam szkielet”.
Po kliknięciu **Projektuj panele** może malować trójkąty na modelu: pojedynczo albo całymi pierścieniami.
Do wyboru są materiały: inne poszycie, przeszklenie, otwór oraz **tkaniny dekoracyjne**.

* Kody materiałów paneli opisuje `src/config/panels.js`.
* Grafiki tkanin są generowane proceduralnie w `src/lib/patterns.js`: organiczna koronka, portale, mandala,
  plaster miodu, fale, kręgi i słońce, w 8 kolorach fluorescencyjnych. Nowy wzór to kolejna funkcja `draw…`
  i wpis w `DECOR_PATTERNS`. `mapping: 'continuous'` oznacza wzór przechodzący przez panele,
  a `'panel'` osobny motyw w każdym trójkącie.
* Tkaniny świecą w widoku nocnym, a mocniej, gdy we wnętrzu stoi naświetlacz UV.
* Przy zmianie siatki (2V/3V/4V) materiały są przenoszone na najbliższe panele nowej siatki.

### Aranżacja wnętrza (przesuwane elementy)

Katalog elementów jest w `src/config/items.js`, a komponenty 3D w `src/scene/items/`. Klient:

* dodaje element z katalogu (trafia w wolne miejsce),
* przeciąga go po podłodze. Pozycja jest przycinana do wnętrza kopuły, z uwzględnieniem wysokości elementu
  i spadku ściany. Lampy podwieszane przesuwają się na wysokości zawieszenia.
* obraca go, powiela lub usuwa (pasek akcji w podglądzie; skróty Q/E, Delete, Esc).

Podczas aranżacji ściany stają się półprzezroczyste. Przycisk **Widok z góry** pokazuje plan wnętrza.
Przy zmianie średnicy pozycje elementów skalują się proporcjonalnie. Presety przeznaczenia zawierają
przykładowe aranżacje i reguły paneli (`items`, `panelRules` w `src/config/catalog.js`).

Nowy element to wpis w `ITEMS` (wymiary `radius`/`height`), placeholder w `src/scene/items/placeholders.jsx`
i jedna linia w mapie `PLACEHOLDERS` w `ItemsLayer.jsx`.

### Światło i roślinność na konstrukcji (belki i węzły)

Sekcja **Światło i roślinność na konstrukcji** działa jak edytor paneli, tylko klient klika belki i węzły:

* **Oświetlenie belkowe LED**: listwa wzdłuż belki od strony wnętrza.
* **Oświetlenie punktowe**: reflektor na węźle, skierowany w podłogę.
* **Lampki na sznurku**: girlanda zwisająca między węzłami.
* **Pnącza**: bluszcz, pnącze kwitnące albo glicynia oplatające belkę.
* **Wisząca donica**: zawieszona na węźle.

Każdą belkę i każdy węzeł można edytować pojedynczo albo całym poziomem („pierścień”). Jest też Gumka, która usuwa
dekoracje z belki lub węzła. Światło ma 11 barw: trzy odcienie bieli (2700/4000/6500 K) i kolory RGB. Konfigurację
przechowuje `config.attach` z warstwami `edgeLight`, `edgePlant`, `hubLight` i `hubPlant`, więc np. lampki i pnącze
mogą być na tej samej belce. Typy, kolory i gatunki są zdefiniowane w `src/config/frameDecor.js`.

**Prawdziwe światło:** oprawy są emiterami, a `src/scene/frame/FrameLights.jsx` grupuje je (k-means z karą za różnicę
koloru) do stałej puli `PointLight` i `SpotLight`: 7+5 świateł na desktopie, 4+3 na telefonie. Dzięki temu scena
jest naprawdę oświetlona w wybranych barwach, a kolejne kliknięcia nie powodują rekompilacji shaderów ani spadków
płynności.

### Podmiana placeholderów na modele .glb

1. Wrzuć plik do `public/models/`, np. `public/models/stove.glb`
   (jednostki: metry, oś Y w górę, pivot na styku z podłożem).
2. W `src/config/accessories.js` (elementy otoczenia) lub `src/config/items.js` (elementy wnętrza)
   ustaw `model: './models/stove.glb'`.

Tyle wystarczy. `ModelSlot` sam załaduje model przez `useGLTF` (z `Suspense`, a do czasu
załadowania wyświetli placeholder) i zachowa pozycjonowanie liczone przez komponent akcesorium.

### Dodanie nowej opcji

* **Kolor poszycia / konstrukcja / siatka:** nowy obiekt w `src/config/catalog.js`.
* **Nowe akcesorium:** wpis w `src/config/accessories.js` + komponent w `src/scene/accessories/`
  + jedna linia w mapie `COMPONENTS` w `src/scene/Accessories.jsx`.

## Zapytania ofertowe

Ustaw zmienne środowiskowe (lokalnie w `.env.local`, na Render w *Environment*):

| Zmienna | Działanie |
|---|---|
| `VITE_INQUIRY_ENDPOINT` | POST `application/json` z danymi kontaktowymi, konfiguracją, podsumowaniem i linkiem (np. Formspree lub własne API) |
| `VITE_INQUIRY_EMAIL` | gdy brak endpointu, otwiera program pocztowy z gotową wiadomością |

Dodatkowo każde zgłoszenie jest wysyłane do strony nadrzędnej przez
`postMessage({ type: 'domedron:inquiry', payload })`, co przydaje się przy osadzeniu w iframe.

## Wdrożenie na Render (prototyp)

1. Wypchnij projekt na GitHub.
2. Render → **New → Blueprint** → wskaż repozytorium (użyje `render.yaml`),
   albo **New → Static Site**: Build Command `npm install && npm run build`, Publish Directory `dist`.
3. Ustaw zmienne `VITE_INQUIRY_*` i uruchom deploy.

## Osadzenie na stronie klienta (iframe)

Gotowy fragment HTML/CSS znajdziesz w `public/embed-example.html` (po buildzie: `/embed-example.html`).
Aplikacja zawsze wypełnia 100% wysokości swojego okna, więc wystarczy nadać iframe'owi wysokość.
W `render.yaml` nagłówek `frame-ancestors` pozwala na osadzanie tylko na misteriada.com. Jeśli testujesz
na innej domenie, dopisz ją tam.

Build można też wgrać na serwer klienta jako zwykłe pliki statyczne (np. do `/konfigurator/`).
Dzięki `base: './'` w `vite.config.js` ścieżki są względne.
