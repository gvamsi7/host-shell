const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')

const paymentsDist =
  process.env.OFFER_PAYMENTS_DIST ||
  path.resolve(__dirname, '..', 'offer-payments', 'dist')

const tradingDist =
  process.env.OFFER_TRADING_DIST ||
  path.resolve(__dirname, '..', 'offer-trading', 'dist')

const analyticsDist =
  process.env.OFFER_ANALYTICS_DIST ||
  path.resolve(__dirname, '..', 'offer-analytics', 'dist')

module.exports = {
  entry: path.resolve(__dirname, 'src/main.jsx'),

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'shell.js',
    publicPath: '/',
    clean: true,
    iife: true,
  },

  resolve: {
    extensions: ['.js', '.jsx', '.json'],
  },

  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { targets: 'defaults' }],
              ['@babel/preset-react', { runtime: 'automatic' }],
            ],
          },
        },
      },
    ],
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'index.html'),
      inject: 'body',
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'public/offers.manifest.json'),
          to: 'offers.manifest.json',
        },
      ],
    }),
  ],

  optimization: {
    splitChunks: false,
    runtimeChunk: false,
  },

  devtool: false,

  devServer: {
    host: '0.0.0.0',
    port: 3000,
    historyApiFallback: true,
    hot: false,
    liveReload: true,

    static: [
      {
        directory: paymentsDist,
        publicPath: '/offers/payments',
        watch: true,
      },
      {
        directory: tradingDist,
        publicPath: '/offers/trading',
        watch: true,
      },
      {
        directory: analyticsDist,
        publicPath: '/offers/analytics',
        watch: true,
      },
    ],
  },

  performance: {
    hints: false,
  },
}
