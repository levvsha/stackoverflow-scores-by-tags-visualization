var path = require('path');
var webpack = require('webpack');

module.exports = {
  mode: 'development',
  context: path.resolve(__dirname, '..'),
  devtool: 'cheap-inline-module-source-map',
  entry: {
    'main': [
      'webpack-hot-middleware/client?reload=true',
      './src/app.js',
    ]
  },
  output: {
    path: path.resolve(__dirname),
    publicPath: 'http://localhost:3017/',
    filename: 'main.js'
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
        test: /\.styl|\.css$/,
        use: [
          {
            loader: 'style-loader'
          },
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
              sourceMap: true,
            }
          }
        ]
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
    new webpack.DefinePlugin({
      'IS_PRODUCTION': false
    }),
    new webpack.HotModuleReplacementPlugin(),
  ],
  optimization: {
    namedModules: true, // NamedModulesPlugin()
    splitChunks: { // CommonsChunkPlugin()
      chunks: 'async'
    }
  },
  target: 'web', // Make web variables accessible to webpack, e.g. window
  stats: true, // Don't show stats in the console
};
