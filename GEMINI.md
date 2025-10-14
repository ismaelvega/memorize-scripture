## Project Overview

This is a scripture memorization application built with Next.js and TypeScript. It allows users to practice memorizing Bible verses in Spanish through three different modes:

*   **Type Mode:** Users can type the verse freely and get a grade on their accuracy.
*   **Speech Mode:** Users can recite the verse, and the application uses the OpenAI Whisper API to transcribe the speech and grade it.
*   **Stealth Mode:** Users are prompted with the first letter of each word and have to recall the entire verse.

The application uses `localStorage` to persist user progress and attempts. The Bible data is stored in JSON files in the `public/bible_data` directory.

## Building and Running

To build and run the project, use the following commands:

```bash
npm install
npm run dev
```

The application will be available at `http://localhost:3000`.

For the Speech Mode to work, you need to create a `.env.local` file with your OpenAI API key:

```bash
OPENAI_API_KEY=sk-...
```

### Other available scripts

*   `npm run build`: Builds the application for production.
*   `npm run start`: Starts the production server.
*   `npm run lint`: Lints the codebase using ESLint.

## Development Conventions

*   The project uses the Next.js App Router.
*   Styling is done with Tailwind CSS.
*   UI components are built using Radix UI and custom components.
*   State management is handled with React Context and `zustand`.
*   The code is written in TypeScript with strict configuration.
*   The project uses `eslint` for linting.
