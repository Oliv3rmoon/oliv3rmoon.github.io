# Andrew Sandoval

Personal portfolio: [oliv3rmoon.github.io](https://oliv3rmoon.github.io).

Electrical engineering, animatronics research, and the space between software and the physical world. Midnight black, white, and IM FELL English, with an original Blender sculpture rendered interactively in Three.js.

## Pages

- Home
- Selected work
- DPOC marketplace
- Animatronic dinosaur — early R&D
- Lab / Orbit visual study
- About

## Development

Use Node.js 24 and pnpm 11.19.0.

```sh
pnpm install
pnpm dev
```

```sh
pnpm check
pnpm build
pnpm preview
```

The build generates complete HTML for every route, then hydrates the interactive components. GitHub Actions publishes `dist/` to GitHub Pages on changes to `main`.

Content lives in `app/`. Shared presentation and the 3D viewer live in `components/`. Editable Blender artwork lives in `art/`; optimized website assets live in `public/`.

The dinosaur is in brainstorming, 3D model mapping, and CAD planning. Orbit is a separate conceptual sculpture created for this portfolio, not a dinosaur CAD model or fabricated prototype.
