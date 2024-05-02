/**
 * 生成 ServiceWorker 离线配置文件
 *
 * */

const fs = require('fs')
const Path = require('path')
const { minify } = require('terser')
const cwd = process.cwd()
const args = process.argv.splice(2)

// 入参处理
const params = {
  // 项目文件目录
  output: 'dist',
  // 配置文件目录
  conf: 'sw.config.js',
}
const argsObj = {}
args.forEach(m => {
  let o = m.split('=')
  if (o[0] && o[1]) {
    argsObj[o[0]] = o[1]
  }
})
for (let key in params) {
  if (argsObj[key]) {
    params[key] = argsObj[key]
  }
}

params.conf = Path.join(cwd, params.conf)

let configErr = false
let config = {}

try {
  config = require(params.conf)
} catch (e) {
  configErr = true

  console.log(e);
  console.log(`No configuration files detected: ${params.conf}, using default configuration.`);
}


const options = {}
// .appcache 文件名称
options.name = config.name || 'sw'
// 应用版本号
options.version = config.version || '0.0.1'
// 此正则匹配到的文件，不进行缓存
options.excache = config.excache || null
// 包含此字符串的文件，不进行缓存
options.cacheFlag = config.cacheFlag || ''
// 只缓存文件大小在此范围内的文件，默认最大缓存文件 10M
options.size = config.size || [0, 1024 * 1024 * 10]
// 有效时间，在此时间内不检查更新。防止用户清除 SW_CACHE_HASH 导致页面无限刷新，默认 60s
options.time = config.time === undefined ? 60000 : config.time
// 提供自定义过滤方法
options.filter = config.filter
// 是否允许完全离线使用，默认 true，允许
options.offline = config.offline === undefined ? true : config.compress
// 是否压缩sw代码，默认 true，压缩
options.compress = config.compress === undefined ? true : config.compress

if (options.time < 0) {
  options.time = 0
}

const max = Math.max(...options.size)
const min = Math.min(...options.size)

const output = Path.normalize(Path.join(cwd, params.output))  // 项目文件绝对路径
const relative = Path.relative(cwd, output) // 项目文件相对命令运行时的路径
const swFile = options.name + '.js'
const hashFile = options.name + '.hash'
const hash = `${String(Math.random()).substring(2, 10)}_${options.version}`
const swFileAbs = Path.normalize(Path.join(output, swFile))
const htmlList = []

const assets = travelFiles(output)

const main = async () => {
  let cacheFiles = []

  // 遍历打包后的文件列表
  for (let key in assets) {
    let source = assets[key].source

    if (/\.html$/.test(key)) {
      let swLinkJs = fs.readFileSync(Path.join(__dirname, 'src/swLink.js'), 'utf-8').toString()
      let swFileRelative = Path.relative(Path.dirname(assets[key].pathAbs), swFileAbs).replace(/\\/g, '/')
      let hashFileRelative = Path.relative(Path.dirname(assets[key].pathAbs), swFileAbs).replace(/\\/g, '/')

      // 写入 sw.js 的路径
      swLinkJs = swLinkJs.replace(`@@SW_JS_PATH@@`, swFileRelative)
      // 写入 sw.hash.js 的路径
      swLinkJs = swLinkJs.replace(`@@SW_HASH_FILE_PATH@@`, hashFileRelative)

      // 写入 hash 值，用来判断 Service Worker 更新
      swLinkJs = swLinkJs.replace(`@@SW_CACHE_HASH@@`, hash)
      // 压缩代码
      let swLinkJsMin = await minify(swLinkJs)

      // 将 sw.js 代码块，插入 html 文件头部
      let html = source.replace(/(<\/head)/, `<script>${options.compress ? swLinkJsMin.code : swLinkJs}</script>$1`)
      fs.writeFileSync(assets[key].pathAbs, html)

      htmlList.push(key)
    }

    let size = assets[key].size

    // 文件大小范围控制，缓存范围内的
    if (size <= max && size >= min) {
      if (!options.excache) {
        cacheFiles.push(key)
      }
      // 文件名匹配 excache，匹配到的文件不缓存
      else if (!options.excache.test(key)) {
        cacheFiles.push(key)
      }
    }

    // 如果文件中包含 cacheFlag，则缓存文件
    if (options.cacheFlag && source.indexOf(options.cacheFlag) > -1) {
      if (!cacheFiles.includes(key)) cacheFiles.push(key)
    }
  }

  // 加入过滤函数，方便自定义筛选规则
  if (options.filter) {
    options.filter(cacheFiles, assets, (cacheFiles2, assets2) => {
      if (cacheFiles2 && cacheFiles2 instanceof Array) cacheFiles = cacheFiles2

      for (let url in assets2) {
        if (assets2[url].change) {
          fs.writeFileSync(assets[url].pathAbs, assets2[url].source)
        }
      }
    })
  }

  let swJs = fs.readFileSync(Path.join(__dirname, 'src/sw.js'), 'utf-8').toString()

  // 写入缓存去名称
  swJs = swJs.replace(`@@SW_CACHE_HASH@@`, `${hash}`)
  // 写入项目目录路径
  // swJs = swJs.replace(`@@PUBLIC_URL@@`, options.publicUrl)
  // 写入需要离线缓存文件的路径集合
  swJs = swJs.replace(`'@@SW_CACHE_FILES@@'`, `${JSON.stringify(cacheFiles)}`)
  // 写入 sw.js 文件名
  swJs = swJs.replace(`@@SW_JS_NAME@@`, swFile)
  // 写入 sw.hash.js 文件相对于 sw.js 文件的路径
  swJs = swJs.replace(`@@SW_HASH_FILE_PATH@@`, hashFile)
  // 写入有效时间
  swJs = swJs.replace(`'@@SW_EFFECTIVE_TIME@@'`, options.time)
  // 写入否能脱机使用
  swJs = swJs.replace(`'@@SW_OFFLINE@@'`, options.offline)

  // 压缩代码
  let swJsMin = await minify(swJs)

  // 添加 sw.js 文件，sw.js 文件将放在根目录下
  fs.writeFileSync(Path.join(relative, swFile), options.compress ? swJsMin.code : swJs)

  let swHashJs = `${hash}`
  // 添加 sw.hash.js 文件，sw.hash.js 文件将放在根目录下
  fs.writeFileSync(Path.join(relative, hashFile), swHashJs)

  console.log(`Service Worker 服务已注入：
${htmlList.join(' ')}
${swFile}
${hashFile}
${options.version}
`);

  if (configErr) {
    console.log(`未检测到配置文件，或配置文件出错，sw将使用默认配置。`);
  }
}

main()

/**
 * 读取目录，并返回所有文件路径
 * @param path
 * @return array
 * */
function travelFiles(path) {
  const filePath = {}
  const next = (p) => {
    try {
      fs.readdirSync(p).forEach(name => {
        let pathStr = p + '/' + name
        let info = fs.statSync(pathStr)
        if (info.isDirectory()) {
          next(pathStr)
        }
        else if (fs.statSync(pathStr).isFile()) {
          let relativePath = Path.relative(Path.resolve(path), Path.resolve(pathStr))
          let source = ''

          // 超过 100m 的文件不进行读取
          if (info.size <= 1024 * 1024 * 100) {
            source = fs.readFileSync(pathStr, 'utf8')
          }
          filePath[relativePath.replace(/\\/g, '/')] = {
            name: name,
            path: relativePath.replace(/\\/g, '/'),
            pathAbs: pathStr,
            source: source,
            size: info.size,
            change: false,
          }
        }
      })
    }
    catch (e) {
      console.log(e)
    }
  }
  next(path)

  return filePath
}
