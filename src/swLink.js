window.SW_CACHE_HASH = '@@SW_CACHE_HASH@@';

(function () {
  // 注册 Service Worker
  if ('serviceWorker' in navigator) {
    var clear = localStorage.clear

    // 改写 localStorage.clear 方法，防止用户进入应用执行 clear 导致 SW_CACHE_HASH 丢失，重复刷新页面
    localStorage.clear = function () {
      var HASH = localStorage.getItem('SW_CACHE_HASH')
      var TIME = localStorage.getItem('SW_CACHE_HASH_TIME')
      clear.call(localStorage)
      localStorage.setItem('SW_CACHE_HASH', HASH)
      localStorage.setItem('SW_CACHE_HASH_TIME', TIME)
    }

    window.addEventListener('load', function () {
      navigator.serviceWorker.register('@@SW_JS_PATH@@', { scope: './' }).then(function (reg) {
        console.log('Service Worker 成功');

        // 获取当前页面文件流，再根据 SW_CACHE_HASH 判断页面是否已经更新
        // 如果页面已更新，则刷新 sw 和 页面
        var headers = new Headers()

        headers.append('SW_NO_CACHE', 'true') // 设置请求头，用于 fetch 请求拦截判断，从网络请求文件，不取缓存
        headers.append('Pragma', 'no-cache')
        headers.append('Cache-Control', 'no-cache')
        headers.append('Expires', '0') // 过期时间为 0 表示立即过期

        fetch('@@INDEX_HTML_PATH@@', {
          headers: headers,
        }).then(function (res) {
          return res.blob()
        }).then(function (blob) {
          var render = new FileReader()
          render.readAsText(blob, 'utf8')

          render.onload = function () {
            var r = new RegExp('@' + '@SW_CACHE_HASH=([^@]*)@' + '@')
            var match = render.result.match(r)

            // 一分钟内不重复刷新
            if (Date.now() - localStorage.getItem('SW_CACHE_HASH_TIME') < 60000) return;
            localStorage.setItem('SW_CACHE_HASH_TIME', Date.now())

            if (match && match[1]) {
              var hash = match[1]
              if (hash !== localStorage.getItem('SW_CACHE_HASH')) {
                localStorage.setItem('SW_CACHE_HASH', hash)
                reg.unregister()
                location.reload()
              }
            }
            else {
              localStorage.removeItem('SW_CACHE_HASH')
              reg.unregister()
              location.reload()
            }
          }
        })
      }).catch(function (err) {
        // 注册失败:
        console.log('Service Worker 注册失败', err)
      });
    });
  }
})();
