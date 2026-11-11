# Lens

Reconocimiento de objetos con Edge AI en una aplicación móvil.

Toma una foto y Lens detecta objetos cotidianos en el propio teléfono (sin nube).

presentación: https://uninorte-my.sharepoint.com/:p:/g/personal/galvisca_uninorte_edu_co/IQADwzWWcLOCSIM9T7QRzHNhASNGQQzD73em1HYQvCrfug4?e=35GnLF

video: https://uninorte-my.sharepoint.com/:v:/g/personal/galvisca_uninorte_edu_co/IQAGGyf_pENsSK4D5E40Kq_nAVUD74b50r1EuFrja6bAhFg?nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJTdHJlYW1XZWJBcHAiLCJyZWZlcnJhbFZpZXciOiJTaGFyZURpYWxvZy1MaW5rIiwicmVmZXJyYWxBcHBQbGF0Zm9ybSI6IldlYiIsInJlZmVycmFsTW9kZSI6InZpZXcifX0%3D&e=JvwXBi

## Ejecutar

```bash
npm install
npx expo start
```

## Verificar

```bash
npm run typecheck
npm test
```

## Flujo

1. Cámara a pantalla completa
2. **Tomar foto**
3. Progreso real por etapa (copia de pesos, carga en MB, captura, inferencia)
4. Resultado con cajas; **Nueva foto** vuelve a la cámara

## Arquitectura

Clean Architecture en `src/`:

- `domain/` — entidades, casos de uso, puertos (sin Expo/TF.js)
- `data/` — implementaciones de repositorios (cámara, detector)
- `presentation/` — hooks y componentes UI
- `di/` — composition root
- `app/` — rutas Expo Router

## Objetos

Persona, teléfono, botella, portátil, libro, taza, mochila, silla.
