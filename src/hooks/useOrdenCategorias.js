import { useCallback, useEffect, useState } from 'react';
import { ordenCategorias } from '../logic/orden';
import { CLAVES, guardarJSON, leerJSON } from '../storage';

// Orden de categorías de una lista, guardado solo en este dispositivo.
export const useOrdenCategorias = (listaId) => {
  const [orden, setOrdenState] = useState(() => ordenCategorias());

  useEffect(() => {
    let vivo = true;
    leerJSON(CLAVES.ordenCats(listaId)).then((guardado) => {
      if (vivo) setOrdenState(ordenCategorias(guardado));
    });
    return () => {
      vivo = false;
    };
  }, [listaId]);

  const setOrden = useCallback(
    (nuevo) => {
      setOrdenState(nuevo);
      guardarJSON(CLAVES.ordenCats(listaId), nuevo);
    },
    [listaId],
  );

  return [orden, setOrden];
};
