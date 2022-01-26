'@@CACHE_HASH@@';

// 注册 Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('@@SW_JS_PATH@@', { scope: './' }).then(function (reg) {
      console.log('Service Worker 成功');

      // 获取当前页面文件流，再根据 CACHE_HASH 判断页面是否已经更新
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
          var r = new RegExp('@' + '@CACHE_HASH=(.*)@' + '@')
          var match = render.result.match(r)

          if (match && match[1]) {
            var hash = match[1]

            if (hash !== localStorage.getItem('CACHE_HASH')) {
              localStorage.setItem('CACHE_HASH', hash)
              reg.unregister()
              window.location.reload()
            }
          }
        }
      })
    }).catch(function (err) {
      // 注册失败:
      console.log('Service Worker 注册失败', err)
    });
  });
}