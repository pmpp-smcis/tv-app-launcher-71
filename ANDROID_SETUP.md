# Configuração Android - Checagem de Apps Instalados

## ⚠️ IMPORTANTE - Android 11+

Para que a checagem de apps instalados funcione no Android 11 e versões superiores, você **DEVE** adicionar os package names no `AndroidManifest.xml`.

O Android 11 introduziu restrições de privacidade onde apps não podem mais ver todos os apps instalados no dispositivo. Você precisa declarar explicitamente quais apps deseja verificar.

## Passos:

### 1. Build e sync do projeto
```bash
npm install
npm run build
npx cap sync
```

### 2. Editar AndroidManifest.xml

Abra o arquivo: `android/app/src/main/AndroidManifest.xml`

### 3. Adicionar queries ANTES da tag `<application>`

Adicione este bloco **ANTES** da tag `<application>`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Adicione isto AQUI, ANTES do <application> -->
    <queries>
        <!-- Adicione TODOS os package names dos apps que você quer verificar -->
        <package android:name="com.example.app1" />
        <package android:name="com.example.app2" />
        <package android:name="com.example.app3" />
        <!-- Continue adicionando todos os seus apps -->
    </queries>

    <application ...>
        ...
    </application>
</manifest>
```

### 3.1. Adicionar LEANBACK_LAUNCHER para Android TV

Para que a **própria loja apareça na tela inicial do Android TV**, você precisa adicionar a categoria `LEANBACK_LAUNCHER` na activity principal.

Dentro da tag `<application>`, localize a `<activity>` principal (geralmente `MainActivity`) e **adicione** a linha `<category android:name="android.intent.category.LEANBACK_LAUNCHER" />` no `<intent-filter>`:

```xml
<application ...>
    <activity
        android:name=".MainActivity"
        ...>
        <intent-filter>
            <action android:name="android.intent.action.MAIN" />
            <category android:name="android.intent.category.LAUNCHER" />
            <!-- ADICIONE ESTA LINHA ABAIXO ↓ -->
            <category android:name="android.intent.category.LEANBACK_LAUNCHER" />
        </intent-filter>
    </activity>
</application>
```

**Resultado:** Sua loja agora aparecerá na tela inicial do Android TV! 📺

### 4. Substitua pelos seus package names

Pegue os `packageName` do seu arquivo `apps.json` e adicione cada um como uma linha `<package>`.

**Exemplo:** Se seu JSON tem:
```json
{
  "apps": [
    { "packageName": "com.whatsapp", ... },
    { "packageName": "com.instagram.android", ... }
  ]
}
```

Seu AndroidManifest deve ter:
```xml
<queries>
    <package android:name="com.whatsapp" />
    <package android:name="com.instagram.android" />
</queries>
```

### 5. Rebuild e teste

```bash
npx cap sync
npx cap run android
```

## 🎯 Resultado

Após essa configuração:
- Apps instalados mostrarão botão verde "Instalado" ✓
- Apps não instalados mostrarão botão azul "Instalar"
- A verificação acontece automaticamente ao abrir o app
- Durante o download, aparecerá uma barra de progresso

## 📱 Android TV - Resumo

✅ **Para sua loja aparecer na tela inicial:** Adicione `LEANBACK_LAUNCHER` no manifest da loja (passo 3.1 acima)

✅ **Para verificar apps instalados no Android 11+:** Adicione os package names em `<queries>` (passo 3 acima)

✅ **Apps instalados pela loja:** Aparecerão na tela inicial normalmente se tiverem `LEANBACK_LAUNCHER` no próprio manifest deles
