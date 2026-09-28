// Cola de mutaciones de elementos pendientes de enviar al servidor.
// Op: { opId, tipo, listaId, elementoId?, datos? }
// tipo: 'crear' | 'editar' | 'toggle' | 'eliminar' | 'marcarTodos' | 'desmarcarTodos'
//
// La vista se deriva siempre como aplicarCola(estadoServidor, cola), así los
// eventos socket o un refetch nunca pisan cambios aún no enviados.
// `enVuelo` es el opId que se está enviando: nunca se fusiona ni se cancela.

let contador = 0;
const nuevoOpId = () => `${Date.now()}-${contador++}`;

export const nuevoIdTemporal = () => `tmp_${nuevoOpId()}`;
export const esTemporal = (id) => typeof id === 'string' && id.startsWith('tmp_');

// Sin respuesta del servidor = no hay red (timeout, DNS, sin cobertura…).
export const esErrorDeRed = (e) => Boolean(e?.isAxiosError && !e.response);

const esMasivo = (op) => op.tipo === 'marcarTodos' || op.tipo === 'desmarcarTodos';

export const encolar = (cola, opSinId, enVuelo = null) => {
  const op = { ...opSinId, opId: nuevoOpId() };
  const { tipo, elementoId, listaId } = op;
  const libre = (o) => o.opId !== enVuelo;

  if (tipo === 'toggle') {
    // Último toggle del mismo elemento sin un marcar/desmarcar después.
    for (let i = cola.length - 1; i >= 0; i--) {
      const prev = cola[i];
      if (esMasivo(prev)) break;
      if (prev.tipo === 'toggle' && prev.elementoId === elementoId) {
        return libre(prev) ? cola.filter((_, j) => j !== i) : [...cola, op];
      }
    }
    return [...cola, op];
  }

  if (tipo === 'editar') {
    const i = cola.findIndex(
      (o) =>
        libre(o) &&
        (o.tipo === 'crear' || o.tipo === 'editar') &&
        o.elementoId === elementoId,
    );
    if (i !== -1) {
      return cola.map((o, j) =>
        j === i ? { ...o, datos: { ...o.datos, ...op.datos } } : o,
      );
    }
    return [...cola, op];
  }

  if (tipo === 'eliminar') {
    const creadoSinEnviar = cola.some(
      (o) => libre(o) && o.tipo === 'crear' && o.elementoId === elementoId,
    );
    const sinOps = cola.filter((o) => !libre(o) || o.elementoId !== elementoId);
    return creadoSinEnviar ? sinOps : [...sinOps, op];
  }

  if (esMasivo(op)) {
    const limpia = cola.filter(
      (o) =>
        !libre(o) ||
        !(o.listaId === listaId && (o.tipo === 'toggle' || esMasivo(o))),
    );
    return [...limpia, op];
  }

  return [...cola, op];
};

export const reescribirId = (cola, tmp, real) =>
  cola.map((o) => (o.elementoId === tmp ? { ...o, elementoId: real } : o));

// Quita una op rechazada por el servidor. Si era un crear, también las que
// dependían de ese elemento temporal.
export const descartarOp = (cola, op) =>
  cola.filter(
    (o) =>
      o.opId !== op.opId &&
      !(op.tipo === 'crear' && o.elementoId === op.elementoId),
  );

const reemplazar = (els, el) => els.map((e) => (e._id === el._id ? el : e));

const aplicarOp = (els, op, listaId) => {
  switch (op.tipo) {
    case 'crear':
      if (op.listaId !== listaId || els.some((e) => e._id === op.elementoId)) {
        return els;
      }
      return [
        ...els,
        { _id: op.elementoId, lista: listaId, necesario: true, ...op.datos },
      ];
    case 'editar':
      return els.map((e) => (e._id === op.elementoId ? { ...e, ...op.datos } : e));
    case 'toggle':
      return els.map((e) =>
        e._id === op.elementoId ? { ...e, necesario: !e.necesario } : e,
      );
    case 'eliminar':
      return els.filter((e) => e._id !== op.elementoId);
    case 'marcarTodos':
    case 'desmarcarTodos': {
      if (op.listaId !== listaId) return els;
      const necesario = op.tipo === 'marcarTodos';
      return els.map((e) => ({ ...e, necesario }));
    }
    default:
      return els;
  }
};

// Estado esperado: datos del servidor + ops aún sin confirmar.
export const aplicarCola = (elementos, cola, listaId) =>
  cola.reduce((els, op) => aplicarOp(els, op, listaId), elementos);

// Lleva al estado del servidor la respuesta de una op confirmada.
export const aplicarResultado = (elementos, op, res, listaId) => {
  const el = res?.elemento;
  switch (op.tipo) {
    case 'crear':
      if (!el || el.lista !== listaId) return elementos;
      if (elementos.some((e) => e._id === el._id)) return reemplazar(elementos, el);
      return [...elementos, el];
    case 'editar':
    case 'toggle':
      return el ? reemplazar(elementos, el) : aplicarOp(elementos, op, listaId);
    default:
      return aplicarOp(elementos, op, listaId);
  }
};
