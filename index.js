/**
 * 生成 ServiceWorker 离线配置文件
 *
 * */

const fs = require('fs')
const path = require('path')
const { minify } = require('terser')
const { RawSource } = require('webpack-sources')

class GenerateServiceWorkerWebpackPlugin {
  constructor(options = {}) {
    this.options = {}
    // .appcache 文件名称
    this.options.name = options.name || 'sw'
    // 应用版本号
    this.options.version = options.version || ''
    // 此正则匹配到的文件，不进行缓存
    this.options.excache = options.excache || null
    // 包含此字符串的文件，不进行缓存
    this.options.cacheFlag = options.cacheFlag || ''
    // 只缓存文件大小在此范围内的文件，默认最大缓存文件 1024M
    this.options.size = options.size || [0, 1024 * 1024 * 10]
    // 有效时间，在此时间内不检查更新。防止用户清除 SW_CACHE_HASH 导致页面无限刷新，默认 10000ms
    this.options.time = options.time !== undefined ? options.time : 10000
    // 提供自定义过滤方法
    this.options.filter = options.filter

    this.options.time = Math.max(this.options.time, 0)
  }

  apply(compiler) {
    let This = this

    compiler.hooks.compilation.tap('GenerateServiceWorkerWebpackPlugin', (compilation) => {
      /* webpack.Compilation
      PROCESS_ASSETS_STAGE_ADDITIONAL: -2000,
      PROCESS_ASSETS_STAGE_PRE_PROCESS: -1000,
      PROCESS_ASSETS_STAGE_DERIVED: -200,
      PROCESS_ASSETS_STAGE_ADDITIONS: -100,
      PROCESS_ASSETS_STAGE_OPTIMIZE: 100,
      PROCESS_ASSETS_STAGE_OPTIMIZE_COUNT: 200,
      PROCESS_ASSETS_STAGE_OPTIMIZE_COMPATIBILITY: 300,
      PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE: 400,
      PROCESS_ASSETS_STAGE_DEV_TOOLING: 500,
      PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE: 700,
      PROCESS_ASSETS_STAGE_SUMMARIZE: 1000,
      PROCESS_ASSETS_STAGE_OPTIMIZE_HASH: 2500,
      PROCESS_ASSETS_STAGE_OPTIMIZE_TRANSFER: 3000,
      PROCESS_ASSETS_STAGE_ANALYSE: 4000,
      PROCESS_ASSETS_STAGE_REPORT: 5000
      */

      compilation.hooks.processAssets.tap({
          name: 'GenerateServiceWorkerWebpackPlugin',
          stage: 3000, // 可打印 webpack.Compilation 查看对应值
        },
        async (assets) => {
          let publicPath = compiler.options.output.publicPath // 得到需要引入的文件相对于 html 文件的路径
          let name = This.options.name + '.js'
          let hash = `${String(Math.random()).substring(2, 10)}_${This.options.version}`
          let hashFileName = this.options.name + '.hash'
          let cacheFiles = []

          // 遍历打包后的文件列表
          for (let key in assets) {
            let source = assets[key].source()

            if (typeof source === 'object') {
              source = source.toString('utf-8')
            }

            if (/\.html$/.test(key)) {
              let swLinkJs = fs.readFileSync(path.join(__dirname, 'src/swLink.js'), 'utf-8').toString()

              // 写入 sw.js 的路径
              swLinkJs = swLinkJs.replace(`@@SW_JS_PATH@@`, publicPath + name)
              // 写入 sw.hash.js 的路径
              swLinkJs = swLinkJs.replace(`@@SW_HASH_FILE_PATH@@`, publicPath + hashFileName)
              // 写入 hash 值，用来判断 Service Worker 更新
              swLinkJs = swLinkJs.replace(`@@SW_CACHE_HASH@@`, hash)
              // 去除多余的换行和空格
              // swLinkJs = swLinkJs.replace(/\n(\s|\t)+/gm, '\n')
              // 压缩代码
              let swLinkJsMin = await minify(swLinkJs)

              // 将 sw.js 标签，插入 html 文件头部
              let html = source.replace(/(<\/head)/, `<script>${swLinkJsMin.code}</script>$1`)

              assets[key] = new RawSource(html)
            }

            let size = assets[key].size()
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
            let cf = This.options.filter(cacheFiles, assets, RawSource)
            if (cf && cf instanceof Array) cacheFiles = cf
          }

          let swJs = fs.readFileSync(path.join(__dirname, 'src/sw.js'), 'utf-8').toString()

          // 写入缓存去名称
          swJs = swJs.replace(`@@SW_CACHE_HASH@@`, `${hash}`)
          // 写入项目目录路径
          // swJs = swJs.replace(`@@PUBLIC_URL@@`, This.options.publicUrl)
          // 写入需要离线缓存文件的路径集合
          swJs = swJs.replace(`'@@SW_CACHE_FILES@@'`, `${JSON.stringify(cacheFiles)}`)
          // 写入 sw.hash.js 的路径
          swJs = swJs.replace(`@@SW_JS_NAME@@`, name)
          // 写入 sw.hash.js 的路径
          swJs = swJs.replace(`@@SW_HASH_FILE_PATH@@`, publicPath + hashFileName)
          // 写入有效时间
          swJs = swJs.replace(`'@@SW_EFFECTIVE_TIME@@'`, This.options.time)

          // 压缩代码
          let swJsMin = await minify(swJs)

          // 添加 sw.js 文件，sw.js 文件将放在根目录下
          assets[name] = new RawSource(swJsMin.code)

          let swHashJs = `${hash}`

          // 添加 sw.hash.js 文件，sw.hash.js 文件将放在根目录下
          assets[hashFileName] = new RawSource(swHashJs)
        }
      )
    })
  }
}

module.exports = GenerateServiceWorkerWebpackPlugin