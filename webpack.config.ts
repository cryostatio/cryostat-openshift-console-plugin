/* eslint-env node */

import * as path from 'path';
import { Configuration as WebpackConfiguration } from 'webpack';
import { EnvironmentPlugin } from 'webpack';
import { Configuration as WebpackDevServerConfiguration } from 'webpack-dev-server';
import { ConsoleRemotePlugin } from '@openshift-console/dynamic-plugin-sdk-webpack';
import { TsconfigPathsPlugin } from 'tsconfig-paths-webpack-plugin';
import { flatten } from 'flat';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import fs from 'fs';

const isProd = process.env.NODE_ENV === 'production';

interface Configuration extends WebpackConfiguration {
  devServer?: WebpackDevServerConfiguration;
}

const config: Configuration = {
  mode: isProd ? 'production' : 'development',
  // No regular entry points needed. All plugin related scripts are generated via ConsoleRemotePlugin.
  entry: {},
  context: path.resolve(__dirname, 'src'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: isProd ? '[name]-bundle-[hash].min.js' : '[name]-bundle.js',
    chunkFilename: isProd ? '[name]-chunk-[chunkhash].min.js' : '[name]-chunk.js',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    plugins: [
      new TsconfigPathsPlugin({
        configFile: path.resolve(__dirname, './tsconfig.json'),
      }),
    ],
    symlinks: false,
    cacheWithContext: false,
  },
  module: {
    rules: [
      {
        test: /\.(jsx?|tsx?)$/,
        exclude: /\/node_modules\//,
        use: [
          {
            loader: 'ts-loader',
            options: {
              ignoreDiagnostics: isProd ? [] : [2322],
              configFile: path.resolve(__dirname, 'tsconfig.json'),
            },
          },
        ],
      },
      {
        test: /\.(css)$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg|woff2?|ttf|eot|otf)(\?.*$|$)/,
        type: 'asset/resource',
        generator: {
          filename: isProd ? 'assets/[contenthash][ext]' : 'assets/[name][ext]',
        },
      },
      {
        test: /\.(m?js)$/,
        resolve: {
          fullySpecified: false,
        },
      },
    ],
  },
  devServer: {
    static: './dist',
    port: 9001,
    // Allow Bridge running in a container to connect to the plugin dev server.
    allowedHosts: 'all',
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, Content-Type, Authorization',
    },
    devMiddleware: {
      writeToDisk: true,
    },
  },
  plugins: [
    new ConsoleRemotePlugin(),
    new EnvironmentPlugin({
      CRYOSTAT_AUTHORITY: isProd ? undefined : 'http://localhost:8181',
      PREVIEW: process.env.PREVIEW || 'false',
      I18N_NAMESPACE: 'plugin__cryostat-plugin',
      BASEPATH: 'cryostat',
    }),
    new CopyWebpackPlugin({
      patterns: [{ from: path.resolve(__dirname, 'locales'), to: 'locales' }],
    }),
  ],
  devtool: isProd ? false : 'source-map',
  optimization: {
    chunkIds: isProd ? 'deterministic' : 'named',
    minimize: isProd,
  },
};

// Given a list of paths to locale files, combine them into /en/plugin__cryostat-plugin.json
// TODO: accommodate multiple languages when supported by cryostat-web
function combineLocaleFiles(files: string[]) {
  let combined = {};
  files.forEach((file) => {
    try {
      const json = JSON.parse(fs.readFileSync(file).toString());
      combined = { ...combined, ...json };
    } catch {
      console.error(`Could not find locale file: ${file}`);
    }
  });
  combined = flatten(combined);
  try {
    fs.writeFileSync('./locales/en/plugin__cryostat-plugin.json', JSON.stringify(combined, null, 2));
  } catch (e) {
    console.error('Could not write plugin__cryostat-plugin.json', e);
  }
}

combineLocaleFiles([
  './locales/en/common.json',
  './src/cryostat-web/locales/en/common.json',
  './src/cryostat-web/locales/en/public.json',
]);

export default config;
