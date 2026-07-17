package com.local.ktv

import android.content.Context
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

/**
 * JS 热更新桥接层
 * ===============
 * 1. 加载 assets/ktv_api.js (本地默认版本)
 * 2. 定期检查 Gitee 更新 → 替换缓存版本
 * 3. 通过 WebView.evaluateJavascript 调用 JS 函数
 *
 * 用法:
 *   val bridge = KtvJsBridge(context)
 *   bridge.init { success ->
 *       if (success) bridge.getSongUrl("7678785") { url -> ... }
 *   }
 */
class KtvJsBridge(private val context: Context) {
    companion object {
        private const val TAG = "KtvJsBridge"
        private const val JS_FILE = "mobile/ktv_api.js"
        private const val CACHE_FILE = "ktv_api_cache.js"
        // Gitee 上的最新版本 URL
        private const val REMOTE_JS_URL = "https://gitee.com/yangyachao-X/maidong-ktv/raw/master/app/src/main/assets/mobile/ktv_api.js"
    }

    private var webView: WebView? = null
    private var ready = false

    /**
     * 初始化：加载 JS → 创建 API 实例 → MWS 登录 → 获取 Token
     */
    fun init(callback: (Boolean) -> Unit) {
        val js = loadJs()
        webView = WebView(context).apply {
            settings.javaScriptEnabled = true
            addJavascriptInterface(JsLogger(), "android")
            loadDataWithBaseURL(null, wrapHtml(js), "text/html", "UTF-8", null)
        }
        // 等待 WebView 加载完成后初始化
        webView?.postDelayed({
            eval("""
                try {
                    window.api = new KtvApi({debug: true});
                    window.api.init().then(function(ok) {
                        android.log('JS init: ' + (ok ? 'OK' : 'FAIL'));
                    }).catch(function(e) {
                        android.log('JS init error: ' + e.message);
                    });
                } catch(e) {
                    android.log('JS exception: ' + e.message);
                }
            """.trimIndent())
            ready = true
            callback(true)
        }, 500)
    }

    /**
     * 获取歌曲下载地址
     */
    fun getSongUrl(musicno: String, callback: (String?) -> Unit) {
        if (!ready) {
            Log.w(TAG, "Bridge not ready")
            callback(null)
            return
        }
        val js = """
            window.api.getSongUrl('$musicno').then(function(url) {
                android.onUrlResult('$musicno', url || '');
            }).catch(function(e) {
                android.onUrlResult('$musicno', 'ERROR:' + e.message);
            });
        """.trimIndent()
        // 注册临时回调
        val tempBridge = object {
            @JavascriptInterface
            fun onUrlResult(mn: String, url: String) {
                Log.d(TAG, "URL for $mn: ${url.take(80)}")
                callback(url.takeIf { it.isNotEmpty() && !it.startsWith("ERROR") })
            }
        }
        webView?.addJavascriptInterface(tempBridge, "android")
        webView?.post { eval(js) }
    }

    /**
     * 从本地/Gitee 加载 JS
     */
    private fun loadJs(): String {
        // 1. 尝试用 Gitee 缓存版本
        val cacheFile = File(context.filesDir, CACHE_FILE)
        if (cacheFile.exists() && cacheFile.length() > 1000) {
            Log.d(TAG, "Using cached JS: ${cacheFile.length()} bytes")
            return cacheFile.readText()
        }
        // 2. 用 assets 中的默认版本
        try {
            val js = context.assets.open(JS_FILE).bufferedReader().use { it.readText() }
            Log.d(TAG, "Using asset JS: ${js.length} chars")
            // 异步更新缓存
            updateCache(cacheFile)
            return js
        } catch (e: Exception) {
            Log.e(TAG, "Failed to load JS asset", e)
            return "console.log('JS load failed')"
        }
    }

    /**
     * 异步从 Gitee 拉取最新 JS → 保存到缓存
     */
    private fun updateCache(cacheFile: File) {
        Thread {
            try {
                val url = URL(REMOTE_JS_URL)
                val conn = url.openConnection() as HttpURLConnection
                conn.connectTimeout = 10000
                conn.readTimeout = 15000
                conn.setRequestProperty("User-Agent", "KTV-Updater/1.0")
                if (conn.responseCode == 200) {
                    val js = conn.inputStream.bufferedReader().use { it.readText() }
                    if (js.length > 1000 && js.contains("KtvApi")) {
                        cacheFile.writeText(js)
                        Log.d(TAG, "JS updated from Gitee: ${js.length} chars")
                    }
                }
                conn.disconnect()
            } catch (e: Exception) {
                Log.w(TAG, "JS update failed: ${e.message}")
            }
        }.start()
    }

    private fun eval(js: String) {
        webView?.evaluateJavascript(js, null)
    }

    private fun wrapHtml(js: String): String = """
        <!DOCTYPE html><html><head><meta charset="utf-8"></head>
        <body><script>$js</script></body></html>
    """.trimIndent()

    /** JS → Android 日志 */
    inner class JsLogger {
        @JavascriptInterface
        fun log(msg: String) {
            Log.d(TAG, msg)
        }
    }

    fun destroy() {
        webView?.destroy()
        webView = null
        ready = false
    }
}
