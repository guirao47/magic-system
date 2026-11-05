#!/bin/bash
# Script helper para generar APK con Capacitor
# Uso: ./setup-apk.sh

set -e

echo "🎩 Magic System - Generador APK"
echo "================================"

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no instalado${NC}"
    exit 1
fi

# Verificar Java
if ! command -v java &> /dev/null; then
    echo -e "${YELLOW}⚠️  Java no encontrado - necesario para Android${NC}"
    echo "   Instala JDK 17+: https://adoptium.net/"
fi

# Verificar Android Studio / SDK
if [ -z "$ANDROID_HOME" ] && [ -z "$ANDROID_SDK_ROOT" ]; then
    echo -e "${YELLOW}⚠️  ANDROID_HOME no configurado${NC}"
    echo "   Instala Android Studio y configura variable de entorno"
fi

echo -e "${GREEN}✓ Verificaciones básicas OK${NC}"

# 1. Instalar dependencias Capacitor
echo ""
echo "📦 Instalando Capacitor..."
npm install @capacitor/cli @capacitor/core @capacitor/android

# 2. Sincronizar
echo ""
echo "🔄 Sincronizando proyecto..."
npx cap sync android

# 3. Generar APK Debug
echo ""
echo "🔨 Generando APK Debug..."
cd android
./gradlew assembleDebug
cd ..

# 4. Mostrar ubicación
echo ""
echo -e "${GREEN}✅ APK generado exitosamente!${NC}"
echo ""
echo "📍 Ubicación:"
echo "   android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "📱 Para instalar en móvil conectado por USB:"
echo "   adb install android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "🔐 Para APK Release (firmado):"
echo "   1. Edita capacitor.config.json con tu keystore"
echo "   2. Ejecuta: cd android && ./gradlew assembleRelease"
echo "   3. APK en: android/app/build/outputs/apk/release/app-release.apk"