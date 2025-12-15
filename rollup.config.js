import terser from '@rollup/plugin-terser';

export default [
  // CommonJS build
  {
    input: 'src/index.js',
    output: {
      file: 'dist/index.js',
      format: 'cjs',
      exports: 'default'
    }
  },
  // ES Module build
  {
    input: 'src/index.js',
    output: {
      file: 'dist/index.mjs',
      format: 'es'
    }
  },
  // Minified UMD build for browsers
  {
    input: 'src/index.js',
    output: {
      file: 'dist/index.min.js',
      format: 'iife',
      name: 'PrismHighlightLines'
    },
    plugins: [terser()]
  }
];
