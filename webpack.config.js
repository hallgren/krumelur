var webpack = require("webpack");

module.exports = {
  entry: __dirname + "/src/krumelux.js",
  plugins: [
    new webpack.DefinePlugin({
      IN_BROWSER: true,

      KRUMELUX_VERSION: JSON.stringify(require("./package.json").version)
    })
  ],
  output: {
    path: __dirname + "/public/dist",
    filename: "krumelux.min.js"
  },
//  module: {
//    loaders: [
//        { test: /\.json\.js/, loader: 'babel'}
//    ]
//  },
 resolve: {
    modulesDirectories: ['node_modules']
  },
};
