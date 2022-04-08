window.SW_CACHE_HASH = '@@SW_CACHE_HASH@@';

(function () {
  // 注册 Service Worker
  if ('serviceWorker' in navigator) {
    var clear = localStorage.clear

    // 改写 localStorage.clear 方法，确保永久记录用户每次刷新的时间
    localStorage.clear = function () {
      var TIME = localStorage.getItem('SW_CACHE_HASH_TIME')
      clear.call(localStorage)
      localStorage.setItem('SW_CACHE_HASH_TIME', TIME)
    }

    navigator.serviceWorker.register('@@SW_JS_PATH@@', { scope: './' }).then(function (reg) {
      console.log('Service Worker 注册成功');

      // 有效时间内不重复检查更新，防止某些情况导致页面无限执行 reload 方法
      if (Date.now() - localStorage.getItem('SW_CACHE_HASH_TIME') < '@@SW_EFFECTIVE_TIME@@') return;
      localStorage.setItem('SW_CACHE_HASH_TIME', Date.now())

      window.SW_CACHE_HASH_UPDATE = function (hash) {
        if (window.SW_CACHE_HASH !== hash) {
          console.log('项目更新：' + window.SW_CACHE_HASH + '!==' + hash)
          reg.unregister()
          location.reload()
        }
      }

      var script = document.createElement('script')
      script.setAttribute('src', '@@SW_HASH_JS_PATH@@')
      document.head.appendChild(script)

    }).catch(function (err) {
      // 注册失败:
      console.log('Service Worker 注册失败', err)
    });
  }
})();
