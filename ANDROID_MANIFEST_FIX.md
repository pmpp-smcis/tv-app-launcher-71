# Correção do AndroidManifest.xml

## Problema
O erro "plugin not implemented" ocorre porque o AndroidManifest.xml está faltando configurações essenciais para o plugin de download funcionar.

## Solução

Substitua seu arquivo `android/app/src/main/AndroidManifest.xml` pelo conteúdo abaixo:

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:largeHeap="true">

        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode|navigation"
            android:name=".MainActivity"
            android:label="@string/title_activity_main"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:exported="true">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
                <category android:name="android.intent.category.LEANBACK_LAUNCHER" />
            </intent-filter>

        </activity>

        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths"></meta-data>
        </provider>
    </application>

    <!-- Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    
    <!-- Para Android TV -->
    <uses-feature android:name="android.software.leanback" android:required="false" />
    <uses-feature android:name="android.hardware.touchscreen" android:required="false" />

    <!-- Query para abrir outros apps -->
    <queries>
        <intent>
            <action android:name="android.intent.action.MAIN" />
        </intent>
    </queries>

</manifest>
```

## Mudanças importantes:

1. ✅ **`android:largeHeap="true"`** - Adicionado na tag `<application>` (ESSENCIAL para downloads grandes)
2. ✅ **Permissões de storage** - `WRITE_EXTERNAL_STORAGE` e `READ_EXTERNAL_STORAGE` adicionadas
3. ✅ **`LEANBACK_LAUNCHER`** - Categoria adicionada para suporte a Android TV
4. ✅ **`<queries>`** - Tag adicionada para permitir abrir outros apps
5. ✅ **Features Android TV** - Declarações adicionadas

## Próximos passos:

1. Substitua o conteúdo do arquivo `android/app/src/main/AndroidManifest.xml`
2. Execute: `npx cap sync`
3. Execute: `npx cap run android`

## Verificação dos outros arquivos:

- ✅ **MainActivity.kt** - Está correto, registrando o plugin
- ✅ **LargeFileDownloaderPlugin.kt** - Está no package correto `com.pmppsmcis.tvapplauncher`

O problema é apenas o AndroidManifest.xml!
