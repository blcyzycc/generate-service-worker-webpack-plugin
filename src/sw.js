/**
 * Service Worker 离线缓存
 * @@version@@
 * */

// 缓存区名称，打包时传入，值为字符串
var SW_CACHE_NAME = '@@SW_CACHE_NAME@@'

// 需要离线缓存的文件，在参与打包时会替换为形如 ['index.html', 'js/index.js'] 的数组
var SW_CACHE_FILES = '@@SW_CACHE_FILES@@'


/*
install 事件是 SW 触发的第一个事件，并且仅触发一次。
installEvent.waitUntil()接收一个 Promise 参数，用它来表示 SW 安装的成功与否。
*/
this.addEventListener('install', function (event) {
  console.log('Service Worker install')

  // 调试时跳过等待过程
  // self.skipWaiting();

  // 立即缓存 SW_CACHE_FILES 列表中的所有文件
  // 会导致第一次进入应用加载缓慢，慎用
  // event.waitUntil(
  //   caches.open(SW_CACHE_NAME).then(function (cache) {
  //     return cache.addAll(SW_CACHE_FILES)
  //   }).catch(function (err) {
  //     console.log(err)
  //   })
  // );
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
});

/* 拦截浏览器发出的的请求文件申请，根据情况进行返回 */
self.addEventListener('fetch', function (event) {
  var SW_NO_CACHE = event.request.headers.get('SW_NO_CACHE')

  event.respondWith(
    caches.match(event.request).then(function (response) {
      if (response && SW_NO_CACHE !== 'true') {
        // console.log('有缓存，返回缓存文件', event.request.url);
        return response
      } else {
        // console.log('没有缓存，返回网络文件', event.request.url);
        return fetch(event.request).then(function(res) {
          // 缓存文件
          if (event.request.method === 'GET') {
            // 注意：跨域资源 url 为空，所以跨域资源不会缓存
            var url = res.url || ''
            var mt = url.match(/^https?:\/\/[^\/]+/)

            if (mt && mt[0]) {
              // 如果的响应 url 是文件格式，并且路径在 SW_CACHE_FILES 中，则缓存文件
              if (/.+\..+$/.test(url) && SW_CACHE_FILES.includes(url.replace(mt[0] + '/', ''))) {
                caches.open(SW_CACHE_NAME).then(function (cache) {
                  cache.put(event.request, res)
                }).catch(function (err) {
                  console.log(err)
                })
              }
            }
          }

          return res.clone()
        })
      }
    })
  );
});
