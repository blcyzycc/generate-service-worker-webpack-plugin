/**
 * 生成 ServiceWorker 离线配置文件
 *
 * */

const fs = require('fs')
const path = require('path')


class GenerateServiceWorker {
  constructor(options = {}) {
    this.options = {}
    // .appcache 文件名称
    this.options.name = options.name || 'sw'
    // 应用版本号
    this.options.version = options.version || '1.0.0'
  }

  apply(compiler) {
    let This = this

    // 监听 emit 事件，因为发生 emit 事件时所有模块的转换和代码块对应的文件已经生成好，
    // 需要输出的资源即将输出，因此 emit 事件是修改 Webpack 输出资源的最后时机。
    compiler.plugin('emit', function (compilation, callback) {
      // 所有需要输出的资源会存放在 compilation.assets 中，
      // compilation.assets 是一个键值对，键为需要输出的文件名称，
      // 值为文件对应的操作方法
      // source() 返回文件内容
      // size() 返回文件大小。
      let name = This.options.name + '.js'
      let hash = compilation.hash.substring(0, 8)
      let cacheFiles = []

      // 遍历打包后的文件列表
      for (let key in compilation.assets) {
        if (/\.html$/.test(key)) {
          let source = compilation.assets[key].source()
          let url = key.split('/').map(() => '../').join('').replace('../', '') // 得到需要引入的文件相对于 html 文件的路径

          let swLinkJs = fs.readFileSync(path.join(__dirname, 'src/swLink.js'), 'utf-8').toString()

          // 插入 sw.js 路径
          swLinkJs = swLinkJs.replace(`@@SW_JS_PATH@@`, url + name)
          // 插入 index.html 路径
          swLinkJs = swLinkJs.replace(`@@INDEX_HTML_PATH@@`, key)
          // 插入 hash 值，用来判断 Service Worker 更新
          swLinkJs = swLinkJs.replace(`@@CACHE_HASH@@`, `@@CACHE_HASH=${hash}@@`)

          // 插入 sw.js 文件引入标签到 html 文件头部
          let html = source.replace(/(<\/head)/, `<script>${swLinkJs}</script>$1`)

          compilation.assets[key] = {
            source() {
              return html
            },
            size() {
              return html.length
            }
          }
        }

        if (!/\.map$/.test(key)) {
          cacheFiles.push(key)
        }
      }

      let swJs = fs.readFileSync(path.join(__dirname, 'src/sw.js'), 'utf-8').toString()

      // 插入版本号
      swJs = swJs.replace(`@@version@@`, `version ${This.options.version}`)
      // 插入缓存去名称
      swJs = swJs.replace(`'@@CACHE_NAME@@'`, `'cache_${hash}'`)
      // 插入需要离线缓存文件的路径集合
      swJs = swJs.replace(`'@@CACHE_FILES@@'`, `${JSON.stringify(cacheFiles)}`)

      // 添加 sw.js 文件，sw.js 文件将放在根目录下
      compilation.assets[name] = {
        source() {
          return swJs
        },
        size() {
          return swJs
        }
      }

      callback()
    })
  }
}

module.exports = GenerateServiceWorker