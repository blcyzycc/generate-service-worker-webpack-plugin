# web-sw-pack

Vue、React 或其它单页面应用，集成 Service Worker 并开启缓存。支持webpack和vite等构建工具<br>

#### 介绍

Vue项目 或 React 等工程化项目单页面应用，在打包时自动集成 Service Worker 服务并开启缓存策略。<br>
网站部署后，用户进入网站会自动安装 Service Worker，按需加载并离线缓存项目文件，当项目更新时会立即刷新页面并重新离线缓存资源。<br>
项目要有 https 协议才能使 Service Worker 生效。
加载的.gz、.gzip文件不会被缓存，所以如果配置打包时压缩文件，会导致sw离线缓存失效。
Service Worker 遵循同源策略，所以跨域资源不能缓存<br>


#### 软件架构

Node.js 以及 JavaScript


#### 安装
```
npm i -D web-sw-pack
```

##### Service Worker 版本更新思路：
```
/*
打包之后 sw.js、sw.hash、index.html 中都会保存有一个相同的 hash 值
触发检查更新方式有两种，由index.html触发的如果用户弃用此插件，会导致无法触发，所以两种一起使用：
1、进入页面 index.html 先发送 postMessage 到 sw.js，sw.js 收到 message 立即检查是否更新，并刷新有效时间；（有效时间内不会再次检查更新）
2、若 sw.js 未收到 message，则在发生 fetch 请求时判断 clientId 是否变动，如果变动则检查更新，并刷新有效时间；（用户每次刷新窗口，clientId 都会改变）

检查更新的思路如下：
1、请求 sw.hash 比较返回结果与当前 sw.js 中的是否相同
    相同：向页面发起 postMessage，页面接收把当前页面的 hash 发送回 sw.js，再比较 hash 是否相同，
         如果相同，则离线缓存为最新版本，可用。
         如果不同则立即清除缓存并注销 sw.js；
         如果向页面发起 postMessage，页面在10s内没有响应 sw.js，可能用户已弃用 sw.js，立即清除缓存并注销 sw.js；
    不同：说明项目已经更新，清除所有缓存，注销 sw.js，刷新页面；
2、如果 请求 sw.hash 失败
    允许离线使用offline是否启用，如果启用则直接使用缓存，如果未启用则执行以下判断，
    判断用户端网络是否正常，
    如果网络正常，则说明此项目可能已经放弃使用 sw.js，立即清除缓存并注销 sw.js；
    如果网络断开连接，则直接使用离线缓存即可；
*/
```

#### 配置参数：

在 package.json 同级目录下新建 sw.config.cjs 文件（webpack中也可以是sw.config.js）。
注意，请注意文件编码需为 utf-8 编码文件，否则可能导致参数读取失败。

```
name      可选，打包之后 Service Worker 文件的名称，默认 sw，全名 sw.js；
version   可选，打包之后 Service Worker 的版本号，默认 0.0.1；
cacheFlag 可选，打包时匹配文件内容中是否包此 flag，有则离线缓存。
          需要你手动在项目文件中加入 flag 字符串，且此配置具有最高优先级。
          注意由于 webpack 打包会自行 tree shaking 清除无用代码，要避免 flag 打包时被清除，可以参考我的做法：
          1、如果文件中有 html 代码，可以把 cacheFlag 写入DOM元素属性中，避免被清除，如下：
          <div sw="ServiceWorkerFlag"></div>
          2、如果是js文件，在不影响程序使用的情况下，把 cacheFlag 赋值到 window 对象 或 其他全局对象内，如下：
          window.sw = 'ServiceWorkerFlag'
excache   可选，用正则表达式匹配 路径 或 文件名，匹配到的文件不进行离线缓存。
size      可选，允许缓存的文件大小范围。单位：字节。默认缓存 0 ~ 10M 内的文件。
time      缓存有效时间，此时间内不再进行检查和更新。单位（ms），默认 60000ms。
filter    可选，自定义过滤函数，有两个参数，返回 离线缓存文件列表 和 webapck assets，可自行处理文件内容。
            cacheFiles 缓存文件url列表
            assets 所有打包目录的文件列表
              name      文件名
              path      相对路径
              pathAbs   文件绝对路径
              source    文件内容，注意，超过100m的文件不进行读取
              size      文件大小，单位：字节
              change    文件是否发生改变，此属性为 true 时，修改才生效
            next          用于传递修改后的 cacheFiles
          return 的值如果是数组，将直接赋值给 cacheFiles
offline   是否允许完全离线使用，默认 true 允许。
compress  是否压缩sw代码，默认 true 压缩。
```


#### 使用案例 1

在 package.json 同级目录下新建 sw.config.cjs 文件，完整配置如下：

```
module.exports = {
  name: 'sw',
  version: '0.0.1',
  cacheFlag: 'ServiceWorkerFlag',     // 缓存内容中包含 ServiceWorkerFlag 字符串的文件
  excache: /(edit\/|\.mp4$|\.map$)/,  // 不缓存 edit目录下的所有文件 和 .mp4 .map 后缀的文件
  size: [0, 1024 * 1024 * 10],        // 只缓存 10m 以内的文件
  time: 1000*60,                      // 1分钟内不再检查更新
  offline: true,                      // 允许离线使用
  compress: true,                     // 压缩sw代码
  // 自定义过滤方法，指定缓存文件
  filter: function (cacheFiles, assets, next) {
    cacheFiles = cacheFiles.filter(m => /(\.js$)/.test(m))
    next(cacheFiles, assets)
  }
}
```

修改 package.json 文件中的 build 命令

```
"scripts": {
  ...
  "build": "vue-cli-service build && node node_modules/web-sw-pack conf=sw.test.config.cjs",
  ...
}
```


配置打包命令可以设置参数，output 项目输出目录，默认值 dist，打包配置文件 conf，默认值 sw.config.cjs

如果有自定义 output 和 配置文件，例如需要根据不同的环境变量打包，可以使用多个配置文件。
```
"build": "vue-cli-service build && node node_modules/web-sw-pack output=dist conf=sw.config.cjs",
"build:pre": "vue-cli-service build --mode pre && node node_modules/web-sw-pack output=dist_pre conf=sw.pre.config.cjs",
"build:test": "vue-cli-service build --mode test && node node_modules/web-sw-pack output=dist_test conf=sw.test.config.cjs",
```


#### 使用案例 2

自定义过滤方法，比如只缓存js文件，sw.config.cjs 配置如下：

```
module.exports = {
  name: 'sw',
  version: '1.0.1',
  filter: function (cacheFiles, assets, next) {
    cacheFiles = cacheFiles.filter(m => /(\.js$)/.test(m))
    next(cacheFiles, assets)
  }
}
```


#### 使用案例 3

全部使用默认配置，只需要配置打包命令即可，可以不设置 sw.config.cjs 文件：

```
"scripts": {
  ...
  "build": "vue-cli-service build && node node_modules/web-sw-pack",
  ...
}
```


#### 参与贡献
blcyzycc
