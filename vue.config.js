const IS_PROD = ["production"].includes(process.env.NODE_ENV);
const webpack = require("webpack");
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin;
const path = require("path");
const config = {
  publicPath: "/",
  outputDir: "dist/",
  lintOnSave: false, //
  productionSourceMap: false, //
  css: {
    sourceMap: false,
    requireModuleExtension: true,
    loaderOptions: {
      scss: {
        additionalData: `
          @use "@/styles/variables.scss" as *;
          @use "@/styles/mixins.scss" as *;
        `,
      },
    },
  },
  devServer: {
    https: true,
  },
  chainWebpack: config => {
    config.module
      .rule("svg")
      .exclude.add(path.join(__dirname, "src/assets/icons")) //
      .end();
    config.module
      .rule("icons")
      .test(/\.svg$/)
      .include.add(path.join(__dirname, "src/assets/icons"))
      .end()
      .use("svg-sprite-loader")
      .loader("svg-sprite-loader")
      .options({
        symbolId: "icon-[name]",
      })
      .end();
    config.plugins.delete("preload");
  },
};
if (IS_PROD) {
  const CompressionWebpackPlugin = require("compression-webpack-plugin");
  config.configureWebpack = {
    optimization: {
      splitChunks: {
        cacheGroups: {
          vendors: {
            name: "cbcomponents",
            priority: 100,
            test: /[\\/]node_modules[\\/]/,
            minSize: 0,
            minChunks: 1,
            reuseExistingChunk: true,
          },
          contracts: {
            name: "contracts",
            priority: 2,
            test: path.resolve("src/contract"),
            minChunks: 2,
            reuseExistingChunk: true,
          },
        },
        chunks: "all",
        minChunks: 2,
        minSize: 128000,
        maxSize: 256000,
      },
    },
    plugins: [
      new CompressionWebpackPlugin({
        algorithm: "gzip",
        test: new RegExp("\\.(" + ["js", "css"].join("|") + ")$"),
        threshold: 10240,
        minRatio: 0.6,
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /genesisStates\/[a-z]*\.json$/,
        contextRegExp: /@ethereumjs\/common/,
      }),
    ],
    resolve: {
      alias: {
        "bn.js": path.resolve(process.cwd(), "node_modules", "bn.js"),
        "elliptic.js": path.resolve(process.cwd(), "node_modules", "elliptic.js"),
        "sha3.js": path.resolve(process.cwd(), "node_modules", "sha3.js"),
        _: "lodash",
      },
    },
  };
}

module.exports = config;
