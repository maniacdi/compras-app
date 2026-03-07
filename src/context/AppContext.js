import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';
import { API_URL, COLORS_DARK, COLORS_LIGHT } from '../constants';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? COLORS_DARK : COLORS_LIGHT;

  const [pareja, setPareja] = useState(null); // { _id, codigo, nombre }
  const [alias, setAlias] = useState(''); // nombre corto del usuario
  const [listas, setListas] = useState([]);
  const [listaActiva, setListaActiva] = useState(null);
  const [elementos, setElementos] = useState([]);
  const [cargando, setCargando] = useState(false);

  const socketRef = useRef(null);

  // ── Persistencia ─────────────────────────────────────────
  useEffect(() => {
    const cargarSesion = async () => {
      try {
        const cod = await AsyncStorage.getItem('pareja_codigo');
        const ali = await AsyncStorage.getItem('alias');
        if (cod) setPareja({ codigo: cod });
        if (ali) setAlias(ali);
      } catch {}
    };
    cargarSesion();
  }, []);

  // ── Socket ────────────────────────────────────────────────
  const conectarSocket = (codigo, aliasUsuario) => {
    if (socketRef.current) socketRef.current.disconnect();

    const socket = io(API_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_pareja', { codigo, alias: aliasUsuario });
    });

    // Elementos
    socket.on('elemento_creado', (el) => setElementos((prev) => [...prev, el]));
    socket.on('elemento_actualizado', (el) =>
      setElementos((prev) => prev.map((e) => (e._id === el._id ? el : e))),
    );
    socket.on('elemento_toggle', (el) =>
      setElementos((prev) => prev.map((e) => (e._id === el._id ? el : e))),
    );
    socket.on('elemento_eliminado', ({ elementoId }) =>
      setElementos((prev) => prev.filter((e) => e._id !== elementoId)),
    );
    socket.on('todos_marcados', () =>
      setElementos((prev) => prev.map((e) => ({ ...e, necesario: true }))),
    );
    socket.on('todos_desmarcados', () =>
      setElementos((prev) => prev.map((e) => ({ ...e, necesario: false }))),
    );
    socket.on('elementos_reordenados', ({ elementos: reordenados }) => {
      setElementos((prev) =>
        prev.map((e) => {
          const nuevo = reordenados.find((r) => r._id === e._id);
          return nuevo ? { ...e, orden: nuevo.orden } : e;
        }),
      );
    });

    // Listas
    socket.on('lista_creada', (l) => setListas((prev) => [...prev, l]));
    socket.on('lista_actualizada', (l) =>
      setListas((prev) => prev.map((li) => (li._id === l._id ? l : li))),
    );
    socket.on('lista_eliminada', ({ listaId }) =>
      setListas((prev) => prev.filter((l) => l._id !== listaId)),
    );

    return socket;
  };

  const desconectarSocket = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  };

  const emitir = (evento, datos) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(evento, datos);
    }
  };

  // ── Login / logout ────────────────────────────────────────
  const guardarSesion = async (parejaData, aliasUsuario) => {
    await AsyncStorage.setItem('pareja_codigo', parejaData.codigo);
    await AsyncStorage.setItem('alias', aliasUsuario);
    setPareja(parejaData);
    setAlias(aliasUsuario);
    conectarSocket(parejaData.codigo, aliasUsuario);
  };

  const cerrarSesion = async () => {
    await AsyncStorage.removeItem('pareja_codigo');
    await AsyncStorage.removeItem('alias');
    desconectarSocket();
    setPareja(null);
    setAlias('');
    setListas([]);
    setElementos([]);
    setListaActiva(null);
  };

  return (
    <AppContext.Provider
      value={{
        colors,
        scheme,
        pareja,
        alias,
        listas,
        setListas,
        listaActiva,
        setListaActiva,
        elementos,
        setElementos,
        cargando,
        setCargando,
        guardarSesion,
        cerrarSesion,
        emitir,
        socketRef,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
