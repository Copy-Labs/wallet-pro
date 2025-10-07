const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? false : 'inline-source-map',
    
    entry: {
      // Background script
      background: './src/background/index.ts',
      
      // Content script (runs in isolated context)
      'content-script': './src/content-script/index.ts',
      
      // Page provider (injected into page context)
      pageProvider: './src/page-provider/index.ts',
      
      // UI popup
      popup: './src/ui/popup.tsx',
    },

    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true,
    },

    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },

    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
        {
          test: /\.(png|jpg|gif|svg)$/,
          type: 'asset/resource',
        },
      ],
    },

    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          // Copy manifest
          {
            from: env.manifestVersion === '3' 
              ? 'manifest-v3.json' 
              : 'manifest-v2.json',
            to: 'manifest.json',
          },
          // Copy HTML files
          { from: 'src/ui/popup.html', to: 'popup.html' },
          // Copy icons
          { from: 'icons', to: 'icons' },
        ],
      }),
    ],

    optimization: {
      minimize: isProduction,
      splitChunks: {
        chunks: (chunk) => {
          // Don't split content-script and pageProvider
          return chunk.name !== 'content-script' && chunk.name !== 'pageProvider';
        },
      },
    },
  };
};

