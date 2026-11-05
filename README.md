# 🎩 Magic System - Panel del Mago + Vista Espectador

Sistema completo de magia digital en tiempo real con WebSocket. El mago controla desde su panel qué ve el espectador en su móvil, con redirección limpia que no deja rastro en el historial.

## 🏗️ Arquitectura

```
┌─────────────────┐     WebSocket      ┌─────────────────┐
│  Panel Mago     │ ◄─────────────────► │   Servidor      │
│  (Controlador)  │   Socket.io         │   Node.js       │
└─────────────────┘                     └────────┬────────┘
                                                  │
                                        ┌─────────▼─────────┐
                                        │  Vista Espectador │
                                        │  (window.location │
                                        │   .replace()) 🔑  │
                                        └───────────────────┘
```

## 📁 Estructura del Proyecto

```
magic-system/
├── package.json              # Dependencias y scripts
├── server.js                 # Backend Express + Socket.io
├── capacitor.config.json     # Config Capacitor para APK
├── render.yaml               # Blueprint Render (despliegue gratis)
├── public/
│   ├── magician.html         # Panel del Mago (PWA)
│   ├── viewer.html           # Vista Espectador
│   └── manifest.json         # PWA Manifest
└── README.md                 # Este archivo
```

## 🚀 DESPLIEGUE GRATIS EN RENDER (Recomendado)

### Opción A: Despliegue Automático con Blueprint (Más fácil)

1. **Sube el código a GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/magic-system.git
   git push -u origin main
   ```

2. **Ve a [Render Dashboard](https://dashboard.render.com/)**
   - Click "New" → "Blueprint"
   - Conecta tu repositorio GitHub
   - Render detecta `render.yaml` y crea el servicio automáticamente
   - Click "Apply" → Espera a que termine el build (~2-3 min)

3. **¡Listo!** Tu URL será: `https://magic-system.onrender.com`

### Opción B: Despliegue Manual

1. En Render Dashboard: "New" → "Web Service"
2. Conecta tu repo GitHub
3. Configuración:
   - **Name:** `magic-system`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** `Free`
   - **Health Check Path:** `/health`
4. Environment Variables:
   - `NODE_ENV` = `production`
5. Deploy!

### ⚠️ Importante sobre Render Free Tier
- **750 horas/mes gratis** (suficiente para 24/7)
- **Cold start:** Tras 15 min inactividad, el servicio duerme (~30s al despertar)
- **Evitar cold start:** Configura un ping externo cada 10 min:
  - [UptimeRobot](https://uptimerobot.com/) - Gratis, 50 monitores
  - [Cron-job.org](https://cron-job.org/) - Gratis, ilimitado
  - URL a pingear: `https://TU-APP.onrender.com/health`

---

## 🏃 DESARROLLO LOCAL

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor
npm start
# o para desarrollo con auto-reload (instala nodemon globalmente)
npx nodemon server.js

# 3. Abrir en navegador
# Panel Mago: http://localhost:3000/magician
# Vista Espectador: http://localhost:3000/v/TEST123
```

### Probar en móvil local (misma red WiFi)

1. Averigua tu IP local: `ipconfig` (Windows) / `ifconfig` (Mac/Linux) → ej: `192.168.1.50`
2. En móvil, abre: `http://192.168.1.50:3000/magician` (panel mago)
3. En otro móvil: `http://192.168.1.50:3000/v/SESION123` (espectador)

---

## 📱 GENERAR APK PARA ANDROID (Capacitor)

### Requisitos previos
- **Node.js 18+**
- **Java JDK 17+** (para Android)
- **Android Studio** (para build y emulador)
- **Git**

### Paso a paso

#### 1. Configurar variables de producción
Edita `capacitor.config.json` y cambia la URL:
```json
"server": {
  "url": "https://TU-APP.onrender.com",
  "cleartext": false
}
```

#### 2. Instalar Capacitor y sincronizar
```bash
# Instalar dependencias Capacitor
npm install @capacitor/cli @capacitor/core @capacitor/android

# Inicializar (solo primera vez)
npx cap init "Panel Mago" "com.magia.panel" --web-dir=public

# Añadir plataforma Android
npx cap add android

# Sincronizar archivos web → proyecto nativo
npx cap sync android
```

#### 3. Abrir en Android Studio
```bash
npx cap open android
```

#### 4. Generar APK (Debug - para probar)
En Android Studio:
- **Build** → **Build Bundle(s)/APK(s)** → **Build APK(s)**
- Espera a que termine → "locate" → APK en `android/app/build/outputs/apk/debug/app-debug.apk`

#### 5. Generar APK (Release - para distribuir)

**Opción A: Desde Android Studio (GUI)**
1. **Build** → **Generate Signed Bundle/APK** → **APK**
2. Crear keystore nuevo (guárdalo seguro!):
   - Key store path: `release.keystore`
   - Password: `tu_password_seguro`
   - Alias: `key`
   - Validity: 25 años
3. Next → Release → Finish
4. APK firmado en `android/app/release/app-release.apk`

**Opción B: Línea de comandos (rápido)**
```bash
# En carpeta android/
cd android

# Debug
./gradlew assembleDebug

# Release (requiere keystore configurado en capacitor.config.json o local.properties)
./gradlew assembleRelease
```

#### 6. Instalar en tu móvil
```bash
# Opción A: ADB (móvil conectado por USB, depuración USB activada)
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Opción B: Transferir APK al móvil e instalar desde archivos
# (Habilitar "Instalar apps de orígenes desconocidos")
```

---

## 🔧 ALTERNATIVAS DE DESPLIEGUE GRATIS

### Railway.app (Más fácil, $5 crédito mensual)
```bash
# 1. npm i -g @railway/cli
# 2. railway login
# 3. railway init
# 4. railway up
# ¡Listo! URL automática con HTTPS
```

### Fly.io (Gratis 3 VMs pequeñas)
```bash
# 1. curl -L https://fly.io/install.sh | sh
# 2. fly launch (detecta Node.js)
# 3. fly deploy
# Incluye IPv6, TLS, edge global
```

### Vercel (Solo Serverless - requiere adaptación)
- No soporta WebSocket persistentes nativamente
- Usar Pusher/Ably o adaptar a Serverless Functions + SSE

---

## 🎯 CÓMO USAR EL SISTEMA (El Truco)

### Preparación
1. **Despliega** en Render (obtienes URL: `https://tu-app.onrender.com`)
2. **Mago:** Abre `https://tu-app.onrender.com/magician` en tu móvil
   - Instala como PWA: Chrome → Menú (⋮) → "Instalar app" / "Añadir a pantalla de inicio"
3. **Espectador:** Recibe link `https://tu-app.onrender.com/v/SESION123`

### Ejecución
1. **Espectador** abre su link → ve pantalla negra "Conectando..." / "Esperando..."
2. **Mago** abre su panel → ve la sesión del espectador en el selector
3. **Mago** selecciona la sesión → elige motor (Google, YouTube, Maps, Wikipedia, Imágenes)
4. **Mago** escribe el término que dicte el espectador
5. **Mago** pulsa **"ENVIAR AL ESPECTADOR"**
6. ✨ **MAGIA:** El móvil del espectador redirige **instantáneamente** a la búsqueda

### La clave: `window.location.replace()`
```javascript
// En viewer.html - LÍNEA CRÍTICA
window.location.replace(targetUrl);  // REEMPLAZA historial
// NO usar: window.location.href = targetUrl;  // AÑADE al historial
```
**Resultado:** Al pulsar "Atrás" en el navegador del espectador, **NO vuelve a la URL mágica** - va a la página anterior. El historial SOLO muestra la búsqueda final (Google, YouTube, etc.).

---

## 🛠️ PERSONALIZACIÓN

### Añadir nuevos motores de búsqueda
Edita `server.js` y `magician.html`:

**server.js** (línea ~85):
```javascript
const engines = {
  google: `https://www.google.com/search?q=${encodedQuery}`,
  youtube: `https://www.youtube.com/results?search_query=${encodedQuery}`,
  maps: `https://www.google.com/maps/search/${encodedQuery}`,
  wikipedia: `https://es.wikipedia.org/wiki/${encodedQuery}`,
  images: `https://www.google.com/search?tbm=isch&q=${encodedQuery}`,
  // AÑADIR NUEVOS AQUÍ:
  duckduckgo: `https://duckduckgo.com/?q=${encodedQuery}`,
  bing: `https://www.bing.com/search?q=${encodedQuery}`
};
```

**magician.html** (array ENGINES):
```javascript
const ENGINES = [
  { id: 'google', name: 'Google', icon: '🔍', color: '#4285f4' },
  { id: 'youtube', name: 'YouTube', icon: '▶️', color: '#ff0000' },
  // ... AÑADIR NUEVOS AQUÍ
  { id: 'duckduckgo', name: 'DuckDuckGo', icon: '🦆', color: '#de5833' }
];
```

### Preparado para entrada por voz (futuro)
El código está modularizado. Para añadir reconocimiento de voz:
```javascript
// En magician.html - input event listener
const recognition = new webkitSpeechRecognition();
recognition.lang = 'es-ES';
recognition.onresult = (e) => {
  searchInput.value = e.results[0][0].transcript;
  updateSendBtn();
};
```

---

## 🔒 SEGURIDAD Y PRIVACIDAD

- **Sin base de datos:** Sesiones en memoria (se limpian cada hora)
- **HTTPS obligatorio:** Render lo proporciona gratis
- **Sin tracking:** No hay analytics, cookies ni almacenamiento persistente
- **CORS abierto:** Para permitir conexión desde cualquier origen (móvil + desktop)
- **Rate limiting:** No implementado (añadir si necesitas producción seria)

---

## 🐛 SOLUCIÓN DE PROBLEMAS

| Problema | Solución |
|----------|----------|
| "No hay espectadores" | El espectador debe abrir su URL PRIMERO |
| WebSocket no conecta | Verificar que la URL en `capacitor.config.json` es correcta |
| APK no instala | Habilitar "Orígenes desconocidos" en Android |
| Cold start lento | Configurar UptimeRobot ping cada 10 min a `/health` |
| Error "Cleartext traffic" | En `capacitor.config.json`: `"cleartext": false` (solo HTTPS) |
| Viewer no redirige | Verificar consola del navegador móvil (chrome://inspect) |

---

## 📄 LICENCIA

MIT - Libre para uso personal y comercial.

---

## 🙋 SOPORTE

¿Problemas? Verifica:
1. Logs en Render Dashboard → Tu servicio → Logs
2. Consola del navegador (F12)
3. `chrome://inspect` para depurar móvil real
4. Health check: `https://tu-app.onrender.com/health`

---

**¡Que la magia te acompañe! 🎩✨**