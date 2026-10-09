// rollup.config.js
import { defineConfig } from 'rollup';
import terser from '@rollup/plugin-terser';
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from '@rollup/plugin-commonjs';
import glslify from 'rollup-plugin-glslify';
import json from '@rollup/plugin-json';

export default defineConfig({
  input: 'src/xasu-js.js',
  plugins: [json()],
  output: [
    {
      file: 'dist/xasu-js.bundle.js',
      format: 'es',
      plugins: [
              nodeResolve({
                  browser: true,
                  preferBuiltins: false,
                  mainFields: ['module', 'main', 'browser']
              }),
              commonjs({
                  include: "/node_modules/",
                  transformMixedEsModules: true,
                  requireReturnsDefault: "preferred"
              }),
              glslify()
            ]
    },
    {
      file: 'dist/xasu-js.bundle.cjs',
      format: 'cjs',
      plugins: [
              nodeResolve({
                  browser: true,
                  preferBuiltins: false,
                  mainFields: ['module', 'main', 'browser']
              }),
              commonjs({
                  include: "/node_modules/",
                  transformMixedEsModules: true,
                  requireReturnsDefault: "auto"
              }),
              glslify()
            ]
    },
    {
      file: 'dist/xasu-js.bundle.min.js',
      format: 'es',
      plugins: [terser()],
    },
    {
      file: 'dist/xasu-js.bundle.min.cjs',
      format: 'cjs',
      plugins: [terser()],
    },
  ],
});
