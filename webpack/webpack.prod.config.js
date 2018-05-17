var path = require('path');
var webpack = require('webpack');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var HtmlWebpackPlugin = require('html-webpack-plugin');

var outPath = path.resolve(__dirname, '../docs');

module.exports = {
  mode: 'production',
  context: path.resolve(__dirname , '..'),
  devtool: 'source-map',
  entry: [
    './src/app.js'
  ],
  output: {
    path: outPath,
    filename: '[name].[hash].js',
    publicPath: '',
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader'
          }
        ]
      },
      {
        test: /\.styl|\.css/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: [
            {
              loader: 'css-loader',
              options: {
                importLoaders: 1,
                localIdentName: '[local]',
                sourceMap: true
              }
            },
            {
              loader: 'stylus-loader',
              options: {
                sourceMap: true
              }
            }
          ]
        })
      }
    ]
  },
  resolve: {
    modules: [
      'src',
      'node_modules'
    ],
    extensions: ['.webpack-loader.js', '.web-loader.js', '.loader.js', '.js', '.jsx']
  },
  plugins: [
    new HtmlWebpackPlugin({
      filename: '../docs/index.html',
      template: './webpack/index.tpl.ejs',
    }),
    new ExtractTextPlugin({
      filename: '[name].[hash].css'
    }),
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify('production')
      },
      'IS_PRODUCTION': true
    }),
    // new BundleAnalyzerPlugin()
  ],
  optimization: {
    noEmitOnErrors: true, // NoEmitOnErrorsPlugin
    concatenateModules: true //ModuleConcatenationPlugin
  },
  target: 'web', // Make web variables accessible to webpack, e.g. window
  stats: {
    colors: true,
    hash: false,
    version: false,
    chunks: false,
    children: false
  }
}
