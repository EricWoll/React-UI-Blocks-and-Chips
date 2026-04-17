# Reusable UI Chips and Blocks

This repository contains a [Next.js](https://nextjs.org) project that serves as a library of reusable UI components. It is intended as a central place to build, preview, and maintain small UI elements ("chips") and larger UI compositions ("blocks"). This repository will also contain usefull tools such as hooks, contexts, and functions to help speed up website creation.

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

1. Install React and Typescript

```bash
npm install react@latest react-dom@latest
npm install --save-dev typescript @types/react @types/react-dom @types/node
```

2. Install [Tailwind](https://tailwindcss.com/docs/installation/using-vite)

3. Install [Shadcn](https://ui.shadcn.com/docs/installation/manual)

4. Run this command for any component you want

```bash
npm shadcn@latest add https://react-chips-and-blocks.netlify.app/components/{component_name}.json
```

- "component_name" is the name of the component you want.
- Make sure to <b>always</b> add ".json" to the url or you will get an error when running the command.

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
- Support reusability across multiple projects.

## Roadmap

- Add more chips and blocks.
- Add documentation pages.
- Create a component gallery.
- Introduce automated testing.

## License

Apache 2.0
