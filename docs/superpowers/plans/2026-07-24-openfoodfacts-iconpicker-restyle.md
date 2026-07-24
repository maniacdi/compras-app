# Escáner OpenFoodFacts + IconPicker + Restyle brutalista — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir escaneo de código de barras contra OpenFoodFacts para precargar el nombre de un elemento, un selector de iconos solo-visual (sin texto), y aplicar un restyle minimalista brutalista a la app.

**Architecture:** Expo React Native. Nuevos componentes desacoplados (`ScannerModal`, `IconPicker`) y una función de API OFF aislada. El restyle se hace ajustando tokens compartidos en `constants` y las `StyleSheet` de cada pantalla, sin tocar lógica ni el modelo de datos.

**Tech Stack:** Expo SDK 55, React 19.2, React Native 0.83.2, axios, socket.io-client, expo-camera (nuevo).

## Global Constraints

- Expo SDK `~55.0.4`, React `19.2.0`, React Native `0.83.2`. No subir versiones.
- **No hay test runner configurado.** Verificación = arrancar la app (`npx expo start`) y comprobar manualmente + que el bundler no da error. No se añade jest en esta iteración.
- **No modificar `CATEGORIAS`** en `src/constants/index.js` (incluidos `trastero`/"Bebé" y `bicarbonato`): son intencionales y están en uso.
- Modelo de datos del elemento sin cambios: sigue con `emoji` (string) y `nombre`. OFF solo precarga texto; no se persiste imagen ni EAN.
- Un solo color de acento: `primary` verde `#4CAF50`. Base monocroma.
- Restyle: `borderRadius: 0` en todo, sin `elevation`/`shadow*`, bordes sólidos, labels/headers en MAYÚSCULAS con `fontWeight '800'`.
- Commits en español, formato `feat:`/`style:`/`chore:`.

## File Structure

Nuevos:
- `src/constants/emojis.js` — set de emojis agrupado por secciones + array plano.
- `src/components/IconPicker.js` — disparador + modal grid de iconos, sin texto.
- `src/components/ScannerModal.js` — cámara EAN + fallback manual.

Modificados:
- `package.json` — dependencia `expo-camera`.
- `app.json` — plugin/permiso de cámara.
- `src/api/index.js` — `buscarProducto(ean)`.
- `src/constants/index.js` — token `UI` + ajustes de color para restyle.
- `src/screens/ElementosScreen.js` — botón escáner, flujo OFF, IconPicker, restyle.
- `src/screens/ListasScreen.js` — restyle (+ IconPicker opcional).
- `src/screens/BienvenidaScreen.js` — restyle.
- `App.js` — header de navegación restyle.

---

### Task 1: Dependencia expo-camera + permisos

**Files:**
- Modify: `package.json`
- Modify: `app.json`

**Interfaces:**
- Produces: dependencia `expo-camera` disponible; permisos de cámara declarados.

- [ ] **Step 1: Instalar expo-camera con la versión alineada al SDK**

Run:
```bash
npx expo install expo-camera
```
Expected: añade `expo-camera` a `dependencies` en `package.json` con versión compatible con Expo 55. Sin errores de peer deps.

- [ ] **Step 2: Declarar el plugin de cámara en app.json**

En `app.json`, dentro de `expo.plugins` (créalo si no existe) añadir:
```json
[
  "expo-camera",
  {
    "cameraPermission": "La app usa la cámara para escanear el código de barras de los productos."
  }
]
```
Si `expo.plugins` ya existe como array, añade la entrada; no dupliques el array.

- [ ] **Step 3: Verificar que arranca**

Run:
```bash
npx expo start --clear
```
Expected: el bundler compila sin errores de módulo. Cortar con Ctrl+C tras ver "Metro waiting".

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json app.json
git commit -m "chore: añadir expo-camera y permiso de cámara"
```

---

### Task 2: Función API OpenFoodFacts

**Files:**
- Modify: `src/api/index.js`

**Interfaces:**
- Produces: `buscarProducto(ean: string) => Promise<{ encontrado: boolean, nombre: string, marca: string }>`

- [ ] **Step 1: Añadir la función al final de `src/api/index.js`**

```javascript
// ── OpenFoodFacts (API externa) ──────────────────────────────
const OFF_BASE = 'https://world.openfoodfacts.org';

export const buscarProducto = async (ean) => {
  const url = `${OFF_BASE}/api/v2/product/${encodeURIComponent(
    ean,
  )}.json?fields=product_name,product_name_es,brands`;
  try {
    const { data } = await axios.get(url, { timeout: 10000 });
    if (data?.status !== 1 || !data.product) {
      return { encontrado: false, nombre: '', marca: '' };
    }
    const p = data.product;
    const nombre = (p.product_name_es || p.product_name || '').trim();
    const marca = (p.brands || '').split(',')[0].trim();
    return { encontrado: Boolean(nombre) || Boolean(marca), nombre, marca };
  } catch {
    return { encontrado: false, nombre: '', marca: '' };
  }
};
```

Nota: usa `axios` directamente (import ya presente en el fichero) con URL absoluta, no la instancia `api` (que apunta al backend propio).

- [ ] **Step 2: Verificar respuesta real con un EAN conocido**

Run (EAN de Nutella, existe en OFF):
```bash
node -e "const a=require('axios');a.get('https://world.openfoodfacts.org/api/v2/product/3017620422003.json?fields=product_name,product_name_es,brands').then(r=>console.log(r.data.status, r.data.product.product_name, r.data.product.brands)).catch(e=>console.log('ERR',e.message))"
```
Expected: imprime `1 Nutella ...` y una marca. Confirma la forma de la respuesta que consume la función.

- [ ] **Step 3: Commit**

```bash
git add src/api/index.js
git commit -m "feat: buscar producto en OpenFoodFacts por EAN"
```

---

### Task 3: Módulo de datos de emojis

**Files:**
- Create: `src/constants/emojis.js`

**Interfaces:**
- Produces:
  - `EMOJI_SECCIONES: Array<{ titulo: string, emojis: string[] }>`
  - `EMOJI_PLANO: string[]`

**Nota de alcance (leer antes de implementar):** el set unicode completo (~3700) incluye variantes de tono de piel, secuencias ZWJ y banderas, que NO se pueden generar por rango de codepoints y muchas no renderizan sueltas. Este módulo genera el set de **emojis de un solo codepoint** por bloques unicode (~1800), que es lo máximo razonable sin añadir un paquete de datos. Si tras revisar se quiere el set completo real, la alternativa es añadir la dependencia `unicode-emoji-json` y mapear su salida a `EMOJI_SECCIONES` (mismo interface). Confirmar con el usuario si ~1800 es suficiente o se quiere la dependencia.

- [ ] **Step 1: Crear `src/constants/emojis.js`**

```javascript
// Genera emojis de un solo codepoint por bloques unicode.
// No incluye secuencias ZWJ, tonos de piel ni banderas (no generables por rango).

const rango = (a, b) => {
  const out = [];
  for (let cp = a; cp <= b; cp++) out.push(String.fromCodePoint(cp));
  return out;
};

export const EMOJI_SECCIONES = [
  {
    titulo: 'Caras y emociones',
    emojis: [...rango(0x1f600, 0x1f64f), ...rango(0x1f910, 0x1f92f)],
  },
  {
    titulo: 'Comida y naturaleza',
    emojis: rango(0x1f300, 0x1f5ff),
  },
  {
    titulo: 'Objetos nuevos y comida',
    emojis: [...rango(0x1f900, 0x1f90f), ...rango(0x1f930, 0x1f9ff)],
  },
  {
    titulo: 'Más objetos',
    emojis: rango(0x1fa70, 0x1faff),
  },
  {
    titulo: 'Viajes y lugares',
    emojis: rango(0x1f680, 0x1f6ff),
  },
  {
    titulo: 'Símbolos',
    emojis: rango(0x2600, 0x26ff),
  },
  {
    titulo: 'Dingbats',
    emojis: rango(0x2700, 0x27bf),
  },
];

export const EMOJI_PLANO = EMOJI_SECCIONES.flatMap((s) => s.emojis);
```

- [ ] **Step 2: Verificar que carga y cuenta**

Run:
```bash
node -e "const m=require('./src/constants/emojis.js'); console.log(m.EMOJI_SECCIONES.length,'secciones', m.EMOJI_PLANO.length,'emojis')"
```
Expected: imprime `7 secciones` y un total ~1800. (Si falla por `export`, es normal en node CJS puro; alternativa de verificación: importarlo desde la app en Task 4.)

- [ ] **Step 3: Commit**

```bash
git add src/constants/emojis.js
git commit -m "feat: módulo de emojis por secciones"
```

---

### Task 4: Componente IconPicker

**Files:**
- Create: `src/components/IconPicker.js`

**Interfaces:**
- Consumes: `EMOJI_SECCIONES` de `src/constants/emojis.js`; `UI` de `src/constants` (se define en Task 7; usar `borderRadius: 0` literal aquí para no bloquear).
- Produces: `export default IconPicker` con props `{ value: string, onChange: (emoji: string) => void, colors: object, categoriaEmoji?: string }`.

- [ ] **Step 1: Crear `src/components/IconPicker.js`**

```javascript
import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { EMOJI_SECCIONES } from '../constants/emojis';

const COLS = 8;

// Aplana secciones a filas: cabecera o fila de emojis.
function construirFilas() {
  const filas = [];
  EMOJI_SECCIONES.forEach((sec) => {
    filas.push({ tipo: 'header', key: `h-${sec.titulo}`, titulo: sec.titulo });
    for (let i = 0; i < sec.emojis.length; i += COLS) {
      filas.push({
        tipo: 'fila',
        key: `${sec.titulo}-${i}`,
        emojis: sec.emojis.slice(i, i + COLS),
      });
    }
  });
  return filas;
}

const FILAS = construirFilas();

export default function IconPicker({ value, onChange, colors, categoriaEmoji }) {
  const [open, setOpen] = useState(false);
  const s = styles(colors);

  const elegir = (e) => {
    onChange(e);
    setOpen(false);
  };

  return (
    <>
      <TouchableOpacity style={s.trigger} onPress={() => setOpen(true)}>
        <Text style={s.triggerEmoji}>{value}</Text>
        <Text style={s.triggerLabel}>CAMBIAR ICONO</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType='slide'>
        <View style={s.overlay}>
          <View style={s.box}>
            <View style={s.headerRow}>
              <Text style={s.titulo}>ICONO</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Text style={s.cerrar}>✕</Text>
              </TouchableOpacity>
            </View>

            {categoriaEmoji ? (
              <View style={s.sugeridoRow}>
                <Text style={s.sugeridoLabel}>CATEGORÍA</Text>
                <TouchableOpacity
                  style={s.sugeridoBtn}
                  onPress={() => elegir(categoriaEmoji)}
                >
                  <Text style={s.sugeridoEmoji}>{categoriaEmoji}</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <FlatList
              data={FILAS}
              keyExtractor={(it) => it.key}
              initialNumToRender={12}
              maxToRenderPerBatch={12}
              windowSize={10}
              removeClippedSubviews
              renderItem={({ item }) =>
                item.tipo === 'header' ? (
                  <Text style={s.seccion}>{item.titulo}</Text>
                ) : (
                  <View style={s.fila}>
                    {item.emojis.map((e) => (
                      <TouchableOpacity
                        key={e}
                        style={[s.celda, e === value && s.celdaSel]}
                        onPress={() => elegir(e)}
                      >
                        <Text style={s.celdaEmoji}>{e}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )
              }
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = (c) =>
  StyleSheet.create({
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 2,
      borderColor: c.border,
      borderRadius: 0,
      padding: 12,
      backgroundColor: c.surfaceAlt,
    },
    triggerEmoji: { fontSize: 28 },
    triggerLabel: {
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 1,
      color: c.textSub,
    },
    overlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
    box: {
      backgroundColor: c.surface,
      borderTopWidth: 2,
      borderColor: c.border,
      padding: 16,
      height: '80%',
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    titulo: { fontSize: 20, fontWeight: '800', letterSpacing: 1, color: c.text },
    cerrar: { fontSize: 18, color: c.textMuted, paddingHorizontal: 4 },
    sugeridoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    sugeridoLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1, color: c.textMuted },
    sugeridoBtn: { borderWidth: 2, borderColor: c.primary, padding: 8 },
    sugeridoEmoji: { fontSize: 26 },
    seccion: {
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1,
      color: c.textMuted,
      marginTop: 12,
      marginBottom: 6,
      textTransform: 'uppercase',
    },
    fila: { flexDirection: 'row' },
    celda: {
      flex: 1,
      aspectRatio: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    celdaSel: { backgroundColor: c.primary },
    celdaEmoji: { fontSize: 26 },
  });
```

- [ ] **Step 2: Verificar en la app**

Temporalmente, en `ElementosScreen.js` no hace falta aún; se integra en Task 6. Para verificar aislado, arrancar la app y comprobar que no hay error de import:
```bash
npx expo start --clear
```
Expected: bundler sin errores. (La UI se prueba al integrar en Task 6.)

- [ ] **Step 3: Commit**

```bash
git add src/components/IconPicker.js
git commit -m "feat: IconPicker solo-iconos con grid por secciones"
```

---

### Task 5: Componente ScannerModal

**Files:**
- Create: `src/components/ScannerModal.js`

**Interfaces:**
- Consumes: `expo-camera` (`CameraView`, `useCameraPermissions`).
- Produces: `export default ScannerModal` con props `{ visible: boolean, onClose: () => void, onCodigo: (ean: string) => void, colors: object }`.

- [ ] **Step 1: Crear `src/components/ScannerModal.js`**

```javascript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function ScannerModal({ visible, onClose, onCodigo, colors }) {
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [manual, setManual] = useState(false);
  const [ean, setEan] = useState('');
  const [escaneado, setEscaneado] = useState(false);
  const s = styles(colors);

  useEffect(() => {
    if (visible) {
      setEscaneado(false);
      setManual(false);
      setEan('');
    }
  }, [visible]);

  const handleScan = ({ data }) => {
    if (escaneado) return;
    setEscaneado(true);
    onCodigo(data);
  };

  const handleManual = () => {
    if (!ean.trim()) return;
    onCodigo(ean.trim());
  };

  const permisoConcedido = permiso?.granted;

  return (
    <Modal visible={visible} animationType='slide' onRequestClose={onClose}>
      <View style={s.container}>
        <View style={s.headerRow}>
          <Text style={s.titulo}>ESCANEAR</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={s.cerrar}>✕</Text>
          </TouchableOpacity>
        </View>

        {manual ? (
          <View style={s.manualBox}>
            <Text style={s.label}>CÓDIGO EAN</Text>
            <TextInput
              style={s.input}
              value={ean}
              onChangeText={setEan}
              keyboardType='numeric'
              placeholder='Ej: 3017620422003'
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            <TouchableOpacity style={s.btn} onPress={handleManual}>
              <Text style={s.btnText}>BUSCAR</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setManual(false)}>
              <Text style={s.linkText}>← USAR CÁMARA</Text>
            </TouchableOpacity>
          </View>
        ) : !permisoConcedido ? (
          <View style={s.manualBox}>
            <Text style={s.aviso}>
              Se necesita permiso de cámara para escanear.
            </Text>
            <TouchableOpacity style={s.btn} onPress={pedirPermiso}>
              <Text style={s.btnText}>DAR PERMISO</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setManual(true)}>
              <Text style={s.linkText}>ESCRIBIR NÚMERO</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <CameraView
              style={s.camera}
              barcodeScannerSettings={{
                barcodeTypes: ['ean13', 'ean8', 'upc_a'],
              }}
              onBarcodeScanned={handleScan}
            />
            <TouchableOpacity
              style={s.manualLink}
              onPress={() => setManual(true)}
            >
              <Text style={s.btnText}>ESCRIBIR NÚMERO</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = (c) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      paddingTop: 52,
      borderBottomWidth: 2,
      borderColor: c.border,
    },
    titulo: { fontSize: 20, fontWeight: '800', letterSpacing: 1, color: c.text },
    cerrar: { fontSize: 18, color: c.textMuted },
    camera: { flex: 1 },
    manualLink: {
      padding: 16,
      alignItems: 'center',
      borderTopWidth: 2,
      borderColor: c.border,
      backgroundColor: c.primary,
    },
    manualBox: { padding: 24, gap: 16 },
    label: { fontSize: 13, fontWeight: '800', letterSpacing: 1, color: c.textSub },
    aviso: { fontSize: 16, color: c.text, textAlign: 'center' },
    input: {
      backgroundColor: c.surfaceAlt,
      borderWidth: 2,
      borderColor: c.border,
      borderRadius: 0,
      padding: 14,
      fontSize: 18,
      color: c.text,
    },
    btn: {
      backgroundColor: c.primary,
      borderRadius: 0,
      padding: 16,
      alignItems: 'center',
    },
    btnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 1 },
    linkText: {
      color: c.text,
      fontSize: 14,
      fontWeight: '800',
      letterSpacing: 1,
      textAlign: 'center',
    },
  });
```

- [ ] **Step 2: Verificar que compila**

```bash
npx expo start --clear
```
Expected: bundler sin errores de import de `expo-camera`. Prueba de cámara real se hace al integrar (Task 6) en dispositivo/emulador con cámara.

- [ ] **Step 3: Commit**

```bash
git add src/components/ScannerModal.js
git commit -m "feat: ScannerModal cámara EAN con fallback manual"
```

---

### Task 6: Integrar escáner + OFF + IconPicker en ElementosScreen

**Files:**
- Modify: `src/screens/ElementosScreen.js`

**Interfaces:**
- Consumes: `buscarProducto` (Task 2), `IconPicker` (Task 4), `ScannerModal` (Task 5), `getCategoriaInfo` (ya existe).

- [ ] **Step 1: Añadir imports**

En la cabecera de imports de `ElementosScreen.js`:
```javascript
import IconPicker from '../components/IconPicker';
import ScannerModal from '../components/ScannerModal';
```
Y añadir `buscarProducto` al import desde `../api`:
```javascript
import {
  obtenerElementos,
  crearElemento,
  editarElemento,
  toggleElemento,
  eliminarElemento,
  marcarTodos,
  desmarcarTodos,
  buscarProducto,
} from '../api';
```

- [ ] **Step 2: Añadir estado del escáner y del "buscando"**

Junto a los demás `useState` del componente `ElementosScreen` (tras `fNotas`):
```javascript
const [scannerVisible, setScannerVisible] = useState(false);
const [buscandoOFF, setBuscandoOFF] = useState(false);
```

- [ ] **Step 3: Emoji por defecto heredado de categoría al abrir alta**

En `abrirModal`, cambiar la línea del emoji por defecto para que, en alta nueva, herede el emoji de la categoría:
```javascript
const abrirModal = (el = null) => {
  setEditando(el);
  setFNombre(el?.nombre || '');
  setFCategoria(el?.categoria || 'otros');
  setFEmoji(el?.emoji || getCategoriaInfo(el?.categoria || 'otros').emoji);
  setFCantidad(String(el?.cantidad || '1'));
  setFUnidad(el?.unidad || 'ud');
  setFNotas(el?.notas || '');
  setModal(true);
};
```

- [ ] **Step 4: Handler de código escaneado**

Añadir dentro del componente, antes del `return`:
```javascript
const handleCodigo = async (ean) => {
  setScannerVisible(false);
  setBuscandoOFF(true);
  try {
    const { encontrado, nombre, marca } = await buscarProducto(ean);
    if (encontrado) {
      if (nombre) setFNombre(nombre);
      if (marca && !fNotas.trim()) setFNotas(marca);
    } else {
      Alert.alert(
        'No encontrado',
        'No hay datos de ese producto. Complétalo a mano.',
      );
    }
  } finally {
    setBuscandoOFF(false);
  }
};
```

- [ ] **Step 5: Botón escáner en la cabecera del modal Añadir/Editar**

En el `modalHeaderRow` del modal de añadir/editar (el que muestra "Añadir elemento"), añadir un botón 📷 junto al título. Reemplazar ese `modalHeaderRow`:
```javascript
<View style={s.modalHeaderRow}>
  <Text style={s.modalTitulo}>
    {editando ? 'Editar elemento' : 'Añadir elemento'}
  </Text>
  <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
    <TouchableOpacity onPress={() => setScannerVisible(true)}>
      <Text style={{ fontSize: 22 }}>📷</Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={() => setModal(false)}>
      <Text style={s.cerrarBtn}>✕</Text>
    </TouchableOpacity>
  </View>
</View>
```

- [ ] **Step 6: Sustituir el TextInput de emoji por IconPicker**

Reemplazar el bloque actual (`<Text style={s.label}>Emoji</Text>` + su `<TextInput>`):
```javascript
<Text style={s.label}>Icono</Text>
<IconPicker
  value={fEmoji}
  onChange={setFEmoji}
  categoriaEmoji={getCategoriaInfo(fCategoria).emoji}
  colors={colors}
/>
```

- [ ] **Step 7: Indicador "buscando" y montar el ScannerModal**

Justo bajo el campo Nombre, mostrar el estado de búsqueda cuando aplique:
```javascript
{buscandoOFF && (
  <Text style={{ color: colors.textMuted, marginTop: 6 }}>
    Buscando producto…
  </Text>
)}
```
Y antes del cierre del `Modal` de añadir/editar (o tras él, dentro del return principal), montar el scanner:
```javascript
<ScannerModal
  visible={scannerVisible}
  onClose={() => setScannerVisible(false)}
  onCodigo={handleCodigo}
  colors={colors}
/>
```

- [ ] **Step 8: Verificar en dispositivo**

```bash
npx expo start
```
Comprobar manualmente:
- Abrir el `+` de elementos → el campo Icono muestra el picker (sin teclado de texto).
- Elegir categoría → el icono por defecto es el de la categoría.
- Tocar 📷 → abre cámara; escanear un producto real (o usar "Escribir número" con `3017620422003`) → el nombre se rellena.
- Producto inexistente (`0000000000000`) → alerta "No encontrado".

- [ ] **Step 9: Commit**

```bash
git add src/screens/ElementosScreen.js
git commit -m "feat: escaneo OpenFoodFacts e IconPicker en alta de elementos"
```

---

### Task 7: Tokens de estilo + restyle de ElementosScreen

**Files:**
- Modify: `src/constants/index.js`
- Modify: `src/screens/ElementosScreen.js`

**Interfaces:**
- Produces: `UI = { radius: 0, border: 1.5, borderStrong: 2 }` exportado desde `src/constants/index.js`.

- [ ] **Step 1: Añadir token UI a constants**

Al final de `src/constants/index.js`:
```javascript
export const UI = { radius: 0, border: 1.5, borderStrong: 2 };
```

- [ ] **Step 2: Restyle de la StyleSheet de ElementosScreen**

En `const styles = (c) => StyleSheet.create({...})` de `ElementosScreen.js`, aplicar estos cambios de valores (mantener el resto de propiedades de cada clave):

- `search`: `borderRadius: 0`, `borderWidth: 1.5`.
- `filterChip`: `borderRadius: 0`, `borderWidth: 1.5`.
- `actionChip`: `borderRadius: 0`, `borderWidth: 1.5`.
- `seccionHeader`: añadir `borderBottomWidth: 2`, `borderBottomColor: c.text`, `paddingVertical: 10`.
- `seccionNombre`: `fontWeight: '800'`, `color: c.text` (antes `textMuted`).
- `seccionContador`: convertir en bloque invertido — sustituir por:
  ```javascript
  seccionContador: {
    fontSize: F.sm,
    fontWeight: '800',
    color: '#fff',
    backgroundColor: c.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 6,
    overflow: 'hidden',
  },
  ```
  (y en el JSX de `SeccionCategoria`, quitar el override condicional `necesarios > 0 && { color: colors.primary }` del contador, ya que ahora el bloque es fijo.)
- `fab`: cuadrado y duro — `borderRadius: 0`, quitar `elevation`, `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`; añadir `borderWidth: 2`, `borderColor: c.text`.
- `modalBox`: `borderTopLeftRadius: 0`, `borderTopRightRadius: 0`, añadir `borderTopWidth: 2`, `borderColor: c.border`.
- `modalTitulo`: `fontWeight: '800'`, `letterSpacing: 0.5`.
- `input`: `borderRadius: 0`, `borderWidth: 1.5`.
- `dropdown`: `borderRadius: 0`, `borderWidth: 1.5`.
- `label`: `fontWeight: '800'`, `letterSpacing: 1`, y en el JSX no hace falta cambiar el texto, pero añadir `textTransform: 'uppercase'`.
- `btnCancel`: `borderRadius: 0`, `borderWidth: 2`.
- `btnSave`: `borderRadius: 0`.
- `btnApply`: `borderRadius: 0`.
- `catRow`: `borderRadius: 0`; sustituir el resaltado translúcido: en el JSX de `CategoriaSelector` y del filtro, cambiar `backgroundColor: colors.primary + '18'` por `backgroundColor: colors.primary`, y el texto seleccionado a `color: '#fff'`.

- [ ] **Step 3: Restyle de la StyleSheet de items (itemStyles)**

En `const itemStyles = (c) => StyleSheet.create({...})`:
- `swipeContainer`: `borderRadius: 0`.
- `swipeBg`: `borderRadius: 0`.
- `item`: `borderRadius: 0`, `borderWidth: 0`, `borderBottomWidth: 1.5`, `borderColor: c.border` (fila con hairline inferior, sin card).
- `itemChecked`: mantener cambio de color de fondo pero sin bordes redondeados.
- `itemNombre`: `fontWeight: '700'`.

- [ ] **Step 4: Verificar visualmente**

```bash
npx expo start
```
Expected: elementos como filas planas separadas por líneas, cabeceras de categoría en mayúsculas con regla y contador en bloque verde, FAB cuadrado, modales sin esquinas redondeadas.

- [ ] **Step 5: Commit**

```bash
git add src/constants/index.js src/screens/ElementosScreen.js
git commit -m "style: restyle brutalista de elementos"
```

---

### Task 8: Restyle de ListasScreen

**Files:**
- Modify: `src/screens/ListasScreen.js`

- [ ] **Step 1: Restyle de la StyleSheet**

En `styles` de `ListasScreen.js`:
- `card`: ya es fila con `borderBottomWidth: 1`; subir a `borderBottomWidth: 1.5`, `borderBottomColor: c.border`, `paddingHorizontal: 8`.
- `cardNombre`: `fontWeight: '700'`.
- `saludo`: `fontWeight: '800'`, `textTransform: 'uppercase'`, `letterSpacing: 0.5`.
- `fab`: `borderRadius: 0`, quitar `elevation`/`shadow*`, añadir `borderWidth: 2`, `borderColor: c.text`.
- `modalBox`: `borderTopLeftRadius: 0`, `borderTopRightRadius: 0`, `borderTopWidth: 2`, `borderColor: c.border`.
- `modalTitulo`: `fontWeight: '800'`, `letterSpacing: 0.5`.
- `input`: `borderRadius: 0`, `borderWidth: 1.5`.
- `label`: `fontWeight: '800'`, `letterSpacing: 1`, `textTransform: 'uppercase'`.
- `emojiBtn`: `borderRadius: 0`, `borderWidth: 1.5`.
- `emojiBtnSel`: sustituir `backgroundColor: c.primaryDark + '22'` por `backgroundColor: c.primary`, `borderColor: c.primary`.
- `btnCancel`: `borderRadius: 0`, `borderWidth: 2`.
- `btnSave`: `borderRadius: 0`.

- [ ] **Step 2: Verificar visualmente**

```bash
npx expo start
```
Expected: listas como filas planas, header en mayúsculas, FAB cuadrado, modal sin esquinas redondeadas.

- [ ] **Step 3: Commit**

```bash
git add src/screens/ListasScreen.js
git commit -m "style: restyle brutalista de listas"
```

---

### Task 9: Restyle de BienvenidaScreen y header de navegación

**Files:**
- Modify: `src/screens/BienvenidaScreen.js`
- Modify: `App.js`

- [ ] **Step 1: Restyle de BienvenidaScreen**

En `styles` de `BienvenidaScreen.js`:
- `titulo`: `fontWeight: '800'`, `textTransform: 'uppercase'`, `letterSpacing: 1`.
- `input`: `borderRadius: 0`, `borderWidth: 1.5`.
- `btnPrimary`: `borderRadius: 0`.
- `btnPrimaryText`: `fontWeight: '800'`, `letterSpacing: 1`, `textTransform: 'uppercase'`.
- `btnSecondary`: `borderRadius: 0`, `borderWidth: 2`.
- `btnSecondaryText`: `fontWeight: '800'`, `letterSpacing: 1`, `textTransform: 'uppercase'`.

- [ ] **Step 2: Header de navegación en App.js**

En `App.js`, en el `Stack.Navigator` con `screenOptions`, añadir para quitar sombra del header y reforzar el título:
```javascript
screenOptions={{
  headerStyle: {
    backgroundColor: colors.surface,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  headerShadowVisible: false,
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: '800', letterSpacing: 0.5 },
}}
```

- [ ] **Step 3: Verificar visualmente**

```bash
npx expo start
```
Expected: pantalla de bienvenida con botones cuadrados y título en mayúsculas; header de navegación plano con línea inferior, sin sombra.

- [ ] **Step 4: Commit**

```bash
git add src/screens/BienvenidaScreen.js App.js
git commit -m "style: restyle brutalista de bienvenida y header"
```

---

## Self-Review

**Spec coverage:**
- Feature 1 (escáner cámara+manual + OFF): Tasks 1, 2, 5, 6. ✓
- Feature 2 (IconPicker solo-iconos, herencia de categoría): Tasks 3, 4, 6. ✓
- Feature 3 (restyle brutalista, sin cards): Tasks 7, 8, 9. ✓
- Categorías intactas: no hay task que toque `CATEGORIAS`. ✓
- Reuso opcional de IconPicker en Listas: documentado como opcional; Task 8 deja el estilo listo. (No bloqueante.)

**Riesgo abierto conocido:** el set de emojis por rangos da ~1800, no los ~3700 pedidos (ver nota en Task 3). Decisión a confirmar en revisión: aceptar ~1800 sin dependencias, o añadir `unicode-emoji-json`.

**Type consistency:** `buscarProducto` devuelve `{ encontrado, nombre, marca }` — consumido igual en Task 6. `IconPicker` props `{ value, onChange, colors, categoriaEmoji }` — usados igual en Task 6. `ScannerModal` props `{ visible, onClose, onCodigo, colors }` — usados igual en Task 6. ✓

**Placeholders:** ninguno pendiente; todos los pasos con código real. ✓
