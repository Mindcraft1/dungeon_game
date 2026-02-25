#!/usr/bin/env node
/**
 * Production build script for Dungeon Rooms.
 *
 * 1. esbuild  — bundles all ES modules into a single file + minifies
 * 2. javascript-obfuscator — renames identifiers, flattens control flow,
 *    injects dead code, encodes strings  →  much harder to reverse-engineer
 * 3. Copies index.html (patched to use the bundle) + style.css into dist/
 *
 * Usage:
 *   node build.mjs            — full obfuscated build (slower, max protection)
 *   node build.mjs --fast     — minify only, skip obfuscation (quick iteration)
 */

import { buildSync } from 'esbuild';
import JavaScriptObfuscator from 'javascript-obfuscator';
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, rmSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(__dirname, 'dist');
const fast = process.argv.includes('--fast');

// ── Clean dist/ ──
if (existsSync(DIST)) rmSync(DIST, { recursive: true });
mkdirSync(DIST, { recursive: true });

// ── Step 1: Bundle + Minify with esbuild ──
console.log('⚡ Bundling with esbuild …');
const result = buildSync({
    entryPoints: [resolve(__dirname, 'src/main.js')],
    bundle: true,
    minify: true,
    format: 'iife',                 // wrap in IIFE — no module exports leak
    target: ['es2020'],
    outfile: resolve(DIST, 'game.js'),
    sourcemap: false,               // no source maps in production!
    legalComments: 'none',          // strip all comments
    drop: ['console', 'debugger'],  // remove console.log + debugger statements
    write: false,                   // we'll write ourselves after optional obfuscation
});

let code = new TextDecoder().decode(result.outputFiles[0].contents);
console.log(`   Bundled: ${(code.length / 1024).toFixed(1)} KB (minified)`);

// ── Step 2: Obfuscate (unless --fast) ──
if (!fast) {
    console.log('🔒 Obfuscating …');
    const obfuscated = JavaScriptObfuscator.obfuscate(code, {
        // ── Identifier mangling ──
        identifierNamesGenerator: 'hexadecimal',
        renameGlobals: false,           // keep globals like `document`, `window`

        // ── String encoding ──
        stringArray: true,
        stringArrayThreshold: 0.75,     // encode 75% of strings
        stringArrayEncoding: ['base64'],
        stringArrayRotate: true,
        stringArrayShuffle: true,
        stringArrayWrappersCount: 2,
        stringArrayWrappersType: 'function',

        // ── Control-flow flattening ──
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.5,

        // ── Dead code injection ──
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.2,

        // ── Other ──
        splitStrings: true,
        splitStringsChunkLength: 8,
        transformObjectKeys: true,
        numbersToExpressions: true,
        simplify: true,
        compact: true,
        selfDefending: false,           // can break in some environments
        disableConsoleOutput: true,     // neutralizes console.* at runtime

        // ── Performance ──
        target: 'browser',
        seed: 0,                        // deterministic builds
    });

    code = obfuscated.getObfuscatedCode();
    console.log(`   Obfuscated: ${(code.length / 1024).toFixed(1)} KB`);
} else {
    console.log('⏩ Skipping obfuscation (--fast mode)');
}

writeFileSync(resolve(DIST, 'game.js'), code, 'utf-8');

// ── Step 3: Copy + patch index.html ──
let html = readFileSync(resolve(__dirname, 'index.html'), 'utf-8');
// Replace the module script tag with a regular script tag pointing to the bundle
html = html.replace(
    /<script type="module" src="src\/main\.js"><\/script>/,
    '<script src="game.js"></script>'
);
writeFileSync(resolve(DIST, 'index.html'), html, 'utf-8');

// ── Step 4: Copy style.css ──
cpSync(resolve(__dirname, 'style.css'), resolve(DIST, 'style.css'));

// ── Step 5: Copy assets/ ──
const ASSETS_SRC = resolve(__dirname, 'assets');
if (existsSync(ASSETS_SRC)) {
    cpSync(ASSETS_SRC, resolve(DIST, 'assets'), { recursive: true });
    console.log('📂 Copied assets/ → dist/assets/');
}

// ── Done ──
console.log('');
console.log(`✅ Build complete → dist/`);
console.log(`   Files: index.html, style.css, game.js, assets/`);
console.log(`   Serve with: npx serve dist -l 6969`);
