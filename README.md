# Reusable UI Chips and Blocks

This repository contains a [Next.js](https://nextjs.org) project that serves as a library of reusable UI components. It is intended as a central place to build, preview, and maintain small UI elements ("chips") and larger UI compositions ("blocks"). This repository will also contain usefull tools to help speed up website creation.

## Dependencies

- React
- Tailwind
- Typescript

## Chips

Chips are small, focused UI components. They should be simple, reusable, and free of heavy business logic. Each chip represents a single, self‑contained UI idea.

## Blocks

Blocks are larger, more opinionated UI compositions. They may combine multiple chips and additional layout or logic to form more complete interface sections.

## Getting Started

### If you want a specific UI Chip or Block

Install React and Typescript

```bash
npm install react@latest react-dom@latest
npm install --save-dev typescript @types/react @types/react-dom @types/node
```

Install [Tailwind](https://tailwindcss.com/docs/installation/using-vite)

Find the UI Chip or Block in the guthub repo. Then copy and paste into a file in your project.

### If you want the full Next.js project

Clone the repository:

```bash
git clone https://github.com/EricWoll/React-UI-Blocks-and-Chips.git
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Visit the app at:

http://localhost:3000

## Goals

- Build a consistent, reusable UI component library.
- Provide a visual reference for all chips and blocks.
- Support reuse across multiple projects.

## Roadmap

- Add more chips and blocks.
- Create a component gallery.
- Add documentation pages.
- Introduce automated testing.

## License

Apache 2.0
