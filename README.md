# 🛒 Compras — App

App móvil de listas de compra compartidas en pareja. Sincronización en tiempo real, organizada por categorías.

## Stack

| Tecnología          | Uso                          |
| ------------------- | ---------------------------- |
| React Native + Expo | App móvil                    |
| Socket.io client    | Sync en tiempo real          |
| Axios               | Llamadas a la API            |
| AsyncStorage        | Persistencia de sesión local |
| React Navigation    | Navegación entre pantallas   |

## Funcionalidades

- 📋 **Múltiples listas** — una por tienda (Mercadona, Carrefour, Trastero...)
- 🏷️ **19 categorías** — con emoji por elemento
- ✅ **Toggle necesario** — marca lo que necesitas comprar esta semana
- 🔄 **Sync en tiempo real** — tu pareja ve los cambios al instante
- 🔍 **Búsqueda** — filtra por nombre en tiempo real
- 🏷️ **Filtro por categorías** — modal con checkboxes
- 📊 **Contador por categoría** — `2/5 pendientes`
- 📦 **Categorías colapsables** — reduce la vista de secciones largas
- 👆 **Swipe para eliminar** — desliza a la izquierda
- 📤 **Compartir código** — invita a tu pareja con un toque
- 🌙 **Tema automático** — detecta el tema del sistema (claro/oscuro)

## Estructura

```
compras-app/
├── src/
│   ├── api/
│   │   └── index.js          # Todas las llamadas al backend
│   ├── constants/
│   │   └── index.js          # Colores, categorías, URL backend
│   ├── context/
│   │   └── AppContext.js     # Estado global + Socket.io
│   └── screens/
│       ├── BienvenidaScreen.js  # Login / crear pareja
│       ├── ListasScreen.js      # Lista de tiendas
│       └── ElementosScreen.js   # Elementos de una lista
├── App.js                    # Navegación principal
└── app.json                  # Configuración Expo
```

## Puesta en marcha en desarrollo

### Requisitos

- Node.js >= 20.19
- Expo Go instalado en el móvil ([Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent))
- Backend corriendo (ver repo `compras-backend`)

### Instalación

```bash
npm install --legacy-peer-deps
```

### Configuración

Edita `src/constants/index.js` y cambia la URL del backend:

```js
export const API_URL = 'http://tu-backend:3000';
```

### Arrancar

```bash
npx expo start
```

Escanea el QR con Expo Go o la cámara del móvil.

## Build APK (producción)

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build -p android --profile preview
```

El APK se genera en la nube (~10 min) y se descarga desde expo.dev.

## Actualizar sin reinstalar

```bash
eas update --branch preview --message "descripción del cambio"
```

La app descarga la actualización automáticamente al abrirse.

## Sistema de parejas

No hay registro ni login. El primer usuario crea una "pareja" y obtiene un **código de 6 letras**. El segundo usuario lo introduce en "Unirme con código" y ambos quedan sincronizados en tiempo real mediante WebSockets.

## Categorías disponibles

🍎 Frutas · 🥦 Verduras · 🥩 Carnes y Pescados · 🥛 Lácteos y Huevos · 🍞 Panadería · 🍪 Galletas y Dulces · 🍫 Chocolate · ☕ Café e Infusiones · 🧃 Bebidas · 🍚 Arroz y Pasta · 🫘 Legumbres · 🥜 Frutos Secos · 🥫 Conservas y Salsas · 🫙 Especias y Condimentos · 🧴 Cremas y Cuidado Personal · 🧹 Limpieza · 🧊 Congelados · 🍼 Bebé · 🛍️ Otros · 🕯️ Hogar · ♨️ Cocina
