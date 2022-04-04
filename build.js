const esbuild = require('esbuild');

esbuild.buildSync({
    platform: 'browser',
    globalName: 'c64emu',
    minify: true, // TODO
    target: 'es2020',
    entryPoints: ['src/index.ts'],
    bundle: true,
    outfile: 'dist/c64emu.min.js',
});
