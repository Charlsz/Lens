# Lens

On-device object detection with Expo Go. Point the camera at everyday objects and Lens draws labels and boxes on the live preview.

Works offline after install. All inference runs on the phone.

## Run

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go on iPhone or Android.

## Stack

- Expo SDK 58 + React Native + TypeScript
- Expo Camera
- TensorFlow.js (CPU) + COCO-SSD lite MobileNet
- Expo Router

TensorFlow Lite / YOLO need a custom native build, so this project uses TensorFlow.js instead and stays compatible with Expo Go.

## Detected objects

Person, phone, bottle, laptop, book, cup, backpack, chair.

## Project layout

```text
src/
  app/           screens
  components/    camera UI
  hooks/         detection loop
  services/      camera + model
  utils/         box helpers
assets/model/    local COCO-SSD weights
```
