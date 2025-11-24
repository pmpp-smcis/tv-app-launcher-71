# Troubleshooting: Plugin Not Implemented Error

## Verificações Essenciais

### 1. ✅ Verifique o MainActivity.kt

O arquivo deve estar em: `android/app/src/main/java/com/pmppsmcis/tvapplauncher/MainActivity.kt`

```kotlin
package com.pmppsmcis.tvapplauncher

import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // CRÍTICO: Registrar o plugin aqui
        registerPlugin(LargeFileDownloaderPlugin::class.java)
    }
}
```

### 2. ✅ Verifique o LargeFileDownloaderPlugin.kt

O arquivo deve estar em: `android/app/src/main/java/com/pmppsmcis/tvapplauncher/LargeFileDownloaderPlugin.kt`

**Importante:** A primeira linha DEVE ser:
```kotlin
package com.pmppsmcis.tvapplauncher
```

E a classe DEVE ter a anotação:
```kotlin
@CapacitorPlugin(name = "LargeFileDownloader")
class LargeFileDownloaderPlugin : Plugin() {
    // ...
}
```

### 3. ⚠️ CRÍTICO: Adicione ProGuard Rules

Crie/edite o arquivo: `android/app/proguard-rules.pro`

```proguard
# Capacitor plugins
-keep public class * extends com.getcapacitor.Plugin

# Mantenha seu plugin específico
-keep class com.pmppsmcis.tvapplauncher.LargeFileDownloaderPlugin { *; }
-keepclassmembers class com.pmppsmcis.tvapplauncher.LargeFileDownloaderPlugin { *; }

# Mantenha anotações do Capacitor
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes InnerClasses
```

### 4. ⚠️ Verifique o build.gradle (app)

Arquivo: `android/app/build.gradle`

Certifique-se de que tem estas configurações:

```gradle
android {
    ...
    
    buildTypes {
        release {
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
        debug {
            minifyEnabled false
        }
    }
}

dependencies {
    implementation project(':capacitor-android')
    // ... outras dependências
}
```

### 5. 🔄 Comandos para Limpar e Recompilar

Execute estes comandos **NA ORDEM**:

```bash
# 1. Limpar cache do Capacitor
npx cap sync

# 2. Limpar build do Android
cd android
./gradlew clean

# 3. Voltar para raiz e fazer build
cd ..
npm run build

# 4. Sincronizar novamente
npx cap sync

# 5. Executar no Android
npx cap run android
```

### 6. 🔍 Verifique os Logs Detalhados

Ao executar `npx cap run android`, procure por:
- ❌ `ClassNotFoundException`
- ❌ `NoSuchMethodException`
- ❌ Erros de compilação do Gradle

### 7. ⚠️ Verificação Final: Estrutura de Pastas

Confirme que seus arquivos estão exatamente nesta estrutura:

```
android/
├── app/
│   ├── src/
│   │   └── main/
│   │       ├── java/
│   │       │   └── com/
│   │       │       └── pmppsmcis/
│   │       │           └── tvapplauncher/
│   │       │               ├── MainActivity.kt
│   │       │               └── LargeFileDownloaderPlugin.kt
│   │       ├── AndroidManifest.xml
│   │       └── res/
│   │           └── xml/
│   │               └── file_paths.xml
│   ├── build.gradle
│   └── proguard-rules.pro
└── build.gradle
```

## 🆘 Se Ainda Não Funcionar

Execute este comando para ver logs detalhados:

```bash
npx cap run android --verbose
```

E compartilhe a saída dos erros que aparecerem durante a compilação.

## Possível Causa: file_paths.xml Faltando

Se você usa FileProvider, precisa criar: `android/app/src/main/res/xml/file_paths.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <external-path name="external_files" path="." />
    <cache-path name="cache" path="." />
    <external-cache-path name="external_cache" path="." />
    <files-path name="files" path="." />
</paths>
```
