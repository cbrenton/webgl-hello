// rollup.config.js
import resolve from '@rollup/plugin-node-resolve';
import commonJS from '@rollup/plugin-commonjs';
import includePaths from 'rollup-plugin-includepaths';

export default {
  input: 'modules/main.js',
  output: {
    file: 'public/js/bundle.js',
    format: 'iife',
  },
  plugins: [
    resolve(),
    commonJS({
      include: 'node_modules/**',
    }),
    includePaths({paths: ["./modules/"]}),
  ]
};
