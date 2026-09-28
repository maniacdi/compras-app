import {
  encolar,
  aplicarCola,
  aplicarResultado,
  reescribirId,
  descartarOp,
  esErrorDeRed,
  esTemporal,
} from '../outbox';

const toggle = (id, listaId = 'L1') => ({
  tipo: 'toggle',
  elementoId: id,
  listaId,
});
const tipos = (cola) => cola.map((o) => o.tipo);

describe('encolar', () => {
  it('añade ops normales al final', () => {
    const c = encolar([], toggle('a'));
    expect(tipos(c)).toEqual(['toggle']);
  });

  it('dos toggles del mismo elemento se cancelan', () => {
    const c = encolar(encolar([], toggle('a')), toggle('a'));
    expect(c).toEqual([]);
  });

  it('no cancela toggles si hubo marcar/desmarcar todos entre medias', () => {
    let c = encolar([], toggle('a'));
    c = encolar(c, { tipo: 'marcarTodos', listaId: 'L2' });
    c = encolar(c, toggle('a'));
    expect(tipos(c)).toEqual(['toggle', 'marcarTodos', 'toggle']);
  });

  it('marcar todos elimina toggles previos de la misma lista', () => {
    let c = encolar([], toggle('a'));
    c = encolar(c, toggle('b', 'L2'));
    c = encolar(c, { tipo: 'desmarcarTodos', listaId: 'L1' });
    expect(c.map((o) => [o.tipo, o.elementoId || o.listaId])).toEqual([
      ['toggle', 'b'],
      ['desmarcarTodos', 'L1'],
    ]);
  });

  it('marcar todos sustituye a marcar/desmarcar previos de la misma lista', () => {
    let c = encolar([], { tipo: 'marcarTodos', listaId: 'L1' });
    c = encolar(c, { tipo: 'desmarcarTodos', listaId: 'L1' });
    expect(tipos(c)).toEqual(['desmarcarTodos']);
  });

  it('editar sobre un crear pendiente se fusiona en el crear', () => {
    let c = encolar([], {
      tipo: 'crear',
      elementoId: 'tmp_1',
      listaId: 'L1',
      datos: { nombre: 'Lech', cantidad: 1 },
    });
    c = encolar(c, {
      tipo: 'editar',
      elementoId: 'tmp_1',
      datos: { nombre: 'Leche' },
    });
    expect(c).toHaveLength(1);
    expect(c[0].datos).toEqual({ nombre: 'Leche', cantidad: 1 });
  });

  it('dos editar del mismo elemento se fusionan', () => {
    let c = encolar([], {
      tipo: 'editar',
      elementoId: 'a',
      datos: { nombre: 'X', cantidad: 2 },
    });
    c = encolar(c, { tipo: 'editar', elementoId: 'a', datos: { nombre: 'Y' } });
    expect(c).toHaveLength(1);
    expect(c[0].datos).toEqual({ nombre: 'Y', cantidad: 2 });
  });

  it('eliminar quita las ops previas del elemento', () => {
    let c = encolar([], toggle('a'));
    c = encolar(c, { tipo: 'editar', elementoId: 'a', datos: {} });
    c = encolar(c, { tipo: 'eliminar', elementoId: 'a', listaId: 'L1' });
    expect(tipos(c)).toEqual(['eliminar']);
  });

  it('eliminar un elemento temporal no llega al servidor', () => {
    let c = encolar([], {
      tipo: 'crear',
      elementoId: 'tmp_1',
      listaId: 'L1',
      datos: {},
    });
    c = encolar(c, toggle('tmp_1'));
    c = encolar(c, { tipo: 'eliminar', elementoId: 'tmp_1', listaId: 'L1' });
    expect(c).toEqual([]);
  });

  it('asigna id único a cada op', () => {
    const c = encolar(encolar([], toggle('a')), toggle('b'));
    expect(c[0].opId).toBeTruthy();
    expect(c[0].opId).not.toBe(c[1].opId);
  });
});

describe('aplicarCola', () => {
  const els = [
    { _id: 'a', lista: 'L1', nombre: 'A', necesario: true },
    { _id: 'b', lista: 'L1', nombre: 'B', necesario: false },
  ];

  it('aplica crear, editar, toggle y eliminar sobre los datos del servidor', () => {
    const cola = [
      {
        tipo: 'crear',
        elementoId: 'tmp_1',
        listaId: 'L1',
        datos: { nombre: 'C' },
      },
      { tipo: 'editar', elementoId: 'a', datos: { nombre: 'A2' } },
      { tipo: 'toggle', elementoId: 'a', listaId: 'L1' },
      { tipo: 'eliminar', elementoId: 'b', listaId: 'L1' },
    ];
    const r = aplicarCola(els, cola, 'L1');
    expect(r).toEqual([
      { _id: 'a', lista: 'L1', nombre: 'A2', necesario: false },
      { _id: 'tmp_1', lista: 'L1', nombre: 'C', necesario: true },
    ]);
  });

  it('ignora ops de otras listas', () => {
    const cola = [
      { tipo: 'marcarTodos', listaId: 'L2' },
      {
        tipo: 'crear',
        elementoId: 'tmp_1',
        listaId: 'L2',
        datos: { nombre: 'Z' },
      },
    ];
    expect(aplicarCola(els, cola, 'L1')).toEqual(els);
  });

  it('marcar todos marca la lista', () => {
    const r = aplicarCola(els, [{ tipo: 'marcarTodos', listaId: 'L1' }], 'L1');
    expect(r.every((e) => e.necesario)).toBe(true);
  });
});

describe('en vuelo', () => {
  it('no cancela un toggle que ya se está enviando', () => {
    const c1 = encolar([], toggle('a'));
    const c2 = encolar(c1, toggle('a'), c1[0].opId);
    expect(tipos(c2)).toEqual(['toggle', 'toggle']);
  });

  it('no fusiona editar en un crear que ya se está enviando', () => {
    const c1 = encolar([], {
      tipo: 'crear',
      elementoId: 'tmp_1',
      listaId: 'L1',
      datos: { nombre: 'A' },
    });
    const c2 = encolar(
      c1,
      { tipo: 'editar', elementoId: 'tmp_1', datos: { nombre: 'B' } },
      c1[0].opId,
    );
    expect(tipos(c2)).toEqual(['crear', 'editar']);
    expect(c2[0].datos.nombre).toBe('A');
  });

  it('eliminar un temporal cuyo crear está en vuelo sí se encola', () => {
    const c1 = encolar([], {
      tipo: 'crear',
      elementoId: 'tmp_1',
      listaId: 'L1',
      datos: {},
    });
    const c2 = encolar(
      c1,
      { tipo: 'eliminar', elementoId: 'tmp_1', listaId: 'L1' },
      c1[0].opId,
    );
    expect(tipos(c2)).toEqual(['crear', 'eliminar']);
  });

  it('marcar todos no quita un toggle en vuelo', () => {
    const c1 = encolar([], toggle('a'));
    const c2 = encolar(c1, { tipo: 'marcarTodos', listaId: 'L1' }, c1[0].opId);
    expect(tipos(c2)).toEqual(['toggle', 'marcarTodos']);
  });
});

describe('reescribirId / descartarOp', () => {
  it('reescribe el id temporal en las ops restantes', () => {
    const c = reescribirId([toggle('tmp_1'), toggle('b')], 'tmp_1', 'real');
    expect(c.map((o) => o.elementoId)).toEqual(['real', 'b']);
  });

  it('descartar un crear quita sus ops dependientes', () => {
    const crear = { opId: '1', tipo: 'crear', elementoId: 'tmp_1' };
    const cola = [
      crear,
      { opId: '2', ...toggle('tmp_1') },
      { opId: '3', ...toggle('b') },
    ];
    expect(descartarOp(cola, crear).map((o) => o.opId)).toEqual(['3']);
  });

  it('descartar otra op solo quita esa', () => {
    const cola = [
      { opId: '1', ...toggle('a') },
      { opId: '2', ...toggle('a') },
    ];
    expect(descartarOp(cola, cola[0]).map((o) => o.opId)).toEqual(['2']);
  });
});

describe('aplicarResultado', () => {
  const base = [{ _id: 'a', lista: 'L1', nombre: 'A', necesario: true }];

  it('crear añade el elemento real', () => {
    const res = { elemento: { _id: 'r1', lista: 'L1', nombre: 'C' } };
    const r = aplicarResultado(
      base,
      { tipo: 'crear', listaId: 'L1' },
      res,
      'L1',
    );
    expect(r.map((e) => e._id)).toEqual(['a', 'r1']);
  });

  it('crear no duplica si ya llegó por socket', () => {
    const res = { elemento: { _id: 'a', lista: 'L1', nombre: 'A2' } };
    const r = aplicarResultado(
      base,
      { tipo: 'crear', listaId: 'L1' },
      res,
      'L1',
    );
    expect(r).toHaveLength(1);
    expect(r[0].nombre).toBe('A2');
  });

  it('crear de otra lista no toca la activa', () => {
    const res = { elemento: { _id: 'r1', lista: 'L2' } };
    expect(
      aplicarResultado(base, { tipo: 'crear', listaId: 'L2' }, res, 'L1'),
    ).toBe(base);
  });

  it('toggle usa la respuesta del servidor', () => {
    const res = { elemento: { ...base[0], necesario: false } };
    const r = aplicarResultado(
      base,
      { tipo: 'toggle', elementoId: 'a' },
      res,
      'L1',
    );
    expect(r[0].necesario).toBe(false);
  });

  it('eliminar y marcar todos se aplican en local', () => {
    expect(
      aplicarResultado(base, { tipo: 'eliminar', elementoId: 'a' }, {}, 'L1'),
    ).toEqual([]);
    const r = aplicarResultado(
      base,
      { tipo: 'desmarcarTodos', listaId: 'L1' },
      {},
      'L1',
    );
    expect(r[0].necesario).toBe(false);
  });
});

describe('helpers', () => {
  it('esErrorDeRed', () => {
    expect(esErrorDeRed({ isAxiosError: true })).toBe(true);
    expect(
      esErrorDeRed({ isAxiosError: true, response: { status: 500 } }),
    ).toBe(false);
    expect(esErrorDeRed(new Error('x'))).toBe(false);
  });

  it('esTemporal', () => {
    expect(esTemporal('tmp_123')).toBe(true);
    expect(esTemporal('65fa0')).toBe(false);
  });
});
