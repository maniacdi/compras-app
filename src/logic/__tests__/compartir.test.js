import { CATEGORIAS } from '../../constants';
import { textoCompartir } from '../compartir';

const IDS = CATEGORIAS.map((c) => c.id);
const lista = { nombre: 'Mercadona', emoji: '🛒' };

describe('textoCompartir', () => {
  it('lista los pendientes agrupados por categoría', () => {
    const els = [
      {
        _id: '1',
        categoria: 'frutas',
        nombre: 'Plátanos',
        cantidad: 6,
        unidad: 'ud',
        necesario: true,
      },
      {
        _id: '2',
        categoria: 'lacteos_huevos',
        nombre: 'Leche',
        cantidad: 2,
        unidad: 'L',
        notas: 'sin lactosa',
        necesario: true,
      },
      {
        _id: '3',
        categoria: 'frutas',
        nombre: 'Peras',
        cantidad: 1,
        unidad: 'ud',
        necesario: false,
      },
      {
        _id: '4',
        categoria: 'frutas',
        nombre: 'Limón',
        cantidad: 1,
        unidad: 'ud',
        necesario: true,
      },
    ];
    expect(textoCompartir(lista, els, IDS)).toBe(
      [
        '🛒 Mercadona — 3 pendientes',
        '',
        '🍎 FRUTAS',
        '• Limón',
        '• Plátanos (6 ud)',
        '',
        '🥛 LÁCTEOS Y HUEVOS',
        '• Leche (2 L) — sin lactosa',
      ].join('\n'),
    );
  });

  it('sin pendientes lo dice', () => {
    expect(textoCompartir(lista, [], IDS)).toBe(
      '🛒 Mercadona — nada pendiente 🎉',
    );
  });

  it('singular con un pendiente', () => {
    const els = [
      {
        _id: '1',
        categoria: 'otros',
        nombre: 'Pilas',
        cantidad: 1,
        unidad: 'ud',
        necesario: true,
      },
    ];
    expect(textoCompartir(lista, els, IDS).split('\n')[0]).toBe(
      '🛒 Mercadona — 1 pendiente',
    );
  });
});
