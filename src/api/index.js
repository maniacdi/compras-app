import axios from 'axios';
import { API_URL } from '../constants';

const api = axios.create({ baseURL: API_URL, timeout: 10000 });

// ── Pareja ──────────────────────────────────────────────────
export const crearPareja = (nombre) =>
  api.post('/api/parejas', { nombre }).then((r) => r.data);

export const obtenerPareja = (codigo) =>
  api.get(`/api/parejas/${codigo}`).then((r) => r.data);

// ── Listas ──────────────────────────────────────────────────
export const obtenerListas = (codigoPareja) =>
  api.get(`/api/listas/${codigoPareja}`).then((r) => r.data);

export const crearLista = (codigoPareja, datos) =>
  api.post(`/api/listas/${codigoPareja}`, datos).then((r) => r.data);

export const editarLista = (listaId, datos) =>
  api.put(`/api/listas/${listaId}`, datos).then((r) => r.data);

export const eliminarLista = (listaId) =>
  api.delete(`/api/listas/${listaId}`).then((r) => r.data);

// ── Elementos ───────────────────────────────────────────────
export const obtenerElementos = (listaId, filtros = {}) =>
  api.get(`/api/elementos/${listaId}`, { params: filtros }).then((r) => r.data);

export const crearElemento = (listaId, datos) =>
  api.post(`/api/elementos/${listaId}`, datos).then((r) => r.data);

export const editarElemento = (elementoId, datos) =>
  api.put(`/api/elementos/${elementoId}`, datos).then((r) => r.data);

export const toggleElemento = (elementoId) =>
  api.patch(`/api/elementos/${elementoId}/toggle`).then((r) => r.data);

export const eliminarElemento = (elementoId) =>
  api.delete(`/api/elementos/${elementoId}`).then((r) => r.data);

export const marcarTodos = (listaId) =>
  api.patch(`/api/elementos/${listaId}/marcar-todos`).then((r) => r.data);

export const desmarcarTodos = (listaId) =>
  api.patch(`/api/elementos/${listaId}/desmarcar-todos`).then((r) => r.data);

export const reordenarElementos = (listaId, elementos) =>
  api.patch(`/api/elementos/${listaId}/reordenar`, { elementos }).then((r) => r.data);

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
