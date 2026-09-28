import { useMemo } from 'react';
import { useApp } from '../context/AppContext';

// `factory` debe ser una función de módulo: (colors) => StyleSheet.
export const useStyles = (factory) => {
  const { colors } = useApp();
  return useMemo(() => factory(colors), [factory, colors]);
};
