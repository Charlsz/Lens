# Lens

Reconocimiento de objetos con Edge AI en una aplicación móvil.

Dos modos:
- **Tomar foto**: captura una imagen y corre el modelo una vez
- **En vivo**: analiza frames de la cámara en bucle hasta que detienes

Todo corre en el dispositivo (sin nube).

## Ejecutar

```bash
npm install
npx expo start
```

Escanea el QR con Expo Go (misma cuenta Expo en CLI y en la app).

## Verificar

```bash
npm run typecheck
npm test
```

## Stack

- Expo SDK 58 + React Native + TypeScript
- Expo Camera
- TensorFlow.js (CPU) + COCO-SSD lite MobileNet
- Expo Router

## Objetos detectados

Persona, teléfono, botella, portátil, libro, taza, mochila, silla.
