# generate-service-worker-webpack-plugin

Vue应用或其它单页面应用，集成 Service Worker 开启离线缓存。<br>

#### 介绍

Vue项目 或 React 等基于 Webpack 搭建的单页面应用，在打包时自动生成并插入 Service Worker 文件。<br>
网站部署后，用户进入网站会自动安装 Service Worker，按需加载并离线缓存项目文件，当项目更新时会立即刷新页面并重新离线缓存资源。<br>
目前不支持跨域资源缓存。<br>
项目要有 https 协议才能使 Service Worker 生效。<br>


#### 软件架构

Node.js 以及 JavaScript


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
         如果向页面发起 postMessage，页面在500ms内没有响应 sw.js，可能用户已弃用 sw.js，立即清除缓存并注销 sw.js；
    不同：说明项目已经更新，清除所有缓存，注销 sw.js，刷新页面；
2、如果 请求 sw.hash 失败
    判断用户端网络是否正常，
    如果网络正常，则说明此项目可能已经放弃使用 sw.js，立即清除缓存并注销 sw.js；
    如果网络断开连接，则直接使用离线缓存即可；
*/
```

#### 安装教程
```
npm install -D web-sw-pack
```


#### 配置参数：

注意，请注意文件编码，这里的设置都是针对 utf-8 编码文件，如果是其他编码的文件在读取时文件大小会发生变化，且 cacheFlag 可能读取失败

```
name      可选，打包之后 Service Worker 文件的名称，默认 sw，全名 sw.js；
version   可选，打包之后 Service Worker 的版本号，默认 1.0.0；
cacheFlag 可选，打包时匹配文件内容中是否包此 flag，有则离线缓存。
          需要你手动在项目文件中加入 flag 字符串，且此配置具有最高优先级。
          注意由于 webpack 打包会自行 tree shaking 清除无用代码，要避免 flag 打包时被清除，可以参考我的做法：
          1、如果文件中有 html 代码，可以把 cacheFlag 写入DOM元素属性中，避免被清除，如下：
          <div sw="ServiceWorkerFlag"></div>
          2、如果是js文件，在不影响程序使用的情况下，把 cacheFlag 赋值到 window 对象 或 其他全局对象内，如下：
          window.sw = 'ServiceWorkerFlag'
excache   可选，用正则表达式匹配 路径 或 文件名，匹配到的文件不进行离线缓存。
size      可选，允许缓存的文件大小范围。单位：字节。默认缓存 0 ~ 10M 内的文件。
time      缓存有效时间，此时间内不再进行检查和更新。单位（ms），默认 10000ms。
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
```


#### 使用案例 1

在 package.json 同级目录下新建 sw.config.js 文件，内容如下

```
module.exports = {
  name: 'sw',
  version: '0.0.1',
  cacheFlag: 'ServiceWorkerFlag',     // 缓存内容中包含 ServiceWorkerFlag 字符串的文件
  excache: /(edit\/|\.mp4$|\.map$)/,  // 不缓存 edit目录下的所有文件 和 .mp4 .map 后缀的文件
  size: [0, 1024 * 1024 * 10],        // 只缓存 10m 以内的文件
  time: 1000*60,                      // 1分钟内不再检查更新
}
```
修改 package.json 文件中的 build 命令

```
"scripts": {
  "serve": "vue-cli-service serve",
  "build": "vue-cli-service build && node node_modules/web-sw-pack/index",
  "build:test": "vue-cli-service build --mode test",
  "build:pre": "vue-cli-service build --mode pre",
  "lint": "vue-cli-service lint"
}
```


output 如果项目的输出目录是 dist，配置文件是 sw.config.js 则可以省略参数配置

如果有自定义 output 和 配置文件，可以用如下方式设置
```
"build": "vue-cli-service build && node node_modules/web-sw-pack/index"
```


#### 使用案例 2

自定义过滤方法，比如只缓存js文件，可使用以下方式：

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


下面是完整参数示例：

```
module.exports = {
  name: 'sw',
  version: '0.0.1',
  cacheFlag: 'ServiceWorkerFlag', // 内容中含 ServiceWorkerFlag 字符串的文件，直接缓存
  excache: /(edit\/|\.map$)/,     // 不缓存 edit目录下的所有文件 和 .mp4 后缀的文件
  size: [0, 1024 * 1024 * 5],     // 只缓存 2m 以内的文件
  filter: function (cacheFiles, assets, next) {
    // 只缓存前五个文件
    cacheFiles.splice(0, cacheFiles.length - 3)

    // 遍历文件列表，可在此修改打包后的代码
    for (let url in assets) {
      console.log(url);
    }

    // 传入修改后的缓存文件列表
    next(cacheFiles)
  }
}
```


#### 参与贡献
blcyzycc

