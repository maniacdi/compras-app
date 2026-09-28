import { CATEGORIAS } from '../../constants';
import {
  ordenCategorias,
  agruparPorCategoria,
  moverCategoria,
  reordenarPresentes,
} from '../orden';

const IDS = CATEGORIAS.map((c) => c.id);

describe('ordenCategorias', () => {
  it('sin orden guardado usa el de CATEGORIAS', () => {
    expect(ordenCategorias()).toEqual(IDS);
    expect(ordenCategorias(null)).toEqual(IDS);
  });

  it('respeta el guardado y añade al final las que falten', () => {
    const r = ordenCategorias(['limpieza', 'frutas']);
    expect(r.slice(0, 2)).toEqual(['limpieza', 'frutas']);
    expect(r).toHaveLength(IDS.length);
    expect(r[2]).toBe('verduras');
  });

  it('descarta ids desconocidos y duplicados', () => {
    const r = ordenCategorias(['xx', 'frutas', 'frutas']);
    expect(r[0]).toBe('frutas');
    expect(r).toHaveLength(IDS.length);
  });
});

describe('agruparPorCategoria', () => {
  const els = [
    { _id: '1', categoria: 'limpieza', nombre: 'Lejía', orden: 0 },
    { _id: '2', categoria: 'frutas', nombre: 'Plátano', orden: 1 },
    { _id: '3', categoria: 'frutas', nombre: 'Manzana', orden: 1 },
    { _id: '4', categoria: 'frutas', nombre: 'Pera', orden: 0 },
    { _id: '5', categoria: 'inventada', nombre: 'X', orden: 0 },
  ];

  it('agrupa siguiendo el orden de categorías', () => {
    const orden = ordenCategorias(['limpieza']);
    const r = agruparPorCategoria(els, orden);
    expect(r.map(([c]) => c)).toEqual(['limpieza', 'frutas', 'otros']);
  });

  it('dentro del grupo ordena por orden y luego nombre', () => {
    const r = agruparPorCategoria(els, IDS);
    const frutas = r.find(([c]) => c === 'frutas')[1];
    expect(frutas.map((e) => e.nombre)).toEqual(['Pera', 'Manzana', 'Plátano']);
  });

  it('categoría desconocida cae en otros', () => {
    const r = agruparPorCategoria(els, IDS);
    expect(r.find(([c]) => c === 'otros')[1][0]._id).toBe('5');
  });
});

describe('moverCategoria', () => {
  it('mueve un elemento de posición sin mutar', () => {
    const o = ['a', 'b', 'c', 'd'];
    expect(moverCategoria(o, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moverCategoria(o, 3, 0)).toEqual(['d', 'a', 'b', 'c']);
    expect(o).toEqual(['a', 'b', 'c', 'd']);
  });

  it('índices fuera de rango se acotan', () => {
    expect(moverCategoria(['a', 'b'], 0, 9)).toEqual(['b', 'a']);
  });
});

describe('reordenarPresentes', () => {
  it('coloca las presentes en su nuevo orden sin mover las ausentes', () => {
    const completo = ['a', 'b', 'c', 'd', 'e'];
    // presentes: a, c, e → nuevo orden e, a, c
    expect(reordenarPresentes(completo, ['e', 'a', 'c'])).toEqual([
      'e',
      'b',
      'a',
      'd',
      'c',
    ]);
  });

  it('sin cambios devuelve el mismo orden', () => {
    const completo = ['a', 'b', 'c'];
    expect(reordenarPresentes(completo, ['a', 'c'])).toEqual(completo);
  });
});
