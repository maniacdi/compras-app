import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { useStyles } from '../hooks/useStyles';

export const DURACION_TOAST = 4000;

export default function Toast() {
  const { toast, ocultarToast } = useApp();
  const s = useStyles(styles);
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!toast) return;
    opacity.setValue(0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
    const t = setTimeout(ocultarToast, DURACION_TOAST);
    return () => clearTimeout(t);
  }, [toast, opacity, ocultarToast]);

  if (!toast) return null;

  return (
    <Animated.View
      style={[s.toast, { opacity, bottom: insets.bottom + 100 }]}
      pointerEvents='box-none'
    >
      <Text style={s.texto} numberOfLines={2}>
        {toast.mensaje}
      </Text>
      {toast.accion && (
        <TouchableOpacity
          onPress={() => {
            toast.accion.onPress();
            ocultarToast();
          }}
          hitSlop={12}
        >
          <Text style={s.accion}>{toast.accion.label}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = (c) =>
  StyleSheet.create({
    toast: {
      position: 'absolute',
      left: 16,
      right: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      paddingVertical: 14,
      paddingHorizontal: 16,
      backgroundColor: c.text,
      borderWidth: 2,
      borderColor: c.text,
    },
    texto: { flex: 1, color: c.bg, fontSize: 15, fontWeight: '600' },
    accion: {
      color: c.primary,
      fontSize: 14,
      fontWeight: '800',
      letterSpacing: 1,
    },
  });
