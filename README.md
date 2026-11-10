# Lens

Reconocimiento de objetos con Edge AI en una aplicación móvil.

Toma una foto y Lens detecta objetos cotidianos en el propio teléfono (sin nube).

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

## Objetos

Persona, teléfono, botella, portátil, libro, taza, mochila, silla.
