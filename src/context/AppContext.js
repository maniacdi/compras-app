import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';
import { API_URL, COLORS_DARK, COLORS_LIGHT } from '../constants';
import {
  obtenerListas,
  obtenerElementos,
  crearElemento,
  editarElemento,
  toggleElemento,
  eliminarElemento,
  marcarTodos,
  desmarcarTodos,
} from '../api';
import {
  aplicarEventoElementos,
  aplicarEventoListas,
  EVENTOS_ELEMENTOS,
  EVENTOS_LISTAS,
} from '../logic/eventos';
import {
  aplicarCola,
  aplicarResultado,
  descartarOp,
  encolar,
  esErrorDeRed,
  reescribirId,
} from '../logic/outbox';
import { CLAVES, borrarCaches, guardarJSON, leerJSON } from '../storage';

const AppContext = createContext();

const REINTENTO_MS = 15000;

const ejecutarOp = (op) => {
  switch (op.tipo) {
    case 'crear':
      return crearElemento(op.listaId, op.datos);
    case 'editar':
      return editarElemento(op.elementoId, op.datos);
    case 'toggle':
      return toggleElemento(op.elementoId);
    case 'eliminar':
      return eliminarElemento(op.elementoId);
    case 'marcarTodos':
      return marcarTodos(op.listaId);
    case 'desmarcarTodos':
      return desmarcarTodos(op.listaId);
    default:
      return Promise.resolve();
  }
};

// Evento socket que avisa a la pareja de una op confirmada.
const eventoDeOp = (op, res) => {
  switch (op.tipo) {
    case 'crear':
      return ['elemento_creado', res?.elemento];
    case 'editar':
      return ['elemento_actualizado', res?.elemento];
    case 'toggle':
      return ['elemento_toggle', res?.elemento];
    case 'eliminar':
      return [
        'elemento_eliminado',
        { elementoId: op.elementoId, listaId: op.listaId },
      ];
    case 'marcarTodos':
      return ['todos_marcados', { listaId: op.listaId }];
    case 'desmarcarTodos':
      return ['todos_desmarcados', { listaId: op.listaId }];
    default:
      return [null, null];
  }
};

const mensajeError = (op, e) => {
  if (op.tipo === 'crear' && e.response?.status === 409) {
    return `Ya existe «${op.datos?.nombre}»`;
  }
  if (op.tipo === 'crear') return `No se pudo añadir «${op.datos?.nombre}»`;
  return 'No se pudo guardar un cambio';
};

export const AppProvider = ({ children }) => {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? COLORS_DARK : COLORS_LIGHT;

  const [hidratando, setHidratando] = useState(true);
  const [pareja, setPareja] = useState(null);
  const [alias, setAlias] = useState('');
  const [listas, setListas] = useState([]);
  // Estado confirmado por el servidor de la lista abierta.
  const [servidor, setServidor] = useState({ listaId: null, elementos: [] });
  const [cola, setColaState] = useState([]);
  // null = aún no se sabe (arranque), para no mostrar "sin conexión" de golpe.
  const [conectado, setConectado] = useState(null);
  const [toast, setToast] = useState(null);

  const socketRef = useRef(null);
  const parejaRef = useRef(null);
  const listaActivaRef = useRef(null);
  const colaRef = useRef([]);
  const enVueloRef = useRef(null);
  const enviandoRef = useRef(false);
  const reintentoRef = useRef(null);
  const idsRealesRef = useRef({});
  const yaConectadoRef = useRef(false);
  // Sube con cada op confirmada; un fetch iniciado antes queda obsoleto.
  const confirmacionesRef = useRef(0);

  // ── Toast ────────────────────────────────────────────────
  const mostrarToast = useCallback((mensaje, accion = null) => {
    setToast({ id: Date.now(), mensaje, accion });
  }, []);
  const ocultarToast = useCallback(() => setToast(null), []);

  // ── Cola ─────────────────────────────────────────────────
  const actualizarCola = useCallback((fn) => {
    colaRef.current = fn(colaRef.current);
    setColaState(colaRef.current);
    guardarJSON(CLAVES.cola, colaRef.current);
  }, []);

  // ── Carga desde servidor ─────────────────────────────────
  // Sin red y con el socket caído ya avisa la franja de EstadoConexion.
  const avisarErrorCarga = useCallback(
    (e, mensaje) => {
      if (!esErrorDeRed(e)) mostrarToast(mensaje);
      else if (socketRef.current?.connected) mostrarToast('Sin conexión');
    },
    [mostrarToast],
  );

  const cargarListas = useCallback(async () => {
    const codigo = parejaRef.current?.codigo;
    if (!codigo) return;
    try {
      const res = await obtenerListas(codigo);
      setListas(res.listas);
      guardarJSON(CLAVES.listas(codigo), res.listas);
    } catch (e) {
      avisarErrorCarga(e, 'No se pudieron cargar las listas');
    }
  }, [avisarErrorCarga]);

  const cargarElementos = useCallback(
    async (listaId, intentos = 3) => {
      const version = confirmacionesRef.current;
      try {
        const res = await obtenerElementos(listaId);
        if (listaActivaRef.current !== listaId) return;
        if (version !== confirmacionesRef.current && intentos > 1) {
          return cargarElementos(listaId, intentos - 1);
        }
        setServidor({ listaId, elementos: res.elementos });
        guardarJSON(CLAVES.elementos(listaId), res.elementos);
      } catch (e) {
        if (listaActivaRef.current !== listaId) return;
        avisarErrorCarga(e, 'No se pudieron cargar los elementos');
      }
    },
    [avisarErrorCarga],
  );

  const recargar = useCallback(async () => {
    const listaId = listaActivaRef.current;
    await Promise.all([cargarListas(), listaId && cargarElementos(listaId)]);
  }, [cargarListas, cargarElementos]);

  // ── Envío de la cola ─────────────────────────────────────
  const emitir = useCallback((evento, datos) => {
    if (socketRef.current?.connected) socketRef.current.emit(evento, datos);
  }, []);

  const enviarCola = useCallback(async () => {
    if (enviandoRef.current) return;
    enviandoRef.current = true;
    clearTimeout(reintentoRef.current);
    try {
      while (colaRef.current.length) {
        const op = colaRef.current[0];
        enVueloRef.current = op.opId;
        let res;
        try {
          res = await ejecutarOp(op);
        } catch (e) {
          enVueloRef.current = null;
          if (esErrorDeRed(e)) {
            reintentoRef.current = setTimeout(enviarCola, REINTENTO_MS);
            break;
          }
          actualizarCola((c) => descartarOp(c, op));
          mostrarToast(mensajeError(op, e));
          if (op.listaId === listaActivaRef.current)
            cargarElementos(op.listaId);
          continue;
        }
        enVueloRef.current = null;

        confirmacionesRef.current += 1;
        const realId = op.tipo === 'crear' ? res?.elemento?._id : null;
        if (realId) idsRealesRef.current[op.elementoId] = realId;
        // Confirmar en servidor y quitar de la cola en el mismo render.
        setServidor((prev) =>
          prev.listaId
            ? {
                ...prev,
                elementos: aplicarResultado(
                  prev.elementos,
                  op,
                  res,
                  prev.listaId,
                ),
              }
            : prev,
        );
        actualizarCola((c) => {
          const resto = c.filter((o) => o.opId !== op.opId);
          return realId ? reescribirId(resto, op.elementoId, realId) : resto;
        });
        const [evento, datos] = eventoDeOp(op, res);
        if (evento && datos) emitir(evento, datos);
      }
    } finally {
      enviandoRef.current = false;
      enVueloRef.current = null;
    }
  }, [actualizarCola, cargarElementos, emitir, mostrarToast]);

  // Id real de un elemento creado offline (o el mismo id si no era temporal).
  const resolverId = useCallback((id) => idsRealesRef.current[id] || id, []);

  // Mutación optimista: la vista se deriva de servidor + cola.
  const mutarElemento = useCallback(
    (op) => {
      const elementoId = idsRealesRef.current[op.elementoId] || op.elementoId;
      actualizarCola((c) =>
        encolar(c, { ...op, elementoId }, enVueloRef.current),
      );
      enviarCola();
    },
    [actualizarCola, enviarCola],
  );

  // ── Lista activa ─────────────────────────────────────────
  const abrirLista = useCallback(
    async (listaId) => {
      listaActivaRef.current = listaId;
      const cache = await leerJSON(CLAVES.elementos(listaId), null);
      if (listaActivaRef.current !== listaId) return;
      setServidor({ listaId, elementos: cache || [] });
      await cargarElementos(listaId);
    },
    [cargarElementos],
  );

  const cerrarLista = useCallback(() => {
    listaActivaRef.current = null;
    setServidor({ listaId: null, elementos: [] });
  }, []);

  const elementos = useMemo(
    () =>
      servidor.listaId
        ? aplicarCola(servidor.elementos, cola, servidor.listaId)
        : [],
    [servidor, cola],
  );

  // ── Socket ───────────────────────────────────────────────
  const desconectarSocket = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setConectado(null);
  }, []);

  const conectarSocket = useCallback(
    (codigo, aliasUsuario) => {
      socketRef.current?.disconnect();
      yaConectadoRef.current = false;

      const socket = io(API_URL, { transports: ['websocket'] });
      socketRef.current = socket;

      socket.on('connect', () => {
        setConectado(true);
        socket.emit('join_pareja', { codigo, alias: aliasUsuario });
        enviarCola();
        // En reconexiones puede haberse perdido algún evento.
        if (yaConectadoRef.current) recargar();
        yaConectadoRef.current = true;
      });
      socket.on('disconnect', () => setConectado(false));
      socket.on('connect_error', () => setConectado(false));

      EVENTOS_ELEMENTOS.forEach((evento) =>
        socket.on(evento, (payload) =>
          setServidor((prev) =>
            prev.listaId
              ? {
                  ...prev,
                  elementos: aplicarEventoElementos(
                    prev.elementos,
                    evento,
                    payload,
                    prev.listaId,
                  ),
                }
              : prev,
          ),
        ),
      );
      EVENTOS_LISTAS.forEach((evento) =>
        socket.on(evento, (payload) =>
          setListas((prev) => aplicarEventoListas(prev, evento, payload)),
        ),
      );
    },
    [enviarCola, recargar],
  );

  // Cachear lo último confirmado por el servidor.
  useEffect(() => {
    if (servidor.listaId) {
      guardarJSON(CLAVES.elementos(servidor.listaId), servidor.elementos);
    }
  }, [servidor]);

  useEffect(() => {
    if (pareja?.codigo && !hidratando)
      guardarJSON(CLAVES.listas(pareja.codigo), listas);
  }, [listas, pareja, hidratando]);

  // Volver a primer plano: reconectar, enviar pendientes y refrescar.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado !== 'active' || !parejaRef.current) return;
      if (socketRef.current && !socketRef.current.connected) {
        socketRef.current.connect();
      }
      enviarCola();
      recargar();
    });
    return () => sub.remove();
  }, [enviarCola, recargar]);

  // ── Sesión ───────────────────────────────────────────────
  useEffect(() => {
    const cargarSesion = async () => {
      try {
        const [cod, ali] = await Promise.all([
          AsyncStorage.getItem(CLAVES.codigo),
          AsyncStorage.getItem(CLAVES.alias),
        ]);
        colaRef.current = await leerJSON(CLAVES.cola, []);
        setColaState(colaRef.current);
        if (cod && ali) {
          parejaRef.current = { codigo: cod };
          setPareja(parejaRef.current);
          setAlias(ali);
          setListas(await leerJSON(CLAVES.listas(cod), []));
          conectarSocket(cod, ali);
        }
      } finally {
        setHidratando(false);
      }
    };
    cargarSesion();
    return () => socketRef.current?.disconnect();
  }, [conectarSocket]);

  const guardarSesion = async (parejaData, aliasUsuario) => {
    await AsyncStorage.setItem(CLAVES.codigo, parejaData.codigo);
    await AsyncStorage.setItem(CLAVES.alias, aliasUsuario);
    parejaRef.current = parejaData;
    setPareja(parejaData);
    setAlias(aliasUsuario);
    conectarSocket(parejaData.codigo, aliasUsuario);
  };

  const cerrarSesion = async () => {
    await AsyncStorage.multiRemove([CLAVES.codigo, CLAVES.alias, CLAVES.cola]);
    await borrarCaches();
    desconectarSocket();
    clearTimeout(reintentoRef.current);
    parejaRef.current = null;
    listaActivaRef.current = null;
    colaRef.current = [];
    idsRealesRef.current = {};
    setColaState([]);
    setPareja(null);
    setAlias('');
    setListas([]);
    setServidor({ listaId: null, elementos: [] });
  };

  return (
    <AppContext.Provider
      value={{
        colors,
        scheme,
        hidratando,
        pareja,
        alias,
        listas,
        setListas,
        cargarListas,
        elementos,
        listaAbiertaId: servidor.listaId,
        abrirLista,
        cerrarLista,
        recargar,
        mutarElemento,
        resolverId,
        pendientes: cola.length,
        conectado,
        toast,
        mostrarToast,
        ocultarToast,
        guardarSesion,
        cerrarSesion,
        emitir,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
