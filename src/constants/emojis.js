// Genera emojis de un solo codepoint por bloques unicode.
// No incluye secuencias ZWJ, tonos de piel ni banderas (no generables por rango).

const rango = (a, b) => {
  const out = [];
  for (let cp = a; cp <= b; cp++) out.push(String.fromCodePoint(cp));
  return out;
};

export const EMOJI_SECCIONES = [
  {
    titulo: 'Caras y emociones',
    emojis: [...rango(0x1f600, 0x1f64f), ...rango(0x1f910, 0x1f92f)],
  },
  {
    titulo: 'Comida y naturaleza',
    emojis: rango(0x1f300, 0x1f5ff),
  },
  {
    titulo: 'Objetos nuevos y comida',
    emojis: [...rango(0x1f900, 0x1f90f), ...rango(0x1f930, 0x1f9ff)],
  },
  {
    titulo: 'Más objetos',
    emojis: rango(0x1fa70, 0x1faff),
  },
  {
    titulo: 'Viajes y lugares',
    emojis: rango(0x1f680, 0x1f6ff),
  },
  {
    titulo: 'Símbolos',
    emojis: rango(0x2600, 0x26ff),
  },
  {
    titulo: 'Dingbats',
    emojis: rango(0x2700, 0x27bf),
  },
];

export const EMOJI_PLANO = EMOJI_SECCIONES.flatMap((s) => s.emojis);
