import { build } from 'esbuild';
await build({ entryPoints: ['native/file-export.js'], bundle: true, format: 'iife', target: 'safari15', outfile: 'dist/native-export.js' });
