/* eslint-disable */
var express = require('express');
var webpack = require('webpack');
var webpackConfig = require('./webpack/webpack.dev.config.js');

const compiler = webpack(webpackConfig);

let app = express();

app.use(require('webpack-dev-middleware')(compiler, {
  noInfo: true,
  publicPath: webpackConfig.output.publicPath,
  hot: true
}));

app.use(require('webpack-hot-middleware')(compiler));

app.use((req, res) => {
  res.status(200).sendFile(__dirname + '/index.html')
});

app.listen(3017, () => {
  console.info(`==> Open up http://localhost:3017/ in your browser.`)
});
