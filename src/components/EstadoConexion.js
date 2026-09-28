import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { useStyles } from '../hooks/useStyles';

const ESPERA_PENDIENTES_MS = 3000;

const plural = (n) =>
  n === 1 ? '1 cambio pendiente' : `${n} cambios pendientes`;

// Franja bajo el header cuando no hay conexión o quedan cambios por enviar.
export default function EstadoConexion() {
  const { conectado, pendientes } = useApp();
  const s = useStyles(styles);

  const offline = conectado === false;
  // Con conexión, solo avisar si los cambios tardan (evita parpadeo en cada tap).
  const hayPendientes = pendientes > 0;
  const [atascado, setAtascado] = useState(false);
  useEffect(() => {
    setAtascado(false);
    if (!hayPendientes) return;
    const t = setTimeout(() => setAtascado(true), ESPERA_PENDIENTES_MS);
    return () => clearTimeout(t);
  }, [hayPendientes]);

  if (!offline && !(hayPendientes && atascado)) return null;

  const texto = !offline
    ? `ENVIANDO · ${plural(pendientes)}`
    : pendientes > 0
      ? `SIN CONEXIÓN · ${plural(pendientes)}`
      : 'SIN CONEXIÓN';

  return (
    <View style={[s.franja, offline && s.franjaOffline]}>
      <Text style={[s.texto, offline && s.textoOffline]}>{texto}</Text>
    </View>
  );
}

const styles = (c) =>
  StyleSheet.create({
    franja: {
      paddingVertical: 4,
      paddingHorizontal: 16,
      backgroundColor: c.surfaceAlt,
      borderBottomWidth: 1.5,
      borderBottomColor: c.border,
    },
    franjaOffline: { backgroundColor: c.danger, borderBottomColor: c.danger },
    texto: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1,
      color: c.textSub,
    },
    textoOffline: { color: '#fff' },
  });
