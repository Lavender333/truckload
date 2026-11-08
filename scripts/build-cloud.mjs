import { build } from 'esbuild';
await build({entryPoints:['src/cloud-account.js'],bundle:true,minify:true,format:'iife',target:['es2020'],outfile:'dist/cloud-account.js',legalComments:'eof'});
await build({entryPoints:['src/admin.js'],bundle:true,minify:true,format:'iife',target:['es2020'],outfile:'dist/admin.js',legalComments:'eof'});
