/**
 * Service Worker 离线缓存
 * @@version@@
 * */

// 缓存区名称，打包时传入，值为字符串
var SW_CACHE_NAME = '@@SW_CACHE_NAME@@'

// 项目目录地址
var PUBLIC_URL = '@@PUBLIC_URL@@'

// 需要离线缓存的文件，在参与打包时会替换为形如 ['index.html', 'js/index.js'] 的数组
var SW_CACHE_FILES = '@@SW_CACHE_FILES@@'

/*
install 事件是 SW 触发的第一个事件，并且仅触发一次。
installEvent.waitUntil()接收一个 Promise 参数，用它来表示 SW 安装的成功与否。
*/
// 缓存静态资源
self.addEventListener('install', function (evt) {
  // 强制更新sw.js
  // self.skipWaiting()
  // evt.waitUntil(caches.open(SW_CACHE_NAME).then(function (cache) {
  //   return cache.addAll(SW_CACHE_FILES)
  // }))
})

/* 当 sw.js 发生改变时触发 */
self.addEventListener('activate', function (event) {
  event.waitUntil(
    // 遍历所有 caches 中缓存的 keys 值
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        // SW_CACHE_NAME 更新，删除以前的缓存区文件
        cacheNames.filter(function (cacheName) {
          return cacheName != SW_CACHE_NAME
        }).map(function (cacheName) {
          return caches.delete(cacheName)
        })
      );
    })
  );
})

/* 拦截浏览器发出的的请求文件申请，根据条件判断返回缓存文件还是进行网络请求 */
self.addEventListener('fetch', function (event) {
  event.respondWith(
    caches.match(event.request).then(function (response) {
      if (response) {
        return response
      }

      return fetch(event.request).then(function (res) {
        // res.headers.get('Content-Type')
        // res.headers.get('Last-Modified')

        // 注意：跨域资源 res.url 为空，因此跨域资源不会缓存
        var url = res.url || ''
        var contentType = res.headers.get('Content-Type')

        if (event.request.method === 'GET') {
          var cache = false

          // 直接缓存 html 页面，防止不同形式的响应
          if (contentType.indexOf('text/html') >= 0) {
            cache = true
          }
          // 其它文件需要匹配 SW_CACHE_FILES 中的路径决定是否缓存
          else {
            // 如果提供了项目目录地址，则直接使用绝对路径匹配
            if (PUBLIC_URL) {
              cache = SW_CACHE_FILES.includes(url.replace(PUBLIC_URL, ''))
            }
            // 没有提供项目目录地址，就只能对比部分文件路径，可能导致重名文件错误缓存（一般打包不会出现这种情况）
            // 如下面的两个路径，
            // http://localhost:3000/js/index.js
            // http://localhost:3000/util/js/index.js
            else {
              for (var i = 0; i < SW_CACHE_FILES.length; i++) {
                var reg = new RegExp(SW_CACHE_FILES[i] + '$', '')
                if (reg.test(url)) {
                  cache = true
                  break
                }
              }
            }
          }
          if (cache) {
            caches.open(SW_CACHE_NAME).then(function (cache) {
              cache.put(event.request, res)
            })
          }
        }

        return res.clone()
      })
    })
  );
});
