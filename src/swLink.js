window.SW_CACHE_HASH = '@@SW_CACHE_HASH@@';

(function () {
  // 注册 Service Worker
  if ('serviceWorker' in navigator) {
    // var clear = localStorage.clear

    // 改写 localStorage.clear 方法，确保永久记录用户每次刷新的时间
    // localStorage.clear = function () {
    //   var TIME = localStorage.getItem('SW_CACHE_HASH_TIME')
    //   clear.call(localStorage)
    //   localStorage.setItem('SW_CACHE_HASH_TIME', TIME)
    // }

    navigator.serviceWorker.register('@@SW_JS_PATH@@', { scope: './' }).then(function (reg) {
      console.log('Service Worker');

      navigator.serviceWorker.addEventListener("message", function(event) {

        navigator.serviceWorker.controller.postMessage('swOver')

        if (event.data === 'swReload') {
          // 注销所有 Service Worker
          // navigator.serviceWorker.getRegistrations().then(function (registrations) {
          //   for (var i = 0; i < registrations.length; i++) {
          //     registrations[i].unregister()
          //   }
          // })
          // 清除所有的 caches
          // caches.keys().then(function (cacheNames) {
          //   cacheNames.map(function (cacheName) {
          //     return caches.delete(cacheName)
          //   })
          // })
          // setTimeout(function () {
          //   alert('更新')
          //   window.location.reload()
          // }, 1000)
        }
      })

      // 有效时间内不重复检查更新，防止某些情况导致页面无限执行 reload 方法
      // if (Date.now() - localStorage.getItem('SW_CACHE_HASH_TIME') < '@@SW_EFFECTIVE_TIME@@') return;
      // localStorage.setItem('SW_CACHE_HASH_TIME', Date.now())

      // fetch('@@SW_HASH_FILE_PATH@@', {
      //   headers: {
      //     'SW_NO_CACHE': 'true',
      //     'Cache-Control': 'no-cache',
      //     'Expires': 0,
      //   },
      // }).then(function (res) {
      //   return res.blob()
      // }).then(function (blob) {
      //   var render = new FileReader()
      //   render.readAsText(blob, 'utf8')
      //
      //   render.onload = function () {
      //     var hash = render.result
      //     if (!hash || window.SW_CACHE_HASH !== hash) {
      //       console.log('项目更新：' + window.SW_CACHE_HASH + ' ==> ' + hash)
      //       alert('项目更新')
      //       // 注销 Service Worker
      //       reg.unregister().finally(() => {
      //         // 刷新页面
      //         location.reload()
      //       })
      //     }
      //   }
      // }).catch(function (err) {
      //   // 网络正常，但请求不到 sw.hash，先注销 Service Worker，可能已经放弃使用 Service Worker
      //   if (navigator.onLine && err.message === 'Failed to fetch') {
      //     alert('网络正常，但请求不到 sw.hash，先注销 Service Worker')
      //     reg.unregister()
      //   }
      // })
    }).catch(function (err) {
      // 注册失败:
      console.log('Service Worker 注册失败', err)
      // 注销所有 Service Worker
      navigator.serviceWorker.getRegistrations().then(function (registrations) {
        for (var i = 0; i < registrations.length; i++) {
          registrations[i].unregister()
        }
      })
    });
  }
})();
