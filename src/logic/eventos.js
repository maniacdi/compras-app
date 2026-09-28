// Reducers puros para los eventos socket. Devuelven el mismo array si no
// hay cambios, así React no re-renderiza de más.

const reemplazar = (arr, item) =>
  arr.map((x) => (x._id === item._id ? item : x));

// Sin listaId en el payload se asume la lista activa (compatibilidad).
const esDeLista = (payload, listaId) =>
  !payload?.listaId || payload.listaId === listaId;

export const aplicarEventoElementos = (elementos, evento, payload, listaId) => {
  switch (evento) {
    case 'elemento_creado':
      if (payload.lista && payload.lista !== listaId) return elementos;
      if (elementos.some((e) => e._id === payload._id)) return elementos;
      return [...elementos, payload];

    case 'elemento_actualizado':
    case 'elemento_toggle':
      return reemplazar(elementos, payload);

    case 'elemento_eliminado':
      return elementos.filter((e) => e._id !== payload.elementoId);

    case 'todos_marcados':
    case 'todos_desmarcados': {
      if (!esDeLista(payload, listaId)) return elementos;
      const necesario = evento === 'todos_marcados';
      return elementos.map((e) => ({ ...e, necesario }));
    }

    case 'elementos_reordenados': {
      const orden = new Map(payload.elementos.map((r) => [r._id, r.orden]));
      return elementos.map((e) =>
        orden.has(e._id) ? { ...e, orden: orden.get(e._id) } : e,
      );
    }

    default:
      return elementos;
  }
};

export const aplicarEventoListas = (listas, evento, payload) => {
  switch (evento) {
    case 'lista_creada':
      if (listas.some((l) => l._id === payload._id)) return listas;
      return [...listas, payload];
    case 'lista_actualizada':
      return reemplazar(listas, payload);
    case 'lista_eliminada':
      return listas.filter((l) => l._id !== payload.listaId);
    default:
      return listas;
  }
};

export const EVENTOS_ELEMENTOS = [
  'elemento_creado',
  'elemento_actualizado',
  'elemento_toggle',
  'elemento_eliminado',
  'todos_marcados',
  'todos_desmarcados',
  'elementos_reordenados',
];

export const EVENTOS_LISTAS = [
  'lista_creada',
  'lista_actualizada',
  'lista_eliminada',
];
