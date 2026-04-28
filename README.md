# GeoPlay — Country Guesser

A geography games platform built with Vite, React, TypeScript, and Tailwind CSS. The first game is a country guessing challenge that uses real TopoJSON data from `world-atlas`.

## ?? Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:5175/](http://localhost:5175/) in your browser.

3. Build for production:
   ```bash
   npm run build
   ```

## ?? Game Features

- **Country Guesser** with real geographic shapes from `world-atlas`
- **Dynamic routes** generated from a centralized game registry
- **React Router v6** client-side routing
- **D3 + TopoJSON** for map rendering and borders
- **Tailwind CSS** for a polished dark cartographic interface
- **TypeScript** with strict typing throughout
- **Responsive design** for desktop and mobile screens

## ?? Project Structure

```
/src
  /components
    Header.tsx
    GameCard.tsx
  /games
    registry.ts
    /country-guesser
      index.tsx
      WorldMap.tsx
      QuizPanel.tsx
      countryData.ts
  /pages
    Home.tsx
    NotFound.tsx
  App.tsx
  router.tsx
  main.tsx
  index.css
tsconfig.json
package.json
```

## ?? How to Add a New Game

1. Create a new folder under `src/games/` for the game.
2. Add the game component and any supporting UI modules.
3. Export a lazy-loaded component from `src/games/registry.ts`.
4. Add the game entry to the `GAMES` array with `slug`, `name`, `description`, `icon`, and `status`.
5. The router automatically creates the route for `/games/<slug>`.

## ?? How the Country Guesser Works

- The game shuffles the full country list on start.
- Each round highlights one country on the map.
- Four choices are presented, with one correct answer and three distractors.
- Correct answers increase the score and streak.
- Incorrect answers reveal the correct country and reset the streak.
- After the final country, the app shows a results screen and restart option.

## ?? Dependencies

- `react`, `react-dom`
- `react-router-dom`
- `d3`
- `topojson-client`
- `world-atlas`
- `tailwindcss`

## ??? Notes

- The map geometry comes directly from `world-atlas/countries-110m.json`.
- Country names are provided from a static ISO 3166-1 numeric lookup in `src/games/country-guesser/countryData.ts`.
- The app is built to scale to more geography games through the shared game registry.
