package com.local.ktv

import android.content.Context
import android.util.Log
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

/**
 * 歌曲 API 客户端 —— JS 热更新桥接
 * =================================
 * - 通过 KtvJsBridge 调用 Gitee 上的 JS 脚本
 * - API 变更时只需更新 Gitee JS 文件，App 无需发版
 * - 首次播放时实时获取 URL，不存在过期问题
 */
object SongApiClient {
    private const val TAG = "SongApiClient"

    private var bridge: KtvJsBridge? = null
    private var ready = false

    @JvmStatic
    fun init(context: Context) {
        if (bridge != null) return
        bridge = KtvJsBridge(context)
        bridge?.init { ok ->
            ready = ok
            Log.i(TAG, "JS Bridge init: $ok")
        }
    }

    /** 兼容旧接口 */
    @JvmStatic
    fun init(sn: String, mac: String) {
        // JS 脚本自己生成 MAC/SN
    }

    @JvmStatic
    fun getAuthToken(): String = ""

    @JvmStatic
    fun getSongDownloadUrl(musicno: String?): String? =
        musicno?.takeIf(String::isNotBlank)?.let { getSongDownloadUrl(it, "720", false) }

    @JvmStatic
    fun getSongDownloadUrl(musicno: String, resolution: String, h265: Boolean): String? {
        if (!ready || bridge == null) {
            Log.w(TAG, "Bridge not ready")
            return null
        }
        // 全部走 JS Bridge 实时获取
        val result = AtomicReference<String?>()
        val latch = CountDownLatch(1)
        bridge?.getSongUrl(musicno) { url ->
            result.set(url)
            latch.countDown()
        }
        try { latch.await(15, TimeUnit.SECONDS) }
        catch (_: InterruptedException) {}
        return result.get()
    }

    @JvmStatic
    fun clearTokenCache() {}
}
