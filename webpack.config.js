import path from 'path';
import { fileURLToPath } from 'url';
import TerserPlugin from 'terser-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  entry: './src/xasu-js.js',
  mode: "development",
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'xasu-js-webpack.bundle.js',
    //library: 'xasu-js',              // This name will be used as a global variable
    libraryTarget: 'umd',                 // Universal Module Definition
    //globalObject: 'this',                // Ensures compatibility across environments
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],
  },
  module: {
    rules: [
      {
        test: "/test/",
        exclude: "/node_modules/",
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],  // Transpile ES6+ to ES5
          },
        },
      },
    ],
  },
};
