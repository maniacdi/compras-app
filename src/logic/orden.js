import { CATEGORIAS } from '../constants';

const IDS = CATEGORIAS.map((c) => c.id);
const VALIDOS = new Set(IDS);

// Orden completo de categorías: el guardado (limpio) + las que falten al final.
export const ordenCategorias = (guardado) => {
  const vistos = new Set();
  const limpio = (guardado || []).filter((id) => {
    if (!VALIDOS.has(id) || vistos.has(id)) return false;
    vistos.add(id);
    return true;
  });
  return [...limpio, ...IDS.filter((id) => !vistos.has(id))];
};

const compararElementos = (a, b) =>
  (a.orden ?? 0) - (b.orden ?? 0) || a.nombre.localeCompare(b.nombre);

// [[categoriaId, elementos[]], ...] siguiendo `orden`.
export const agruparPorCategoria = (elementos, orden) => {
  const grupos = new Map();
  elementos.forEach((e) => {
    const cat = VALIDOS.has(e.categoria) ? e.categoria : 'otros';
    if (!grupos.has(cat)) grupos.set(cat, []);
    grupos.get(cat).push(e);
  });
  return orden
    .filter((cat) => grupos.has(cat))
    .map((cat) => [cat, grupos.get(cat).sort(compararElementos)]);
};

export const moverCategoria = (orden, from, to) => {
  const destino = Math.max(0, Math.min(orden.length - 1, to));
  const copia = [...orden];
  const [item] = copia.splice(from, 1);
  copia.splice(destino, 0, item);
  return copia;
};
