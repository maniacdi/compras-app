# Diseño: Escáner OpenFoodFacts + Selector de iconos

Fecha: 2026-07-24
App: compras-app (Expo React Native, listas de compra compartidas)

## Objetivo

Dos features en la pantalla de elementos (`ElementosScreen.js`):

1. **Escanear producto por código de barras** contra OpenFoodFacts para precargar
   el nombre al añadir un elemento. El usuario solo elige la categoría y el icono.
2. **Selector de iconos solo-iconos**: sustituir el `TextInput` de emoji libre por
   un picker visual con el set unicode completo, sin entrada de texto.

## Fuera de alcance

- NO se tocan las categorías de `src/constants/index.js` (incluidos `trastero`/"Bebé"
  y `bicarbonato`): son intencionales y están en uso.
- No se añaden tests en esta iteración (no hay runner configurado).
- No se refactorizan los `catch {}` vacíos ni el manejo de socket.

## Feature 1 — Escáner + OpenFoodFacts

### Lectura del código (cámara + fallback manual)

- Dependencia nueva: `expo-camera` (soportada en Expo Go SDK 55).
- Componente nuevo `src/components/ScannerModal.js`:
  - Modal a pantalla completa con `CameraView`.
  - `barcodeScannerSettings={{ barcodeTypes: ['ean13','ean8','upc_a'] }}`.
  - `onBarcodeScanned` → devuelve el EAN al padre (con guard para no disparar
    múltiples veces: flag `escaneado` que se resetea al reabrir).
  - Pide permiso de cámara con `useCameraPermissions`. Si se deniega, muestra
    aviso y ofrece la entrada manual.
  - Botón "Escribir número" → alterna a un `TextInput` (keyboardType `numeric`)
    con botón "Buscar" que devuelve el EAN tecleado.
  - Botón cerrar (✕).
- Props: `visible`, `onClose`, `onCodigo(ean)`.

### API OpenFoodFacts

- En `src/api/index.js`, función nueva `buscarProducto(ean)`:
  - `GET https://world.openfoodfacts.org/api/v2/product/{ean}.json?fields=product_name,product_name_es,brands`
  - Usa una instancia axios aparte (baseURL distinta al backend propio) o axios
    directo con URL absoluta. Timeout 10s.
  - Devuelve `{ encontrado: bool, nombre, marca }`:
    - `nombre` = `product_name_es || product_name || ''`
    - `marca` = primer valor de `brands` (string separado por comas) o `''`
    - `encontrado` = `status === 1` en la respuesta OFF.

### Flujo en ElementosScreen

1. En el modal Añadir/Editar, botón `📷` en la cabecera abre `ScannerModal`.
2. Al recibir EAN → cerrar scanner → `setCargando`/indicador → `buscarProducto(ean)`.
3. Si `encontrado`: `setFNombre(nombre)`, y si hay `marca` → `setFNotas(marca)`
   (sin pisar notas ya escritas: solo si `fNotas` vacío).
4. Si no encontrado o error de red: `Alert` "Producto no encontrado, complétalo a
   mano". El modal Añadir queda abierto con lo que hubiera.
5. Categoría e icono siempre los elige el usuario (no autorrelleno).

## Feature 2 — Selector de iconos (set unicode completo)

### Datos de emojis

- Módulo nuevo `src/constants/emojis.js`:
  - Estructura `EMOJI_SECCIONES = [{ titulo, emojis: [...] }, ...]` cubriendo el
    set unicode común (Caras y emociones, Personas, Animales y naturaleza,
    Comida y bebida, Viajes y lugares, Actividades, Objetos, Símbolos, Banderas).
  - Objetivo ~3700 emojis. Generados por rangos de codepoints donde sea posible
    para no escribir a mano miles de literales; secciones que no mapean a rango
    contiguo se listan explícitas.
  - Export `EMOJI_PLANO` (array plano) para búsquedas si hiciera falta.

### Componente IconPicker

- `src/components/IconPicker.js`, props `value`, `onChange`, `colors`,
  `categoriaEmoji` (emoji de la categoría actual, para preselección/atajo).
- UI: disparador (muestra el emoji actual, tocarlo abre el modal) + modal con:
  - `FlatList` con `numColumns` (p. ej. 8), `getItemLayout` para windowing.
  - Datos = lista aplanada con marcadores de sección, o `SectionList`; se usa el
    que rinda mejor con ~3700 items. Cabeceras de sección visibles.
  - El emoji de la categoría actual aparece destacado arriba (fila "sugerido").
  - Al tocar un emoji → `onChange(emoji)` + cerrar modal.
  - Cero `TextInput`: no hay búsqueda por texto (requisito explícito).
- Rendimiento: `initialNumToRender` acotado, `maxToRenderPerBatch`,
  `windowSize`, `removeClippedSubviews`.

### Integración

- `ElementosScreen.js:609-615`: sustituir el bloque `<Text>Emoji</Text>` +
  `<TextInput>` por `<IconPicker value={fEmoji} onChange={setFEmoji}
  categoriaEmoji={getCategoriaInfo(fCategoria).emoji} colors={colors} />`.
- Valor por defecto de `fEmoji` al abrir: si es alta nueva, usar el emoji de la
  categoría seleccionada por defecto en vez de `🛍️` fijo (hereda de categoría).
- Reuso en `ListasScreen` (icono de lista): opcional, mismo componente. Se deja
  preparado pero la integración en Listas es un extra no bloqueante.

## Archivos

Nuevos:
- `src/constants/emojis.js`
- `src/components/IconPicker.js`
- `src/components/ScannerModal.js`

Modificados:
- `src/api/index.js` — `buscarProducto(ean)`
- `src/screens/ElementosScreen.js` — botón escáner + wiring OFF + IconPicker
- `package.json` — `expo-camera`

## Consideraciones

- **Permisos cámara**: añadir uso en `app.json` (plugin `expo-camera` /
  `NSCameraUsageDescription` iOS, `CAMERA` Android) para que el build lo declare.
- **Web**: el escáner por cámara no funciona en web; el fallback manual sí.
- **Modelo de datos sin cambios**: el item sigue guardando `emoji` (string) y
  `nombre`; OFF solo precarga texto, no se persiste imagen ni EAN.
- **Errores de red OFF**: no rompen el flujo de alta manual.
