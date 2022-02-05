# generate-service-worker-webpack-plugin
# https://github.com/blcyzycc/generate-service-worker-webpack-plugin

#### 介绍
webpack 打包自动生成并插入 service worker 文件


#### 软件架构
Node.js 以及 JavaScript


#### 安装教程
npm install -D generate-service-worker-webpack-plugin


#### 使用说明
```
const GenerateServiceWorkerWebpackPlugin = require('generate-service-worker-webpack-plugin')

module.exports = {
  // ...
  configureWebpack: config => {
    let plugins = []

    if (process.env.NODE_ENV === 'production') {
      plugins.push(new GenerateServiceWorkerWebpackPlugin({
        // service worker 文件名称
        name: 'sw',
        // 版本号
        version: '1.0.1',
        // 匹配文件名，成功则不进行离线缓存
        excache: /(\.map$|\.mp4$)/,
        // 缓存大小在此范围内文件，单位：字节
        size: [0, 1024 * 1024],
      }));
    }

    config.plugins = [
      ...config.plugins,
      ...plugins
    ];
  }
  // ...
}
```
#### 参与贡献
blcyzycc


#### 特技

