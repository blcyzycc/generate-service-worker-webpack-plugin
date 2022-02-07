# generate-service-worker-webpack-plugin

源码地址：https://github.com/blcyzycc/generate-service-worker-webpack-plugin

#### 介绍
webpack 打包自动生成并插入 service worker 文件


#### 软件架构
Node.js 以及 JavaScript


#### 安装教程
npm install -D generate-service-worker-webpack-plugin


#### 使用说明 1
全部配置如下：
name      打包之后 service worker 文件的名称；
version   打包之后 service worker 的版本号；
cacheFlag 在项目文件中加入 flag，打包时匹配文件中是否包含此 flag，有则缓存，且此配置具有最高优先级；
          注意由于 webpack 打包会 tree shaking，要避免 cacheFlag 打包时被移除，
          可以参考我的做法，
          1、如果是模板文件，可以把 cacheFlag 写入DOM元素属性中，如下：
          <div sw="ServiceWorkerFlag"></div>
          2、如果是js文件，把 cacheFlag 赋值到 window 对象的属性，如下：
          window.sw = 'ServiceWorkerFlag'
excache   匹配文件名，成功则不进行离线缓存
size      对需要缓存的文件大小进行判断，符合条件则缓存。单位：字节。默认缓存 0 ~ 10M 内的文件
          excache 和 size 会共同作用。
filter    自定义过滤函数，有两个参数，参数1：缓存文件名列表， 参数2：compilation.assets ，需要返回文件路径列表

```
const GenerateServiceWorkerWebpackPlugin = require('generate-service-worker-webpack-plugin')

module.exports = {
  // ...
  configureWebpack: config => {
    let plugins = []

    if (process.env.NODE_ENV === 'production') {
      plugins.push(new GenerateServiceWorkerWebpackPlugin({
        name: 'sw',
        version: '1.0.1',
        cacheFlag: 'ServiceWorkerFlag',
        excache: /(\.map$|\.mp4$)/,
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

#### 使用说明 2
全部使用默认配置
```
plugins.push(new GenerateServiceWorkerWebpackPlugin());
```

#### 参与贡献
blcyzycc


#### 特技

