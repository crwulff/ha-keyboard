// Configuration
const path = require('path');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");

const banner = `
  This source code is licensed under the MIT license.
`;

module.exports = {
  mode: "production",
  entry: './src/keyboard.ts',
  target: 'es6',
  output: {
    filename: 'keyboard.js',
    path: path.resolve(__dirname, 'dist'),
    chunkFormat: 'array-push',
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({ extractComments: false }),
      new CssMinimizerPlugin()
    ],
  },
  devServer: {
    open: true,
    hot: true,
    host: "localhost",
    static: path.join(__dirname, 'demo'),
    port: 9000
  },
  module: {
    rules: [
      {
        test: /\.m?(j|t)s$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'ts-loader'
        }
      },
      {
        test: /\.(sa|sc|c)ss$/,
        use: 'raw-loader',
      },
      {
        test: /\.(png|jpe?g|gif|svg|eot|ttf|woff|woff2)$/,
        use: ['url-loader'],
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({
        filename: 'css/index.css'
    }),
    new webpack.BannerPlugin(banner)
  ],
  resolve: {
    extensions: ['.ts', '.js', '.json']
  }
};
