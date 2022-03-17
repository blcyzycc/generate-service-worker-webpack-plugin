/**
 * 生成 ServiceWorker 离线配置文件
 *
 * */

const fs = require('fs')
const path = require('path')
const { minify } = require("terser")

class GenerateServiceWorkerWebpackPlugin {
  constructor(options = {}) {
    this.options = {}
    // .appcache 文件名称
    this.options.name = options.name || 'sw'
    // 应用版本号
    this.options.version = options.version || '1.0.0'
    // 此正则匹配到的文件，不进行缓存
    this.options.excache = options.excache || null
    // 此正则匹配到的文件，不进行缓存
    this.options.cacheFlag = options.cacheFlag || ''
    // 只缓存文件大小在此范围内的文件，默认最大缓存文件 1024M
    this.options.size = options.size || [0, 1024 * 1024 * 10]
    // 提供自定义过滤方法
    this.options.filter = options.filter
  }

  apply(compiler) {
    let This = this

    // 监听 emit 事件，因为发生 emit 事件时所有模块的转换和代码块对应的文件已经生成好，
    // 需要输出的资源即将输出，因此 emit 事件是修改 Webpack 输出资源的最后时机。
    compiler.plugin('emit', async (compilation, callback) => {
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
        let source = compilation.assets[key].source()

        if (/\.html$/.test(key)) {
          // let publicPath = key.split('/').map(() => '../').join('').replace('../', '') // 得到需要引入的文件相对于 html 文件的路径
          let publicPath = compiler.options.output.publicPath // 得到需要引入的文件相对于 html 文件的路径

          let swLinkJs = fs.readFileSync(path.join(__dirname, 'src/swLink.js'), 'utf-8').toString()

          // 插入 sw.js 路径
          swLinkJs = swLinkJs.replace(`@@SW_JS_PATH@@`, publicPath + name)
          // 插入 index.html 路径
          swLinkJs = swLinkJs.replace(`@@INDEX_HTML_PATH@@`, key)
          // 插入 hash 值，用来判断 Service Worker 更新
          swLinkJs = swLinkJs.replace(`@@SW_CACHE_HASH@@`, `@@SW_CACHE_HASH=${hash}@@`)
          // 去除换行
          swLinkJs = swLinkJs.replace(/\n(\s|\t)+/gm, '\n')

          // 压缩代码
          let swLinkJsMin = await minify(swLinkJs)

          // 插入 sw.js 文件引入标签到 html 文件头部
          let html = source.replace(/(<\/head)/, `<script>${swLinkJsMin.code}</script>$1`)

          compilation.assets[key] = {
            source() {
              return html
            },
            size() {
              return html.length
            }
          }
        }


        let size = compilation.assets[key].size()
        let max = Math.max(...This.options.size)
        let min = Math.min(...This.options.size)

        // 文件大小范围控制，缓存范围内的
        if (size <= max && size >= min) {
          if (!This.options.excache) {
            cacheFiles.push(key)
          }
          // 文件名匹配 excache，匹配到的文件不缓存
          else if (!This.options.excache.test(key)) {
            cacheFiles.push(key)
          }
        }

        // 如果文件中包含 cacheFlag，则缓存文件
        if (This.options.cacheFlag && source.indexOf(This.options.cacheFlag) > -1) {
          if (!cacheFiles.includes(key)) cacheFiles.push(key)
        }
      }

      // 加入过滤函数，方便自定义筛选规则
      if (This.options.filter) {
        cacheFiles = This.options.filter(cacheFiles, compilation.assets)
      }

      let swJs = fs.readFileSync(path.join(__dirname, 'src/sw.js'), 'utf-8').toString()

      // 插入版本号
      swJs = swJs.replace(`@@version@@`, `version ${This.options.version}`)
      // 插入缓存去名称
      swJs = swJs.replace(`'@@SW_CACHE_NAME@@'`, `'cache_${hash}'`)
      // 插入需要离线缓存文件的路径集合
      swJs = swJs.replace(`'@@SW_CACHE_FILES@@'`, `${JSON.stringify(cacheFiles)}`)

      // 压缩代码
      let swJsMin = await minify(swJs)

      // 添加 sw.js 文件，sw.js 文件将放在根目录下
      compilation.assets[name] = {
        source() {
          return swJsMin.code
        },
        size() {
          return swJsMin.code.length
        }
      }

      callback()
    })
  }
}

module.exports = GenerateServiceWorkerWebpackPlugin