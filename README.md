# service-worker-webpack-plugin

#### 介绍
webpack 打包自动生成并插入 service worker 文件


#### 软件架构
JavaScript


#### 安装教程
npm install -D generate-service-worker-webpack-plugin


#### 使用说明
  const GenerateServiceWorkerWebpackPlugin = require('generate-service-worker-webpack-plugin')

  configureWebpack: config => {
    let plugins = []

    if (process.env.NODE_ENV === 'production') {
      plugins.push(new GenerateServiceWorkerWebpackPlugin({
        name: 'sw',         // service worker 文件名称
        version: '1.1.0',   // 版本号
      }));
    }

    config.plugins = [
      ...config.plugins,
      ...plugins
    ];
  }

#### 参与贡献
blcyzycc


#### 特技

