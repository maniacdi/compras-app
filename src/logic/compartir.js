import { getCategoriaInfo } from '../constants';
import { agruparPorCategoria } from './orden';

const linea = (e) => {
  const esUnaUnidad = Number(e.cantidad) === 1 && e.unidad === 'ud';
  const cantidad = esUnaUnidad ? '' : ` (${e.cantidad} ${e.unidad})`;
  const notas = e.notas ? ` — ${e.notas}` : '';
  return `• ${e.nombre}${cantidad}${notas}`;
};

export const textoCompartir = (lista, elementos, orden) => {
  const pendientes = elementos.filter((e) => e.necesario);
  const titulo = `${lista.emoji} ${lista.nombre}`;
  if (pendientes.length === 0) return `${titulo} — nada pendiente 🎉`;

  const n = pendientes.length;
  const bloques = agruparPorCategoria(pendientes, orden).map(([cat, items]) => {
    const info = getCategoriaInfo(cat);
    return [`${info.emoji} ${info.nombre.toUpperCase()}`, ...items.map(linea)].join(
      '\n',
    );
  });
  return [`${titulo} — ${n} ${n === 1 ? 'pendiente' : 'pendientes'}`, ...bloques].join(
    '\n\n',
  );
};
