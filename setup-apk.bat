@echo off
REM Script helper para generar APK con Capacitor (Windows)
REM Uso: setup-apk.bat

echo 🎩 Magic System - Generador APK
echo ================================

REM Verificar Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js no instalado
    echo    Instala desde: https://nodejs.org/
    pause
    exit /b 1
)

echo ✓ Node.js encontrado

REM Verificar npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ npm no encontrado
    pause
    exit /b 1
)

echo ✓ npm encontrado

REM 1. Instalar dependencias Capacitor
echo.
echo 📦 Instalando Capacitor...
npm install @capacitor/cli @capacitor/core @capacitor/android
if %errorlevel% neq 0 (
    echo ❌ Error instalando Capacitor
    pause
    exit /b 1
)

REM 2. Sincronizar
echo.
echo 🔄 Sincronizando proyecto...
npx cap sync android
if %errorlevel% neq 0 (
    echo ❌ Error sincronizando
    pause
    exit /b 1
)

REM 3. Generar APK Debug
echo.
echo 🔨 Generando APK Debug...
cd android
call gradlew.bat assembleDebug
cd ..

if %errorlevel% neq 0 (
    echo ❌ Error generando APK
    echo    Verifica que tengas Android Studio y JDK 17+ instalados
    pause
    exit /b 1
)

REM 4. Mostrar resultado
echo.
echo ✅ APK generado exitosamente!
echo.
echo 📍 Ubicación:
echo    android\app\build\outputs\apk\debug\app-debug.apk
echo.
echo 📱 Para instalar en móvil conectado por USB (depuración USB activada):
echo    adb install android\app\build\outputs\apk\debug\app-debug.apk
echo.
echo 🔐 Para APK Release (firmado para Play Store):
echo    1. Edita capacitor.config.json con tu keystore
echo    2. Ejecuta: cd android ^&^& gradlew.bat assembleRelease
echo    3. APK en: android\app\build\outputs\apk\release\app-release.apk
echo.
echo 📋 IMPORTANTE: Antes de generar APK, edita capacitor.config.json
echo    y cambia la URL a tu app desplegada en Render:
echo    "server": { "url": "https://TU-APP.onrender.com" }
echo.
pause