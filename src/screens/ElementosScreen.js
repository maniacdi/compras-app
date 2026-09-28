import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { getCategoriaInfo } from '../constants';
import { useApp } from '../context/AppContext';
import { useStyles } from '../hooks/useStyles';
import { useOrdenCategorias } from '../hooks/useOrdenCategorias';
import { agruparPorCategoria, reordenarPresentes } from '../logic/orden';
import { nuevoIdTemporal } from '../logic/outbox';
import { textoCompartir } from '../logic/compartir';
import EstadoConexion from '../components/EstadoConexion';
import { DURACION_TOAST } from '../components/Toast';
import { estilos } from '../components/elementos/estilos';
import SeccionCategoria from '../components/elementos/SeccionCategoria';
import ElementoFormModal from '../components/elementos/ElementoFormModal';
import FiltroCategoriasModal from '../components/elementos/FiltroCategoriasModal';
import OrdenarCategoriasModal from '../components/elementos/OrdenarCategoriasModal';

const FILTROS_NECESARIO = [
  { id: 'todos', label: 'Todos' },
  { id: 'true', label: '🛒 Necesito' },
  { id: 'false', label: '✅ Tengo' },
];

function PantallaEncendida() {
  useKeepAwake();
  return null;
}

export default function ElementosScreen({ route, navigation }) {
  const { lista } = route.params;
  const listaId = lista._id;
  const {
    colors,
    alias,
    listas,
    elementos,
    listaAbiertaId,
    abrirLista,
    cerrarLista,
    recargar,
    mutarElemento,
    resolverId,
    mostrarToast,
  } = useApp();
  const s = useStyles(estilos);
  const [orden, setOrden] = useOrdenCategorias(listaId);

  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [buscar, setBuscar] = useState('');
  const [filtroNec, setFiltroNec] = useState('todos');
  const [catsFiltro, setCatsFiltro] = useState([]);
  const [modalFiltro, setModalFiltro] = useState(false);
  // Categorías a ordenar (copia al abrir) o null si el modal está cerrado.
  const [ordenando, setOrdenando] = useState(null);
  const [form, setForm] = useState({ visible: false, elemento: null });
  const [modoCompra, setModoCompra] = useState(false);
  const [idsCompra, setIdsCompra] = useState(() => new Set());
  // Borrados en espera de "Deshacer": id → timeout.
  const [ocultos, setOcultos] = useState(() => new Set());
  const borrados = useRef(new Map());

  useEffect(() => {
    abrirLista(listaId).finally(() => setCargandoInicial(false));
    return () => cerrarLista();
  }, [listaId, abrirLista, cerrarLista]);

  // ── Lista renombrada o eliminada por la pareja ───────────
  const listaActual = listas.find((l) => l._id === listaId);
  const existia = useRef(false);
  useEffect(() => {
    if (listaActual) existia.current = true;
    else if (existia.current) {
      mostrarToast('La lista se ha eliminado');
      navigation.goBack();
    }
  }, [listaActual, navigation, mostrarToast]);
  const infoLista = listaActual || lista;

  // ── Datos derivados ──────────────────────────────────────
  const delaLista = useMemo(() => {
    if (listaAbiertaId !== listaId) return [];
    // Un borrado pendiente puede guardar el id temporal de algo ya creado.
    const ocultosReales = new Set([...ocultos].map(resolverId));
    return elementos.filter(
      (e) => e.lista === listaId && !ocultosReales.has(e._id),
    );
  }, [elementos, listaAbiertaId, listaId, ocultos, resolverId]);
  const pendientes = delaLista.filter((e) => e.necesario).length;

  const visibles = useMemo(() => {
    if (modoCompra) return delaLista.filter((e) => e.necesario);
    const texto = buscar.toLowerCase();
    return delaLista.filter(
      (e) =>
        (filtroNec === 'todos' || String(e.necesario) === filtroNec) &&
        (catsFiltro.length === 0 || catsFiltro.includes(e.categoria)) &&
        (!texto || e.nombre.toLowerCase().includes(texto)),
    );
  }, [delaLista, modoCompra, buscar, filtroNec, catsFiltro]);

  const secciones = useMemo(
    () => agruparPorCategoria(visibles, orden),
    [visibles, orden],
  );

  const catsPresentes = useMemo(
    () => agruparPorCategoria(delaLista, orden).map(([cat]) => cat),
    [delaLista, orden],
  );

  const progreso = useMemo(() => {
    const enCompra = delaLista.filter(
      (e) => idsCompra.has(e._id) || e.necesario,
    );
    const hechos = enCompra.filter((e) => !e.necesario).length;
    return { hechos, total: enCompra.length };
  }, [delaLista, idsCompra]);

  // ── Acciones ─────────────────────────────────────────────
  const handleToggle = useCallback(
    (el) => {
      const op = { tipo: 'toggle', elementoId: el._id, listaId };
      mutarElemento(op);
      if (modoCompra && el.necesario) {
        mostrarToast(`✓ ${el.nombre}`, {
          label: 'DESHACER',
          onPress: () => mutarElemento(op),
        });
      }
    },
    [listaId, modoCompra, mutarElemento, mostrarToast],
  );

  const mostrar = (id) =>
    setOcultos((prev) => {
      const n = new Set(prev);
      n.delete(id);
      return n;
    });

  const confirmarBorrado = useCallback(
    (id) => {
      clearTimeout(borrados.current.get(id));
      borrados.current.delete(id);
      mutarElemento({ tipo: 'eliminar', elementoId: id, listaId });
      mostrar(id);
    },
    [listaId, mutarElemento],
  );

  const handleEliminar = useCallback(
    (el) => {
      setOcultos((prev) => new Set(prev).add(el._id));
      const t = setTimeout(() => confirmarBorrado(el._id), DURACION_TOAST);
      borrados.current.set(el._id, t);
      mostrarToast(`Eliminado «${el.nombre}»`, {
        label: 'DESHACER',
        onPress: () => {
          clearTimeout(borrados.current.get(el._id));
          borrados.current.delete(el._id);
          mostrar(el._id);
        },
      });
    },
    [confirmarBorrado, mostrarToast],
  );

  // Al salir de la pantalla, los borrados pendientes se ejecutan ya.
  useEffect(() => {
    const pendientesBorrar = borrados.current;
    return () => {
      [...pendientesBorrar.keys()].forEach((id) => {
        clearTimeout(pendientesBorrar.get(id));
        mutarElemento({ tipo: 'eliminar', elementoId: id, listaId });
      });
      pendientesBorrar.clear();
    };
  }, [listaId, mutarElemento]);

  const abrirForm = useCallback(
    (elemento = null) => setForm({ visible: true, elemento }),
    [],
  );
  const cerrarForm = () => setForm((f) => ({ ...f, visible: false }));

  const guardarForm = (datos) => {
    const editando = form.elemento;
    const nombre = datos.nombre.toLowerCase();
    const duplicado = delaLista.some(
      (e) => e._id !== editando?._id && e.nombre.toLowerCase() === nombre,
    );
    if (duplicado) {
      return Alert.alert('Ya existe', 'Ya hay un elemento con ese nombre.');
    }
    if (editando) {
      mutarElemento({
        tipo: 'editar',
        elementoId: editando._id,
        listaId,
        datos,
      });
    } else {
      mutarElemento({
        tipo: 'crear',
        elementoId: nuevoIdTemporal(),
        listaId,
        datos: { ...datos, creadoPor: alias },
      });
    }
    cerrarForm();
  };

  const handleMarcarTodos = () =>
    mutarElemento({ tipo: 'marcarTodos', listaId });

  const handleDesmarcarTodos = () =>
    Alert.alert('Desmarcar todos', '¿Poner todos como "ya lo tengo"?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desmarcar',
        onPress: () => mutarElemento({ tipo: 'desmarcarTodos', listaId }),
      },
    ]);

  const toggleCatFiltro = (catId) =>
    setCatsFiltro((prev) =>
      prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId],
    );

  const onRefresh = async () => {
    setRefrescando(true);
    await recargar();
    setRefrescando(false);
  };

  const compartir = useCallback(() => {
    Share.share({ message: textoCompartir(infoLista, delaLista, orden) });
  }, [infoLista, delaLista, orden]);

  const toggleModoCompra = useCallback(() => {
    if (!modoCompra) {
      setIdsCompra(
        new Set(delaLista.filter((e) => e.necesario).map((e) => e._id)),
      );
    }
    setModoCompra(!modoCompra);
  }, [modoCompra, delaLista]);

  // ── Header ───────────────────────────────────────────────
  useLayoutEffect(() => {
    navigation.setOptions({
      title: `${infoLista.emoji} ${infoLista.nombre}`,
      headerRight: () => (
        <View style={s.headerBtns}>
          <TouchableOpacity style={s.headerBtn} onPress={compartir} hitSlop={8}>
            <Text style={s.headerBtnText}>📤</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.headerBtn, modoCompra && s.headerBtnActivo]}
            onPress={toggleModoCompra}
            hitSlop={8}
          >
            <Text style={s.headerBtnText}>🛒</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, infoLista, compartir, toggleModoCompra, modoCompra, s]);

  // ── Render ───────────────────────────────────────────────
  if (cargandoInicial && delaLista.length === 0) {
    return (
      <View style={[s.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size='large' color={colors.primary} />
      </View>
    );
  }

  const refreshControl = (
    <RefreshControl
      refreshing={refrescando}
      onRefresh={onRefresh}
      tintColor={colors.primary}
      colors={[colors.primary]}
    />
  );

  const compraTerminada = modoCompra && pendientes === 0;

  return (
    <View style={s.container}>
      {modoCompra && <PantallaEncendida />}
      <EstadoConexion />

      {modoCompra ? (
        <View style={s.compraBar}>
          <Text style={s.compraTitulo}>MODO COMPRA</Text>
          <Text style={s.compraNum}>
            {progreso.hechos} / {progreso.total} en el carro
          </Text>
          <View style={s.compraTrack}>
            <View
              style={[
                s.compraFill,
                {
                  width: progreso.total
                    ? `${(progreso.hechos / progreso.total) * 100}%`
                    : '100%',
                },
              ]}
            />
          </View>
        </View>
      ) : (
        <>
          {delaLista.length > 0 && (
            <View style={s.resumen}>
              <Text style={s.resumenText}>
                🛒 <Text style={s.resumenNum}>{pendientes}</Text> de{' '}
                {delaLista.length} pendientes
              </Text>
            </View>
          )}

          <View style={s.searchRow}>
            <TextInput
              style={s.search}
              placeholder='🔍 Buscar elemento...'
              placeholderTextColor={colors.textMuted}
              value={buscar}
              onChangeText={setBuscar}
            />
          </View>

          <View style={s.filtersRow}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.filtersContent}
            >
              {FILTROS_NECESARIO.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[
                    s.filterChip,
                    filtroNec === f.id && s.filterChipActive,
                  ]}
                  onPress={() => setFiltroNec(f.id)}
                >
                  <Text
                    style={[
                      s.filterChipText,
                      filtroNec === f.id && s.filterChipTextActive,
                    ]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
              <View style={s.filterDivider} />
              <TouchableOpacity
                style={[
                  s.filterChip,
                  catsFiltro.length > 0 && s.filterChipActive,
                ]}
                onPress={() => setModalFiltro(true)}
              >
                <Text
                  style={[
                    s.filterChipText,
                    catsFiltro.length > 0 && s.filterChipTextActive,
                  ]}
                >
                  {catsFiltro.length === 0
                    ? '🏷️ Categorías'
                    : `🏷️ ${catsFiltro.length} selec.`}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.filterChip}
                onPress={() => setOrdenando(catsPresentes)}
                disabled={catsPresentes.length < 2}
              >
                <Text style={s.filterChipText}>↕ Ordenar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          <View style={s.actionsRow}>
            <TouchableOpacity style={s.actionChip} onPress={handleMarcarTodos}>
              <Text style={s.actionChipText}>✅ Marcar todos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.actionChip}
              onPress={handleDesmarcarTodos}
            >
              <Text style={s.actionChipText}>⬜ Desmarcar todos</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {compraTerminada ? (
        <View style={s.finContainer}>
          <Text style={s.finEmoji}>🎉</Text>
          <Text style={s.finTitulo}>Compra terminada</Text>
          <TouchableOpacity style={s.btnApply} onPress={toggleModoCompra}>
            <Text style={s.btnSaveText}>Salir del modo compra</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={secciones}
          keyExtractor={([cat]) => cat}
          contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
          refreshControl={refreshControl}
          ListEmptyComponent={
            <View style={s.emptyContainer}>
              <Text style={s.emptyIcon}>🛍️</Text>
              <Text style={s.emptyText}>
                {delaLista.length === 0
                  ? 'No hay elementos.\nAñade el primero con el + 👇'
                  : 'Nada coincide con los filtros.'}
              </Text>
            </View>
          }
          renderItem={({ item: [cat, items] }) => (
            <SeccionCategoria
              cat={cat}
              items={items}
              onToggle={handleToggle}
              onEdit={abrirForm}
              onEliminar={handleEliminar}
              forzarAbierta={Boolean(buscar) || modoCompra}
              grande={modoCompra}
            />
          )}
        />
      )}

      {!modoCompra && (
        <TouchableOpacity style={s.fab} onPress={() => abrirForm()}>
          <Text style={s.fabText}>+</Text>
        </TouchableOpacity>
      )}

      <FiltroCategoriasModal
        visible={modalFiltro}
        onClose={() => setModalFiltro(false)}
        categorias={catsPresentes.map(getCategoriaInfo)}
        seleccion={catsFiltro}
        onToggle={toggleCatFiltro}
        onLimpiar={() => setCatsFiltro([])}
      />

      <OrdenarCategoriasModal
        visible={ordenando !== null}
        categorias={ordenando || []}
        onClose={() => setOrdenando(null)}
        onGuardar={(nuevas) => setOrden(reordenarPresentes(orden, nuevas))}
      />

      <ElementoFormModal
        visible={form.visible}
        elemento={form.elemento}
        onClose={cerrarForm}
        onGuardar={guardarForm}
      />
    </View>
  );
}
