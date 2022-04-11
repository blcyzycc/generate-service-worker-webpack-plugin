window.SW_CACHE_HASH = '@@SW_CACHE_HASH@@';

(function () {
  // 注册 Service Worker
  if ('serviceWorker' in navigator) {
    document.onreadystatechange = function () {
      if (document.readyState === 'interactive' && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'openPage',
          hash: window.SW_CACHE_HASH,
        })
      }
    }

    navigator.serviceWorker.register('@@SW_JS_PATH@@', { scope: './' }).then(function (reg) {
      console.log('Service Worker');

      navigator.serviceWorker.addEventListener('message', function (event) {
        let data = event.data || {}

        if (data.type === 'swReload') {
          window.location.reload()
        }
        else if (data.type === 'swHash') {
          navigator.serviceWorker.controller.postMessage({
            type: 'swHash',
            hash: window.SW_CACHE_HASH,
          })
        }
      })
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
