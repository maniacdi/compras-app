// URL del backend
export const API_URL = 'https://compras-zubigaldi.duckdns.org:8443';

// Categorías con emoji y nombre
export const CATEGORIAS = [
  { id: 'frutas', nombre: 'Frutas', emoji: '🍎' },
  { id: 'verduras', nombre: 'Verduras', emoji: '🥦' },
  { id: 'carnes_pescados', nombre: 'Carnes y Pescados', emoji: '🥩' },
  { id: 'lacteos_huevos', nombre: 'Lácteos y Huevos', emoji: '🥛' },
  { id: 'panaderia', nombre: 'Panadería', emoji: '🍞' },
  { id: 'galletas_dulces', nombre: 'Galletas y Dulces', emoji: '🍪' },
  { id: 'chocolate', nombre: 'Chocolate', emoji: '🍫' },
  { id: 'cafe_infusiones', nombre: 'Café e Infusiones', emoji: '☕' },
  { id: 'bebidas', nombre: 'Bebidas', emoji: '🧃' },
  { id: 'arroz_pasta', nombre: 'Arroz y Pasta', emoji: '🍚' },
  { id: 'legumbres', nombre: 'Legumbres', emoji: '🫘' },
  { id: 'frutos_secos', nombre: 'Frutos Secos', emoji: '🥜' },
  { id: 'conservas_salsas', nombre: 'Conservas y Salsas', emoji: '🥫' },
  { id: 'especias_condimentos', nombre: 'Especias y Condimentos', emoji: '🫙' },
  { id: 'cremas_cuidado', nombre: 'Cremas y Cuidado Personal', emoji: '🧴' },
  { id: 'limpieza', nombre: 'Limpieza', emoji: '🧹' },
  { id: 'congelados', nombre: 'Congelados', emoji: '🧊' },
  { id: 'trastero', nombre: 'Trastero / Almacén', emoji: '🏠' },
  { id: 'hogar', nombre: 'Hogar', emoji: '🕯️' },
  { id: 'bicarbonato', nombre: 'Bicarbonato', emoji: '😶‍🌫️' },
  { id: 'cocina', nombre: 'Cocina', emoji: '♨️' },
  { id: 'otros', nombre: 'Otros', emoji: '🛍️' },
];

export const getCategoriaInfo = (id) =>
  CATEGORIAS.find((c) => c.id === id) || CATEGORIAS[CATEGORIAS.length - 1];

// Colores tema oscuro
export const COLORS_DARK = {
  bg: '#121212',
  surface: '#1E1E1E',
  surfaceAlt: '#2A2A2A',
  border: '#333333',
  primary: '#4CAF50',
  primaryDark: '#388E3C',
  danger: '#EF5350',
  text: '#FFFFFF',
  textSub: '#AAAAAA',
  textMuted: '#666666',
  checked: '#444444',
  checkedText: '#777777',
};

// Colores tema claro
export const COLORS_LIGHT = {
  bg: '#F5F5F5',
  surface: '#FFFFFF',
  surfaceAlt: '#EEEEEE',
  border: '#DDDDDD',
  primary: '#4CAF50',
  primaryDark: '#388E3C',
  danger: '#EF5350',
  text: '#111111',
  textSub: '#555555',
  textMuted: '#999999',
  checked: '#E0E0E0',
  checkedText: '#AAAAAA',
};

export const UNIDADES = [
  'ud',
  'kg',
  'g',
  'L',
  'ml',
  'bolsa',
  'paquete',
  'lata',
  'botella',
  'caja',
  'docena',
];
