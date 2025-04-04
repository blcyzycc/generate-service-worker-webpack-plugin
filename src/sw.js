/**
 * Service Worker
 * */

// 缓存区名称，打包时传入，值为字符串
const SW_CACHE_HASH = '@@SW_CACHE_HASH@@'

// sw.js 文件名称
const SW_JS_NAME = '@@SW_JS_NAME@@'

// 项目目录地址，根据 sw.js 运行路径得出
const PUBLIC_URL = self.serviceWorker.scriptURL.replace(SW_JS_NAME, '')

// 需要离线缓存的文件，在参与打包时会替换为形如 ['index.html', 'js/index.js'] 的数组
const SW_CACHE_FILES = '@@SW_CACHE_FILES@@'

// 上次检查更新的时间
let updateTime = 0

// 检查有效时间
let effectiveTime = '@@SW_EFFECTIVE_TIME@@'

// 当前活动的窗口的id
let nowClientId = ''

// 与页面是否关联，向页面发送 message，如果页面 500ms 内没有响应，说明页面与 se.js 无关联
let swRespond = false

const verifyHash = function () {
  // 一段时间内不要重复检查更新
  if (Date.now() - updateTime < effectiveTime) return;
  updateTime = Date.now()

  fetch('@@SW_HASH_FILE_PATH@@', {
    headers: {
      'SW_NO_CACHE': 'true',
      'Cache-Control': 'no-cache',
      'Expires': 0,
    },
  }).then(function (res) {
    return res.blob()
  }).then(function (blob) {
    let render = new FileReader()
    render.readAsText(blob, 'utf8')
    render.onload = function () {
      let hash = render.result

      // hash 不存在，或与已改变
      if (!hash || SW_CACHE_HASH !== hash) {
        console.log('版本更新：' + SW_CACHE_HASH + '==>' + hash);

        // 删除缓存，注销 Service Worker，并刷新页面
        caches.delete(SW_CACHE_HASH).then(function () {
          self.registration.unregister().then(function () {
            self.clients.get(nowClientId).then(function (client) {
              // 刷新页面
              client.postMessage({
                type: 'swReload',
                hash: '',
              })
            })
          })
        })
      } else {
        if (nowClientId) {
          self.clients.get(nowClientId).then(function (client) {
            waitPageRespond()

            // 向页面发送消息，获取 页面的 hash
            client.postMessage({
              type: 'swHash',
              hash: SW_CACHE_HASH,
            })
          })
        }
      }
    }
  }).catch(function (err) {
    // 请求不到 sw.hash，先注销 Service Worker，因为用户可能放弃使用 Service Worker
    if (err.message === 'Failed to fetch') {
      self.registration.unregister()
      // 如果客户端网络正常，连缓存都清掉
      if (self.navigator.onLine) {
        caches.delete(SW_CACHE_HASH)
      }
    }
  })
}

// 页面是否响应
const waitPageRespond = function () {
  swRespond = true
  // 一段时间后检查页面是否响应，swRespond 还为真，说明页面无关联
  setTimeout(function () {
    if (swRespond) {
      // console.log('页面无响应，删除缓存，并注销 Service Worker');
      // 删除缓存，并注销 Service Worker
      caches.delete(SW_CACHE_HASH).then(function () {
        self.registration.unregister()
      })
    }
  }, 500)
}

// 缓存静态资源，install 事件是 SW 触发的第一个事件，并且仅触发一次。
self.addEventListener('install', function (evt) {
  // console.log('-----------------install-----------------');

  // 让新的 service-worker 安装后立即变为激活状态
  self.skipWaiting()

  // 立即缓存全部指定的文件
  // evt.waitUntil(caches.open(SW_CACHE_HASH).then(function (cache) {
  //   return cache.addAll(SW_CACHE_FILES)
  // }))
})

/* 当此 sw.js 激活时触发 */
self.addEventListener('activate', function (evt) {
  // console.log('-----------------activate-----------------');

  // 清空所有缓存
  // evt.waitUntil(caches.keys().then(cacheNames => Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)))))

  // 更新，删除以前的缓存区文件，保留当前的
  evt.waitUntil(caches.keys().then(function (cacheNames) {
    return Promise.all(cacheNames.filter(function (cacheName) {
      return cacheName != SW_CACHE_HASH
    }).map(function (cacheName) {
      return caches.delete(cacheName)
    }));
  }));

  // 向所有窗口发消息
  // self.clients.matchAll().then((clients) => {
  //   console.log('self.clients.matchAll', clients);
  //   for (let i = 0; i < clients.length; i++) {
  //     clients[i].postMessage('xxx')
  //   }
  // });
})

self.addEventListener('message', function (evt) {
  let data = evt.data || {}
  nowClientId = evt.source.id

  // 第一次进入页面
  if (data.type === 'openPage') {
    verifyHash()
  }
  // 验证 hash 是否相同
  else if (data.type === 'swHash') {
    swRespond = false
    if (data.hash !== SW_CACHE_HASH) {
      caches.delete(SW_CACHE_HASH).then(function () {
        self.registration.unregister()
      })
    }
  }
})

/* 拦截浏览器发出的的请求文件申请，根据条件判断返回缓存文件还是进行网络请求 */
self.addEventListener('fetch', function (evt) {
  let clientId = evt.clientId || evt.resultingClientId

  // 如果用户放弃使用此npm，则由此处触发 verifyHash 方法
  if (clientId !== nowClientId) {
    nowClientId = clientId
    setTimeout(function () {
      verifyHash()
    }, 500)
  }

  evt.respondWith(
    caches.match(evt.request).then(function (response) {
      let SW_NO_CACHE = evt.request.headers.get('SW_NO_CACHE')

      if (response && SW_NO_CACHE !== 'true') {
        return response
      }

      return fetch(evt.request).then(function (res) {
        // 注意：跨域资源 res.url 为空，因此跨域资源不会缓存
        let url = res.url || ''
        let LastModified = res.headers.get('Last-Modified') // 一般返回文件才有 LastModified
        let contentType = res.headers.get('Content-Type') || ''

        if (evt.request.method === 'GET') {
          let ext = url.split('.').pop()
          let cache = false

          // 返回的 html 文件，并且 url 不是文件路径，直接缓存页面
          if (contentType.indexOf('text/html') >= 0 && /\/[^.]+$/.test(url)) {
            cache = true
          }
          // 其它文件需要匹配 SW_CACHE_FILES 中的路径决定是否缓存
          else if (LastModified) {
            cache = SW_CACHE_FILES.includes(url.replace(PUBLIC_URL, ''))

            if (cache) {
              if (ext === 'js' && !contentType.includes('application/javascript')) {
                cache = false
              }
              else if (ext === 'css' && !contentType.includes('text/css')) {
                cache = false
              }
            }
          }
          if (cache) {
            caches.open(SW_CACHE_HASH).then(function (cache) {
              cache.put(evt.request, res)
            })
          }
        }
        return res.clone()
      })
    })
  );
});
