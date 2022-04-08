/**
 * 生成 ServiceWorker 离线配置文件
 *
 * */

const fs = require('fs')
const path = require('path')
const { minify } = require('terser')

class GenerateServiceWorkerWebpackPlugin {
  constructor(options = {}) {
    this.options = {}
    // .appcache 文件名称
    this.options.name = options.name || 'sw'
    // 应用版本号
    this.options.version = options.version || ''
    // 包含有 SW_CACHE_HASH 值的文件的路径，可以提供完整的 href 链接，不指定则默认为当前渲染页面的 html 文件
    this.options.publicUrl = options.publicUrl || ''
    // 此正则匹配到的文件，不进行缓存
    this.options.excache = options.excache || null
    // 包含此字符串的文件，不进行缓存
    this.options.cacheFlag = options.cacheFlag || ''
    // 只缓存文件大小在此范围内的文件，默认最大缓存文件 1024M
    this.options.size = options.size || [0, 1024 * 1024 * 10]
    // 有效时间，在此时间内不检查更新。防止用户清除 SW_CACHE_HASH 导致页面无限刷新，默认 30s
    this.options.time = options.time !== undefined ? options.time : 30000
    // 提供自定义过滤方法
    this.options.filter = options.filter

    // 添加末尾的 /
    if (this.options.publicUrl) {
      this.options.publicUrl = this.options.publicUrl.replace(/(\/$|$)/, '/')
    }
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
      let hash = compilation.hash.substring(0, 8) + This.options.version
      let hashFileName = this.options.name + '.hash'
      let cacheFiles = []

      // 遍历打包后的文件列表
      for (let key in compilation.assets) {
        let source = compilation.assets[key].source()

        if (/\.html$/.test(key)) {
          let publicPath = compiler.options.output.publicPath // 得到需要引入的文件相对于 html 文件的路径
          let swLinkJs = fs.readFileSync(path.join(__dirname, 'src/swLink.js'), 'utf-8').toString()

          // 写入 sw.js 的路径
          swLinkJs = swLinkJs.replace(`@@SW_JS_PATH@@`, publicPath + name)
          // 写入 sw.hash.js 的路径
          swLinkJs = swLinkJs.replace(`@@SW_HASH_FILE_PATH@@`, publicPath + hashFileName)
          // 写入 hash 值，用来判断 Service Worker 更新
          swLinkJs = swLinkJs.replace(`@@SW_CACHE_HASH@@`, hash)
          // 写入有效时间
          swLinkJs = swLinkJs.replace(`'@@SW_EFFECTIVE_TIME@@'`, This.options.time)
          // 去除多余的换行和空格
          // swLinkJs = swLinkJs.replace(/\n(\s|\t)+/gm, '\n')
          // 压缩代码
          let swLinkJsMin = await minify(swLinkJs)

          // 将 sw.js 标签，插入 html 文件头部
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

      // 写入缓存去名称
      swJs = swJs.replace(`'@@SW_CACHE_NAME@@'`, `'${hash}'`)
      // 写入项目目录路径
      swJs = swJs.replace(`@@PUBLIC_URL@@`, This.options.publicUrl)
      // 写入需要离线缓存文件的路径集合
      swJs = swJs.replace(`'@@SW_CACHE_FILES@@'`, `${JSON.stringify(cacheFiles)}`)

      // 压缩代码
      let swJsMin = await minify(swJs)
      swJsMin.code = `// @@SW_CACHE_HASH=${hash}@@\n` + swJsMin.code

      // 添加 sw.js 文件，sw.js 文件将放在根目录下
      compilation.assets[name] = {
        source() {
          return swJsMin.code
        },
        size() {
          return swJsMin.code.length
        }
      }

      let swHashJs = `${hash}`

      // 添加 sw.hash.js 文件，sw.hash.js 文件将放在根目录下
      compilation.assets[hashFileName] = {
        source() {
          return swHashJs
        },
        size() {
          return swHashJs.length
        }
      }

      callback()
    })
  }
}

module.exports = GenerateServiceWorkerWebpackPlugin