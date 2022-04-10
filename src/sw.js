/**
 * Service Worker
 * */

// 缓存区名称，打包时传入，值为字符串
let SW_CACHE_NAME = '@@SW_CACHE_NAME@@'

// 项目目录地址，根据 sw.js 运行路径得出
let PUBLIC_URL = self.location.href.replace(self.location.pathname, '/')

// 需要离线缓存的文件，在参与打包时会替换为形如 ['index.html', 'js/index.js'] 的数组
let SW_CACHE_FILES = '@@SW_CACHE_FILES@@'

// fetch 请求文件次数
let fetchNum = 0

// 上次检查更新的时间
let updateTime = Date.now()

// index.html 根页面的url
let nowClient = ''

let verifyHash = function () {
  console.log('verifyHash');

  // 一段时间内不要重复检查更新
  if (Date.now() - updateTime < 1000) return;

  fetch('@@SW_HASH_FILE_PATH@@', {
    headers: {
      'SW_NO_CACHE': 'true',
      'Cache-Control': 'no-cache',
      'Expires': 0,
    },
  }).then(function (res) {
    return res.blob()
  }).then(function (blob) {
    updateTime = Date.now()

    let render = new FileReader()
    render.readAsText(blob, 'utf8')
    render.onload = function () {
      let hash = render.result

      console.log('verifyHash', SW_CACHE_NAME, hash);

      // self.clients.matchAll().then((clients) => {
      //   console.log('self.clients.matchAll', clients);
      //   for (let i = 0; i < clients.length; i++) {
      //     clients[i].postMessage('swReload')
      //   }
      // });

      setTimeout(() => {
        console.log('ggg', nowClient);
        if (nowClient) {
          nowClient.postMessage('swReload')
        }
      }, 2000)

      // if (!hash || SW_CACHE_NAME !== hash) {
      //   self.clients.matchAll().then((clients) => {
      //     clients.forEach((client) => {
      //       client.postMessage('swReload')
      //     });
      //   });
      // }
    }
  }).catch(function (err) {
    // 请求不到 sw.hash，先注销 Service Worker，可能已经放弃使用 Service Worker
    if (err.message === 'Failed to fetch') {
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage('swHashFailed')
        });
      });
    }
  })
}

// 缓存静态资源，install 事件是 SW 触发的第一个事件，并且仅触发一次。
self.addEventListener('install', function (evt) {
  console.log('-----------------install-----------------');
  // 让新的 service-worker 安装后立即变为激活状态
  self.skipWaiting()

  // 立即缓存指定的文件
  // evt.waitUntil(caches.open(SW_CACHE_NAME).then(function (cache) {
  //   return cache.addAll(SW_CACHE_FILES)
  // }))
})

/* 当此 sw.js 激活时触发 */
self.addEventListener('activate', function (evt) {
  console.log(self);
  console.log('-----------------activate-----------------');

  // setTimeout(() => {
  //   console.log('注销---------');
  //   self.registration.unregister()
  // }, 1000)

  // 清空所有缓存
  // evt.waitUntil(caches.keys().then(cacheNames => Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)))))
  // evt.waitUntil(
  //   // 遍历所有 caches 中缓存的 keys 值
  //   caches.keys().then(function (cacheNames) {
  //     return Promise.all(
  //       // SW_CACHE_NAME 更新，删除以前的缓存区文件
  //       cacheNames.filter(function (cacheName) {
  //         return cacheName != SW_CACHE_NAME
  //       }).map(function (cacheName) {
  //         return caches.delete(cacheName)
  //       })
  //     );
  //   })
  // );

  // // 卸载所有 Service Worker
  // self.registration.unregister()
  //   .then(() => self.clients.matchAll())
  //   .then((clients) => clients.forEach(client => client.navigate(client.url)))
})

self.addEventListener('message', function (evt) {
  console.log(5555, evt);
})

/* 拦截浏览器发出的的请求文件申请，根据条件判断返回缓存文件还是进行网络请求 */
self.addEventListener('fetch', function (evt) {
  evt.respondWith(
    caches.match(evt.request).then(function (response) {
      let SW_NO_CACHE = evt.request.headers.get('SW_NO_CACHE')
      let contentType = ''

      if (response && SW_NO_CACHE !== 'true') {
        contentType = response.headers.get('Content-Type') || ''
        let clientId = evt.clientId || evt.resultingClientId
        if (contentType.indexOf('text/html') >= 0 && clientId) {
          console.log('clientId', clientId);
          self.clients.get(clientId).then(function (client) {
            nowClient = client
            verifyHash()
          })
        }
        return response
      }

      return fetch(evt.request).then(function (res) {
        // 注意：跨域资源 res.url 为空，因此跨域资源不会缓存
        let url = res.url || ''
        // let href = res.url.split('#')[0].split('?')[0]
        // 一般返回文件才有 LastModified
        let LastModified = res.headers.get('Last-Modified')
        contentType = res.headers.get('Content-Type') || ''

        // console.log('fetch', fetchNum, evt.request);

        if (evt.request.method === 'GET') {
          let ext = url.split('.').pop()
          let cache = false

          // 请求的是当前页面，直接缓存 html 页面
          if (fetchNum === 0 && contentType.indexOf('text/html') >= 0) {
            cache = true
            fetchNum++
          }
          // 其它文件需要匹配 SW_CACHE_FILES 中的路径决定是否缓存
          else if (LastModified) {
            // // 如果提供了项目目录地址，则直接使用绝对路径匹配
            // if (PUBLIC_URL) {
            //   cache = SW_CACHE_FILES.includes(url.replace(PUBLIC_URL, ''))
            // }
            // // 没有提供项目目录地址，就只能对比部分文件路径，可能导致重名文件错误缓存（一般打包不会出现这种情况）
            // // 如下面的两个路径，
            // // http://localhost:3000/js/index.js
            // // http://localhost:3000/util/js/index.js
            // else {
            //   for (let i = 0; i < SW_CACHE_FILES.length; i++) {
            //     let reg = new RegExp(SW_CACHE_FILES[i] + '$', '')
            //     if (reg.test(url)) {
            //       cache = true
            //       break
            //     }
            //   }
            // }
            cache = SW_CACHE_FILES.includes(url.replace(PUBLIC_URL, ''))

            if (cache) {
              if (ext === 'js' && !contentType.includes('application/javascript')) {
                // console.log('js响应文件格式不对', contentType);
                cache = false
              }
              else if (ext === 'css' && !contentType.includes('text/css')) {
                // console.log('css响应文件格式不对', contentType);
                cache = false
              }
            }
          }
          if (cache) {
            caches.open(SW_CACHE_NAME).then(function (cache) {
              cache.put(evt.request, res)
            })
          }
        }
        return res.clone()
      })
    })
  );
});
