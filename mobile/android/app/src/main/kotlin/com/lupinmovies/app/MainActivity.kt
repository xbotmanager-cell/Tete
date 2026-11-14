package com.lupinmovies.app

import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.database.Cursor
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import androidx.core.content.FileProvider
import androidx.core.content.pm.PackageInfoCompat
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.File
import java.security.MessageDigest

class MainActivity : FlutterActivity() {
    companion object {
        private const val DOWNLOAD_CHANNEL = "com.lupinmovies.app/downloads"
        private const val UPDATER_CHANNEL = "com.lupinmovies.app/updater"
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, DOWNLOAD_CHANNEL)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "enqueueDownload" -> {
                        try {
                            val url = call.argument<String>("url") ?: ""
                            val fileName = call.argument<String>("fileName") ?: "lupin_video.mp4"
                            val title = call.argument<String>("title") ?: "LUPIN MOVIES Download"
                            val description = call.argument<String>("description") ?: "Downloading offline video"
                            val headers = call.argument<Map<String, String>>("headers") ?: emptyMap()

                            if (!url.startsWith("http://") && !url.startsWith("https://")) {
                                result.error("INVALID_URL", "Download URL must use HTTP or HTTPS.", null)
                                return@setMethodCallHandler
                            }

                            val moviesDir = getExternalFilesDir(Environment.DIRECTORY_MOVIES)
                            if (moviesDir == null) {
                                result.error("STORAGE_UNAVAILABLE", "App movies directory unavailable.", null)
                                return@setMethodCallHandler
                            }
                            val lupinDir = File(moviesDir, "LupinMovies")
                            if (!lupinDir.exists()) lupinDir.mkdirs()

                            val cleanFileName = fileName.replace(Regex("[^a-zA-Z0-9._-]"), "_")
                            val subPath = "LupinMovies/$cleanFileName"
                            val targetFile = File(lupinDir, cleanFileName)
                            if (targetFile.exists()) {
                                targetFile.delete()
                            }

                            val request = DownloadManager.Request(Uri.parse(url))
                                .setTitle(title)
                                .setDescription(description)
                                .setNotificationVisibility(
                                    DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED
                                )
                                .setAllowedOverMetered(true)
                                .setAllowedOverRoaming(true)
                                .setDestinationInExternalFilesDir(
                                    applicationContext,
                                    Environment.DIRECTORY_MOVIES,
                                    subPath
                                )

                            for ((key, value) in headers) {
                                if (key.isNotBlank() && value.isNotBlank()) {
                                    request.addRequestHeader(key, value)
                                }
                            }

                            val dm = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
                            val downloadId = dm.enqueue(request)

                            result.success(
                                mapOf(
                                    "downloadId" to downloadId,
                                    "targetPath" to targetFile.absolutePath
                                )
                            )
                        } catch (e: Exception) {
                            result.error("ENQUEUE_FAILED", e.message ?: "Failed to enqueue download", null)
                        }
                    }

                    "queryDownload" -> {
                        try {
                            val rawId = call.argument<Number>("downloadId")
                            if (rawId == null) {
                                result.success(mapOf("status" to "not_found"))
                                return@setMethodCallHandler
                            }
                            val dm = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
                            val query = DownloadManager.Query().setFilterById(rawId.toLong())
                            var cursor: Cursor? = null
                            try {
                                cursor = dm.query(query)
                                if (cursor != null && cursor.moveToFirst()) {
                                    val statusIdx = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS)
                                    val bytesIdx = cursor.getColumnIndex(
                                        DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR
                                    )
                                    val totalIdx = cursor.getColumnIndex(
                                        DownloadManager.COLUMN_TOTAL_SIZE_BYTES
                                    )
                                    val uriIdx = cursor.getColumnIndex(DownloadManager.COLUMN_LOCAL_URI)
                                    val reasonIdx = cursor.getColumnIndex(DownloadManager.COLUMN_REASON)

                                    val rawStatus = if (statusIdx >= 0) cursor.getInt(statusIdx) else 0
                                    val statusStr = when (rawStatus) {
                                        DownloadManager.STATUS_PENDING -> "pending"
                                        DownloadManager.STATUS_RUNNING -> "running"
                                        DownloadManager.STATUS_PAUSED -> "paused"
                                        DownloadManager.STATUS_SUCCESSFUL -> "successful"
                                        DownloadManager.STATUS_FAILED -> "failed"
                                        else -> "unknown"
                                    }
                                    val downloaded = if (bytesIdx >= 0) cursor.getLong(bytesIdx) else 0L
                                    val total = if (totalIdx >= 0) cursor.getLong(totalIdx) else 0L
                                    val localUri = if (uriIdx >= 0) cursor.getString(uriIdx) else null
                                    val reason = if (reasonIdx >= 0) cursor.getInt(reasonIdx) else 0

                                    result.success(
                                        mapOf(
                                            "status" to statusStr,
                                            "bytesDownloaded" to downloaded,
                                            "totalBytes" to total,
                                            "localUri" to localUri,
                                            "reason" to reason
                                        )
                                    )
                                } else {
                                    result.success(mapOf("status" to "not_found"))
                                }
                            } finally {
                                cursor?.close()
                            }
                        } catch (e: Exception) {
                            result.error("QUERY_FAILED", e.message, null)
                        }
                    }

                    "cancelDownload" -> {
                        try {
                            val rawId = call.argument<Number>("downloadId")
                            if (rawId != null) {
                                val dm = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
                                dm.remove(rawId.toLong())
                            }
                            result.success(true)
                        } catch (e: Exception) {
                            result.error("CANCEL_FAILED", e.message, null)
                        }
                    }

                    "getMoviesDirectory" -> {
                        val moviesDir = getExternalFilesDir(Environment.DIRECTORY_MOVIES)
                        val lupinDir = if (moviesDir != null) File(moviesDir, "LupinMovies") else null
                        if (lupinDir != null && !lupinDir.exists()) lupinDir.mkdirs()
                        result.success(lupinDir?.absolutePath)
                    }

                    else -> result.notImplemented()
                }
            }

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, UPDATER_CHANNEL)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "getInstallerPackageName" -> {
                        result.success(resolveInstallerPackageName())
                    }

                    "canRequestPackageInstalls" -> {
                        val allowed = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            packageManager.canRequestPackageInstalls()
                        } else {
                            true
                        }
                        result.success(allowed)
                    }

                    "openInstallPermissionSettings" -> {
                        try {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                val intent = Intent(
                                    Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                                    Uri.parse("package:$packageName")
                                )
                                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                startActivity(intent)
                            }
                            result.success(true)
                        } catch (e: Exception) {
                            result.error("SETTINGS_OPEN_FAILED", e.message, null)
                        }
                    }

                    "getUpdatesDirectory" -> {
                        val dir = File(cacheDir, "updates")
                        if (!dir.exists()) dir.mkdirs()
                        result.success(dir.absolutePath)
                    }

                    "verifyDownloadedApk" -> {
                        val filePath = call.argument<String>("filePath") ?: ""
                        result.success(verifyApkPackageAndSignature(filePath))
                    }

                    "installApk" -> {
                        try {
                            val filePath = call.argument<String>("filePath") ?: ""
                            val apkFile = File(filePath)
                            if (!apkFile.exists()) {
                                result.error("FILE_NOT_FOUND", "APK file does not exist.", null)
                                return@setMethodCallHandler
                            }

                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
                                !packageManager.canRequestPackageInstalls()
                            ) {
                                result.error(
                                    "INSTALL_PERMISSION_REQUIRED",
                                    "Allow 'Install unknown apps' for LUPIN MOVIES to complete the update.",
                                    null
                                )
                                return@setMethodCallHandler
                            }

                            val verification = verifyApkPackageAndSignature(filePath)
                            if (verification["valid"] != true) {
                                result.error(
                                    "APK_VERIFICATION_FAILED",
                                    verification["error"]?.toString() ?: "APK signature verification failed.",
                                    null
                                )
                                return@setMethodCallHandler
                            }

                            val contentUri = FileProvider.getUriForFile(
                                applicationContext,
                                "$packageName.fileprovider",
                                apkFile
                            )

                            val intent = Intent(Intent.ACTION_VIEW).apply {
                                setDataAndType(contentUri, "application/vnd.android.package-archive")
                                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            }
                            startActivity(intent)
                            result.success(true)
                        } catch (e: Exception) {
                            result.error("INSTALL_INTENT_FAILED", e.message ?: "Unable to launch installer", null)
                        }
                    }

                    else -> result.notImplemented()
                }
            }
    }

    private fun resolveInstallerPackageName(): String? {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                packageManager.getInstallSourceInfo(packageName).installingPackageName
            } else {
                @Suppress("DEPRECATION")
                packageManager.getInstallerPackageName(packageName)
            }
        } catch (_: Exception) {
            null
        }
    }

    private fun verifyApkPackageAndSignature(filePath: String): Map<String, Any?> {
        val file = File(filePath)
        if (!file.exists() || !file.canRead()) {
            return mapOf("valid" to false, "error" to "Downloaded APK file could not be read.")
        }

        return try {
            val archiveFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                PackageManager.GET_SIGNING_CERTIFICATES
            } else {
                @Suppress("DEPRECATION")
                PackageManager.GET_SIGNATURES
            }

            val archiveInfo: PackageInfo? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                packageManager.getPackageArchiveInfo(
                    filePath,
                    PackageManager.PackageInfoFlags.of(archiveFlags.toLong())
                )
            } else {
                @Suppress("DEPRECATION")
                packageManager.getPackageArchiveInfo(filePath, archiveFlags)
            }

            if (archiveInfo == null) {
                return mapOf("valid" to false, "error" to "Downloaded file is not a valid Android APK archive.")
            }

            if (archiveInfo.packageName != packageName) {
                return mapOf(
                    "valid" to false,
                    "error" to "Package ID mismatch (${archiveInfo.packageName} != $packageName)."
                )
            }

            val installedInfo: PackageInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                packageManager.getPackageInfo(
                    packageName,
                    PackageManager.PackageInfoFlags.of(archiveFlags.toLong())
                )
            } else {
                @Suppress("DEPRECATION")
                packageManager.getPackageInfo(packageName, archiveFlags)
            }

            val archiveVersionCode = PackageInfoCompat.getLongVersionCode(archiveInfo)
            val installedVersionCode = PackageInfoCompat.getLongVersionCode(installedInfo)
            if (archiveVersionCode < installedVersionCode) {
                return mapOf(
                    "valid" to false,
                    "error" to "Downloaded APK version ($archiveVersionCode) is older than installed ($installedVersionCode)."
                )
            }

            val archiveDigests = extractCertSha256Digests(archiveInfo)
            val installedDigests = extractCertSha256Digests(installedInfo)
            if (archiveDigests.isEmpty() || installedDigests.isEmpty() || archiveDigests.intersect(installedDigests).isEmpty()) {
                return mapOf(
                    "valid" to false,
                    "error" to "APK signing certificate does not match the installed LUPIN MOVIES signature."
                )
            }

            mapOf(
                "valid" to true,
                "packageName" to archiveInfo.packageName,
                "versionName" to (archiveInfo.versionName ?: ""),
                "versionCode" to archiveVersionCode,
                "signingCertSha256" to archiveDigests.first()
            )
        } catch (e: Exception) {
            mapOf("valid" to false, "error" to (e.message ?: "APK inspection failed."))
        }
    }

    private fun extractCertSha256Digests(info: PackageInfo): Set<String> {
        val md = MessageDigest.getInstance("SHA-256")
        val digests = mutableSetOf<String>()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            val signingInfo = info.signingInfo
            val certs = if (signingInfo != null) {
                if (signingInfo.hasMultipleSigners()) {
                    signingInfo.apkContentsSigners
                } else {
                    signingInfo.signingCertificateHistory
                }
            } else {
                emptyArray()
            }
            if (certs != null) {
                for (sig in certs) {
                    val hash = md.digest(sig.toByteArray()).joinToString("") { "%02x".format(it) }
                    digests.add(hash)
                }
            }
        }

        if (digests.isEmpty()) {
            @Suppress("DEPRECATION")
            val legacySigs = info.signatures
            if (legacySigs != null) {
                for (sig in legacySigs) {
                    val hash = md.digest(sig.toByteArray()).joinToString("") { "%02x".format(it) }
                    digests.add(hash)
                }
            }
        }
        return digests
    }
}
