# Configuração Android - Checagem de Apps Instalados

## ⚠️ IMPORTANTE - Android 11+

Para que a checagem de apps instalados funcione no Android 11 e versões superiores, você **DEVE** adicionar os package names no `AndroidManifest.xml`.

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
