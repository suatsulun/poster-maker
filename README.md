# Poster Maker

Poster Maker is a small desktop app for turning a single image into a big poster you can actually print at home. You drop in a picture, pick a paper size (A3, A4, A5 and so on), and the app slices the image across as many sheets as you want. When you're happy with the preview it spits out a PDF, ready to send to your printer. Tape the pages together and you've got a wall-sized poster without paying for a wide-format print.

It runs as a native app thanks to Tauri, so the window feels light and starts quickly, but the UI itself is just React under the hood. You can drag an image in, click the canvas to pick one, or paste straight from the clipboard with Ctrl+V. There are also a few knobs to play with: how many sheets wide the poster should be, how much the pages should overlap (handy for taping), and a safe margin so nothing important lands on the seams.

## Setting it up

You'll need Node.js and Rust installed. Rust is required because Tauri builds the desktop shell with it. If you don't have Rust yet, grab it from rustup.rs.

Clone the repo and install the JS dependencies:

```bash
npm install
```

To run the app in development with hot reload:

```bash
npm run tauri:dev
```

The first launch takes a while because Cargo has to compile the Rust side. After that it's fast.

To build a production binary for your platform:

```bash
npm run tauri:build
```

You'll find the installer or executable inside `src-tauri/target/release/bundle/`.

If you just want the web version (no native window), `npm run dev` starts a plain Vite dev server on localhost.

## Scripts worth knowing

* `npm run typecheck` runs the TypeScript compiler without emitting files.
* `npm run lint` checks code with ESLint and Prettier.
* `npm run format` rewrites files with Prettier.
