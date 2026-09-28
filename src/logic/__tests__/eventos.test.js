import { aplicarEventoElementos, aplicarEventoListas } from '../eventos';

const el = (id, extra = {}) => ({
  _id: id,
  lista: 'L1',
  nombre: id,
  necesario: false,
  ...extra,
});

describe('aplicarEventoElementos', () => {
  const base = [el('a'), el('b', { necesario: true })];

  it('elemento_creado añade elementos de la lista activa', () => {
    const r = aplicarEventoElementos(base, 'elemento_creado', el('c'), 'L1');
    expect(r.map((e) => e._id)).toEqual(['a', 'b', 'c']);
  });

  it('elemento_creado ignora duplicados', () => {
    const r = aplicarEventoElementos(base, 'elemento_creado', el('a'), 'L1');
    expect(r).toBe(base);
  });

  it('elemento_creado ignora elementos de otra lista', () => {
    const otro = el('c', { lista: 'L2' });
    expect(aplicarEventoElementos(base, 'elemento_creado', otro, 'L1')).toBe(
      base,
    );
  });

  it('elemento_actualizado y elemento_toggle reemplazan por _id', () => {
    const upd = el('a', { nombre: 'nuevo' });
    expect(
      aplicarEventoElementos(base, 'elemento_actualizado', upd, 'L1')[0].nombre,
    ).toBe('nuevo');
    const tog = el('a', { necesario: true });
    expect(
      aplicarEventoElementos(base, 'elemento_toggle', tog, 'L1')[0].necesario,
    ).toBe(true);
  });

  it('elemento_eliminado quita por elementoId', () => {
    const r = aplicarEventoElementos(
      base,
      'elemento_eliminado',
      { elementoId: 'a' },
      'L1',
    );
    expect(r.map((e) => e._id)).toEqual(['b']);
  });

  it('todos_marcados de la lista activa marca todo', () => {
    const r = aplicarEventoElementos(
      base,
      'todos_marcados',
      { listaId: 'L1' },
      'L1',
    );
    expect(r.every((e) => e.necesario)).toBe(true);
  });

  it('todos_marcados de otra lista no toca nada (bug B1)', () => {
    const r = aplicarEventoElementos(
      base,
      'todos_marcados',
      { listaId: 'L2' },
      'L1',
    );
    expect(r).toBe(base);
  });

  it('todos_desmarcados de otra lista no toca nada (bug B1)', () => {
    const r = aplicarEventoElementos(
      base,
      'todos_desmarcados',
      { listaId: 'L2' },
      'L1',
    );
    expect(r).toBe(base);
  });

  it('todos_desmarcados de la lista activa desmarca todo', () => {
    const r = aplicarEventoElementos(
      base,
      'todos_desmarcados',
      { listaId: 'L1' },
      'L1',
    );
    expect(r.some((e) => e.necesario)).toBe(false);
  });

  it('elementos_reordenados actualiza orden', () => {
    const r = aplicarEventoElementos(
      base,
      'elementos_reordenados',
      { elementos: [{ _id: 'b', orden: 7 }] },
      'L1',
    );
    expect(r[1].orden).toBe(7);
    expect(r[0].orden).toBeUndefined();
  });

  it('evento desconocido devuelve el mismo array', () => {
    expect(aplicarEventoElementos(base, 'otro', {}, 'L1')).toBe(base);
  });
});

describe('aplicarEventoListas', () => {
  const base = [{ _id: 'L1', nombre: 'Súper' }];

  it('lista_creada añade sin duplicar', () => {
    const nueva = { _id: 'L2', nombre: 'Casa' };
    expect(aplicarEventoListas(base, 'lista_creada', nueva)).toHaveLength(2);
    expect(aplicarEventoListas(base, 'lista_creada', base[0])).toBe(base);
  });

  it('lista_actualizada reemplaza', () => {
    const r = aplicarEventoListas(base, 'lista_actualizada', {
      _id: 'L1',
      nombre: 'X',
    });
    expect(r[0].nombre).toBe('X');
  });

  it('lista_eliminada quita', () => {
    expect(
      aplicarEventoListas(base, 'lista_eliminada', { listaId: 'L1' }),
    ).toEqual([]);
  });
});
