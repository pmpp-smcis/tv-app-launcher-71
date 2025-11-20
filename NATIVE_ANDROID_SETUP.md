# Setup do Plugin Nativo para Downloads Grandes

Este guia explica como adicionar o código nativo Android ao projeto após exportá-lo.

## Passo 1: Exportar e Preparar o Projeto

1. Exporte o projeto para o GitHub via botão "Export to Github"
2. Clone o repositório localmente
3. Execute os comandos:
```bash
npm install
npm run build
npx cap add android
npx cap sync
```

## Passo 2: Criar o Plugin Nativo

### 2.1 Criar o arquivo do Plugin

Crie o arquivo em `android/app/src/main/java/app/lovable/cbf0723297e04c0a86d6beea42355f6c/LargeFileDownloaderPlugin.kt`

```kotlin
package app.lovable.cbf0723297e04c0a86d6beea42355f6c

import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.database.Cursor
import android.net.Uri
import android.os.Environment
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.JSObject
import java.util.concurrent.ConcurrentHashMap

@CapacitorPlugin(name = "LargeFileDownloader")
class LargeFileDownloaderPlugin : Plugin() {

    private var downloadManager: DownloadManager? = null
    private val downloadIds = ConcurrentHashMap<Long, String>()
    private var progressThread: Thread? = null
    private var isMonitoring = false

    override fun load() {
        downloadManager = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
        
        // Registrar receiver para downloads completados
        val filter = IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE)
        context.registerReceiver(downloadCompleteReceiver, filter)
        
        // Iniciar monitoramento de progresso
        startProgressMonitoring()
    }

    override fun handleOnDestroy() {
        super.handleOnDestroy()
        isMonitoring = false
        progressThread?.interrupt()
        try {
            context.unregisterReceiver(downloadCompleteReceiver)
        } catch (e: Exception) {
            // Receiver já foi removido
        }
    }

    @PluginMethod
    fun download(call: PluginCall) {
        val url = call.getString("url")
        val fileName = call.getString("fileName")
        val title = call.getString("title")
        val description = call.getString("description")

        if (url == null || fileName == null) {
            call.reject("URL e fileName são obrigatórios")
            return
        }

        try {
            val request = DownloadManager.Request(Uri.parse(url))
                .setTitle(title ?: fileName)
                .setDescription(description ?: "Baixando arquivo...")
                .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName)
                .setAllowedOverMetered(true)
                .setAllowedOverRoaming(true)

            val downloadId = downloadManager?.enqueue(request)

            if (downloadId != null) {
                downloadIds[downloadId] = fileName
                
                val ret = JSObject()
                ret.put("id", downloadId.toString())
                call.resolve(ret)
            } else {
                call.reject("Falha ao iniciar download")
            }
        } catch (e: Exception) {
            call.reject("Erro ao iniciar download: ${e.message}")
        }
    }

    @PluginMethod
    fun getStatus(call: PluginCall) {
        val id = call.getString("id")?.toLongOrNull()

        if (id == null) {
            call.reject("ID inválido")
            return
        }

        val query = DownloadManager.Query().setFilterById(id)
        val cursor: Cursor? = downloadManager?.query(query)

        if (cursor != null && cursor.moveToFirst()) {
            val statusIndex = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS)
            val bytesDownloadedIndex = cursor.getColumnIndex(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR)
            val totalBytesIndex = cursor.getColumnIndex(DownloadManager.COLUMN_TOTAL_SIZE_BYTES)
            val uriIndex = cursor.getColumnIndex(DownloadManager.COLUMN_LOCAL_URI)

            val status = cursor.getInt(statusIndex)
            val bytesDownloaded = cursor.getLong(bytesDownloadedIndex)
            val totalBytes = cursor.getLong(totalBytesIndex)
            val uri = cursor.getString(uriIndex)

            val ret = JSObject()
            ret.put("status", when (status) {
                DownloadManager.STATUS_PENDING -> "pending"
                DownloadManager.STATUS_RUNNING -> "running"
                DownloadManager.STATUS_SUCCESSFUL -> "completed"
                DownloadManager.STATUS_FAILED -> "failed"
                else -> "unknown"
            })
            ret.put("bytesDownloaded", bytesDownloaded)
            ret.put("totalBytes", totalBytes)
            if (uri != null) {
                ret.put("filePath", uri)
            }

            cursor.close()
            call.resolve(ret)
        } else {
            cursor?.close()
            call.reject("Download não encontrado")
        }
    }

    @PluginMethod
    fun cancel(call: PluginCall) {
        val id = call.getString("id")?.toLongOrNull()

        if (id == null) {
            call.reject("ID inválido")
            return
        }

        downloadManager?.remove(id)
        downloadIds.remove(id)
        call.resolve()
    }

    private val downloadCompleteReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            val id = intent?.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1) ?: -1

            if (id != -1L && downloadIds.containsKey(id)) {
                val query = DownloadManager.Query().setFilterById(id)
                val cursor: Cursor? = downloadManager?.query(query)

                if (cursor != null && cursor.moveToFirst()) {
                    val statusIndex = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS)
                    val uriIndex = cursor.getColumnIndex(DownloadManager.COLUMN_LOCAL_URI)
                    
                    val status = cursor.getInt(statusIndex)
                    val uri = cursor.getString(uriIndex)

                    if (status == DownloadManager.STATUS_SUCCESSFUL) {
                        val ret = JSObject()
                        ret.put("id", id.toString())
                        ret.put("filePath", uri ?: "")
                        notifyListeners("completed", ret)
                    } else {
                        val ret = JSObject()
                        ret.put("id", id.toString())
                        ret.put("error", "Download falhou")
                        notifyListeners("failed", ret)
                    }

                    cursor.close()
                    downloadIds.remove(id)
                }
            }
        }
    }

    private fun startProgressMonitoring() {
        isMonitoring = true
        progressThread = Thread {
            while (isMonitoring) {
                try {
                    Thread.sleep(500) // Atualizar a cada 500ms

                    downloadIds.keys.forEach { id ->
                        val query = DownloadManager.Query().setFilterById(id)
                        val cursor: Cursor? = downloadManager?.query(query)

                        if (cursor != null && cursor.moveToFirst()) {
                            val statusIndex = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS)
                            val bytesDownloadedIndex = cursor.getColumnIndex(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR)
                            val totalBytesIndex = cursor.getColumnIndex(DownloadManager.COLUMN_TOTAL_SIZE_BYTES)

                            val status = cursor.getInt(statusIndex)
                            val bytesDownloaded = cursor.getLong(bytesDownloadedIndex)
                            val totalBytes = cursor.getLong(totalBytesIndex)

                            if (status == DownloadManager.STATUS_RUNNING && totalBytes > 0) {
                                val progress = (bytesDownloaded.toFloat() / totalBytes.toFloat() * 100).toInt()

                                val ret = JSObject()
                                ret.put("id", id.toString())
                                ret.put("bytesDownloaded", bytesDownloaded)
                                ret.put("totalBytes", totalBytes)
                                ret.put("progress", progress)

                                notifyListeners("progress", ret)
                            }

                            cursor.close()
                        }
                    }
                } catch (e: InterruptedException) {
                    break
                } catch (e: Exception) {
                    // Ignorar erros durante monitoramento
                }
            }
        }
        progressThread?.start()
    }
}
```

## Passo 3: Modificar AndroidManifest.xml

Abra `android/app/src/main/AndroidManifest.xml` e adicione `android:largeHeap="true"` na tag `<application>`:

```xml
<application
    android:allowBackup="true"
    android:icon="@mipmap/ic_launcher"
    android:label="@string/app_name"
    android:roundIcon="@mipmap/ic_launcher_round"
    android:supportsRtl="true"
    android:theme="@style/AppTheme"
    android:largeHeap="true">
    
    <!-- resto da configuração -->
</application>
```

## Passo 4: Adicionar Permissões

Verifique se as seguintes permissões estão no `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
```

## Passo 5: Sincronizar e Testar

```bash
npx cap sync
npx cap run android
```

## Resultado

Agora o aplicativo consegue baixar APKs grandes (100MB+) sem problemas de memória, usando o DownloadManager nativo do Android que:

- ✅ Faz streaming direto para disco (não carrega tudo na memória)
- ✅ Continua downloads em background
- ✅ Mostra notificação de progresso
- ✅ Retoma downloads após interrupções
- ✅ Progresso em tempo real
