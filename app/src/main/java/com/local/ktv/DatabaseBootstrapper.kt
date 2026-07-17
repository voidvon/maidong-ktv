package com.local.ktv

import org.json.JSONObject
import java.io.BufferedOutputStream
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicLong
import java.util.zip.GZIPInputStream

/** Downloads catalog chunks concurrently, verifies, decompresses and installs the database atomically. */
object DatabaseBootstrapper {
    private const val PARALLEL_DOWNLOADS = 4
    val manifestUrl: String get() = BuildConfig.GITEE_DATABASE_MANIFEST_URL
    private val token: String get() = BuildConfig.GITEE_DATABASE_TOKEN

    // -- version tracking ---------------------------------------------------

    private val versionFile: File get() = File(MuseDatabase.defaultDbFile().parentFile, "db_version.txt")

    /** Fetch the latest database version from the remote manifest (fast, ~1 KB). */
    fun fetchRemoteVersion(): String? = runCatching {
        JSONObject(readText(manifestUrl)).getString("version")
    }.getOrNull()

    /** Read the locally installed database version, or null if never downloaded. */
    fun getLocalDbVersion(): String? = runCatching {
        versionFile.takeIf { it.exists() }?.readText()?.trim()?.takeIf { it.isNotEmpty() }
    }.getOrNull()

    /** Persist the installed database version so we can skip re-download on next start. */
    private fun saveLocalDbVersion(version: String) {
        runCatching { versionFile.writeText(version.trim()) }
    }

    // -- download ------------------------------------------------------------

    fun download(onProgress: (Int) -> Unit): Result<File> = runCatching {
        val sourceManifestUrl = manifestUrl
        require(sourceManifestUrl.isNotBlank()) { "Gitee database URL is not configured" }
        val manifest = JSONObject(readText(sourceManifestUrl))
        val expectedCompressedSize = manifest.getLong("compressed_size")
        val expectedDecompressedSize = manifest.getLong("original_size")
        val expectedSha256 = manifest.optString("sha256", "")
        val filesJson = manifest.getJSONArray("files")
        require(filesJson.length() > 0) { "database manifest has no files" }

        val target = MuseDatabase.defaultDbFile()
        val temporaryGz = File(target.parentFile, "${target.name}.gz.download")
        val temporaryDb = File(target.parentFile, "${target.name}.download")
        val partsDir = File(target.parentFile, "${target.name}.parts")
        target.parentFile?.mkdirs()
        temporaryGz.delete()
        temporaryDb.delete()
        partsDir.deleteRecursively()
        check(partsDir.mkdirs()) { "cannot create database parts directory" }

        val urls = List(filesJson.length()) { index ->
            resolveUrl(sourceManifestUrl, filesJson.getJSONObject(index).getString("file"))
        }
        val written = AtomicLong(0L)
        val lastProgress = AtomicInteger(-1)
        val executor = Executors.newFixedThreadPool(PARALLEL_DOWNLOADS.coerceAtMost(urls.size))
        try {
            val futures = urls.mapIndexed { index, url ->
                executor.submit<File> {
                    val part = File(partsDir, "part-${index.toString().padStart(5, '0')}")
                    downloadPart(url, part) { count ->
                        val progress = (written.addAndGet(count.toLong()) * 80L /
                            expectedCompressedSize.coerceAtLeast(1L)).toInt().coerceIn(0, 80)
                        while (true) {
                            val previous = lastProgress.get()
                            if (progress <= previous || lastProgress.compareAndSet(previous, progress)) break
                        }
                        if (lastProgress.get() == progress) onProgress(progress)
                    }
                    part
                }
            }
            val parts = futures.map { it.get() }

            // Concatenate gzipped chunks into a single compressed file  (phase: 80-85%)
            onProgress(80)
            BufferedOutputStream(FileOutputStream(temporaryGz)).use { output ->
                parts.forEachIndexed { index, part ->
                    part.inputStream().buffered(256 * 1024).use { it.copyTo(output, 256 * 1024) }
                    onProgress(80 + (index + 1) * 5 / parts.size)
                }
            }

            check(temporaryGz.length() == expectedCompressedSize) {
                "compressed size mismatch: ${temporaryGz.length()} != $expectedCompressedSize"
            }

            // Decompress the concatenated gzip file to produce the SQLite database  (phase: 85-99%)
            onProgress(85)
            var decompressBytes = 0L
            var lastDecompressPct = 85
            GZIPInputStream(temporaryGz.inputStream().buffered(256 * 1024)).use { gzInput ->
                BufferedOutputStream(FileOutputStream(temporaryDb)).use { dbOutput ->
                    val buffer = ByteArray(256 * 1024)
                    while (true) {
                        val count = gzInput.read(buffer)
                        if (count < 0) break
                        dbOutput.write(buffer, 0, count)
                        decompressBytes += count
                        val pct = 85 + (decompressBytes * 14L / expectedDecompressedSize.coerceAtLeast(1L)).toInt()
                        if (pct > lastDecompressPct) {
                            lastDecompressPct = pct
                            onProgress(pct)
                        }
                    }
                }
            }

            check(temporaryDb.length() == expectedDecompressedSize) {
                "decompressed size mismatch: ${temporaryDb.length()} != $expectedDecompressedSize"
            }
            if (expectedSha256.isNotEmpty()) {
                check(sha256(temporaryDb).equals(expectedSha256, ignoreCase = true)) {
                    "database checksum mismatch"
                }
            }
        } finally {
            executor.shutdownNow()
            executor.awaitTermination(5, TimeUnit.SECONDS)
        }

        if (target.exists()) check(target.delete()) { "cannot replace old database" }
        check(temporaryDb.renameTo(target)) { "cannot install downloaded database" }
        saveLocalDbVersion(manifest.getString("version"))
        temporaryGz.delete()
        partsDir.deleteRecursively()
        onProgress(100)
        target
    }.onFailure {
        val target = MuseDatabase.defaultDbFile()
        File(target.parentFile, "${target.name}.gz.download").delete()
        File(target.parentFile, "${target.name}.download").delete()
        File(target.parentFile, "${target.name}.parts").deleteRecursively()
    }

    private fun downloadPart(url: String, target: File, onBytes: (Int) -> Unit) {
        val connection = connection(url)
        try {
            connection.inputStream.buffered(256 * 1024).use { input ->
                target.outputStream().buffered(256 * 1024).use { output ->
                    val buffer = ByteArray(256 * 1024)
                    while (true) {
                        val count = input.read(buffer)
                        if (count < 0) break
                        output.write(buffer, 0, count)
                        onBytes(count)
                    }
                }
            }
        } finally {
            connection.disconnect()
        }
    }

    private fun readText(url: String): String {
        val connection = connection(url)
        return try {
            connection.inputStream.bufferedReader(Charsets.UTF_8).use { it.readText() }
        } finally {
            connection.disconnect()
        }
    }

    private fun connection(url: String): HttpURLConnection =
        (URL(url).openConnection() as HttpURLConnection).apply {
            connectTimeout = 15_000
            readTimeout = 60_000
            instanceFollowRedirects = true
            setRequestProperty("User-Agent", "MaidongKTV/1.1")
            if (token.isNotBlank()) {
                setRequestProperty("Authorization", "Bearer $token")
            }
            val code = responseCode
            check(code in 200..299) { "HTTP $code: $url" }
        }

    private fun resolveUrl(manifestUrl: String, value: String): String =
        if (value.startsWith("http://") || value.startsWith("https://")) value
        else URL(URL(manifestUrl), value).toString()

    private fun sha256(file: File): String {
        val digest = MessageDigest.getInstance("SHA-256")
        file.inputStream().buffered(256 * 1024).use { input ->
            val buffer = ByteArray(256 * 1024)
            while (true) {
                val count = input.read(buffer)
                if (count < 0) break
                digest.update(buffer, 0, count)
            }
        }
        return digest.digest().joinToString("") { "%02x".format(it.toInt() and 0xff) }
    }
}
