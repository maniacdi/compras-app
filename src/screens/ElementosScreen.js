import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  ScrollView,
  Animated,
  PanResponder,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { getCategoriaInfo, CATEGORIAS, UNIDADES } from '../constants';
import {
  obtenerElementos,
  crearElemento,
  editarElemento,
  toggleElemento,
  eliminarElemento,
  marcarTodos,
  desmarcarTodos,
} from '../api';

const FILTROS_NECESARIO = [
  { id: 'todos', label: 'Todos' },
  { id: 'true', label: '🛒 Necesito' },
  { id: 'false', label: '✅ Tengo' },
];

function SwipeableItem({ el, colors, onToggle, onEdit, onEliminar }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const s = itemStyles(colors);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 10 && Math.abs(g.dy) < 20,
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) translateX.setValue(Math.max(g.dx, -80));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -50) {
          Animated.spring(translateX, {
            toValue: -72,
            useNativeDriver: true,
          }).start();
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  const cerrar = () =>
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();

  return (
    <View style={s.swipeContainer}>
      <TouchableOpacity
        style={s.swipeBg}
        onPress={() => {
          cerrar();
          onEliminar(el);
        }}
      >
        <Text style={s.swipeBgText}>🗑️</Text>
      </TouchableOpacity>
      <Animated.View
        style={[
          s.item,
          !el.necesario && s.itemChecked,
          { transform: [{ translateX }] },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={s.itemMain}
          onPress={() => {
            cerrar();
            onToggle(el);
          }}
          onLongPress={() => {
            cerrar();
            onEdit(el);
          }}
          activeOpacity={0.7}
        >
          <Text style={s.itemEmoji}>{el.emoji}</Text>
          <View style={s.itemInfo}>
            <Text style={[s.itemNombre, !el.necesario && s.itemNombreChecked]}>
              {el.nombre}
            </Text>
            {el.notas ? <Text style={s.itemNotas}>{el.notas}</Text> : null}
          </View>
          <View style={s.itemRight}>
            <Text
              style={[s.itemCantidad, !el.necesario && s.itemNombreChecked]}
            >
              {el.cantidad} {el.unidad}
            </Text>
            {el.creadoPor ? (
              <Text style={s.itemAutor}>{el.creadoPor}</Text>
            ) : null}
          </View>
          {!el.necesario && <Text style={s.checkmark}>✓</Text>}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

function SeccionCategoria({
  cat,
  items,
  colors,
  onToggle,
  onEdit,
  onEliminar,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const catInfo = getCategoriaInfo(cat);
  const necesarios = items.filter((e) => e.necesario).length;
  const s = styles(colors);

  return (
    <View style={s.seccion}>
      <TouchableOpacity
        style={s.seccionHeader}
        onPress={() => setCollapsed(!collapsed)}
      >
        <Text style={s.seccionEmoji}>{catInfo.emoji}</Text>
        <Text style={s.seccionNombre}>{catInfo.nombre}</Text>
        <Text style={s.seccionContador}>
          {necesarios}/{items.length}
        </Text>
        <Text style={s.seccionArrow}>{collapsed ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {!collapsed &&
        items.map((el) => (
          <SwipeableItem
            key={el._id}
            el={el}
            colors={colors}
            onToggle={onToggle}
            onEdit={onEdit}
            onEliminar={onEliminar}
          />
        ))}
    </View>
  );
}

export default function ElementosScreen({ route }) {
  const { lista } = route.params;
  const { colors, alias, elementos, setElementos, emitir } = useApp();

  const [cargando, setCargando] = useState(true);
  const [buscar, setBuscar] = useState('');
  const [filtroNec, setFiltroNec] = useState('todos');
  const [catsFiltro, setCatsFiltro] = useState([]);
  const [modalFiltro, setModalFiltro] = useState(false);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [fNombre, setFNombre] = useState('');
  const [fEmoji, setFEmoji] = useState('🛍️');
  const [fCategoria, setFCategoria] = useState('otros');
  const [fCantidad, setFCantidad] = useState('1');
  const [fUnidad, setFUnidad] = useState('ud');
  const [fNotas, setFNotas] = useState('');

  const s = styles(colors);

  useEffect(() => {
    cargar();
  }, []);

  const cargar = async () => {
    try {
      const res = await obtenerElementos(lista._id);
      setElementos(res.elementos);
    } catch {
      Alert.alert('Error', 'No se pudieron cargar los elementos.');
    } finally {
      setCargando(false);
    }
  };

  const elementosFiltrados = useMemo(() => {
    return elementos
      .filter((e) => e.lista === lista._id)
      .filter((e) =>
        filtroNec === 'todos' ? true : String(e.necesario) === filtroNec,
      )
      .filter((e) =>
        catsFiltro.length === 0 ? true : catsFiltro.includes(e.categoria),
      )
      .filter((e) =>
        buscar ? e.nombre.toLowerCase().includes(buscar.toLowerCase()) : true,
      )
      .sort((a, b) => {
        if (a.categoria < b.categoria) return -1;
        if (a.categoria > b.categoria) return 1;
        return a.orden - b.orden || a.nombre.localeCompare(b.nombre);
      });
  }, [elementos, filtroNec, catsFiltro, buscar, lista._id]);

  const secciones = useMemo(() => {
    const grupos = {};
    elementosFiltrados.forEach((e) => {
      if (!grupos[e.categoria]) grupos[e.categoria] = [];
      grupos[e.categoria].push(e);
    });
    return Object.entries(grupos);
  }, [elementosFiltrados]);

  const totalLista = elementos.filter((e) => e.lista === lista._id);
  const pendientes = totalLista.filter((e) => e.necesario).length;

  const handleToggle = async (el) => {
    try {
      const res = await toggleElemento(el._id);
      setElementos((prev) =>
        prev.map((e) => (e._id === el._id ? res.elemento : e)),
      );
      emitir('elemento_toggle', res.elemento);
    } catch {}
  };

  const handleEliminar = (el) => {
    Alert.alert('Eliminar', `¿Eliminar "${el.nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await eliminarElemento(el._id);
            setElementos((prev) => prev.filter((e) => e._id !== el._id));
            emitir('elemento_eliminado', {
              elementoId: el._id,
              listaId: lista._id,
            });
          } catch {
            Alert.alert('Error', 'No se pudo eliminar.');
          }
        },
      },
    ]);
  };

  const abrirModal = (el = null) => {
    setEditando(el);
    setFNombre(el?.nombre || '');
    setFEmoji(el?.emoji || '🛍️');
    setFCategoria(el?.categoria || 'otros');
    setFCantidad(String(el?.cantidad || '1'));
    setFUnidad(el?.unidad || 'ud');
    setFNotas(el?.notas || '');
    setModal(true);
  };

  const guardar = async () => {
    if (!fNombre.trim()) return Alert.alert('Falta el nombre');
    const datos = {
      nombre: fNombre.trim(),
      emoji: fEmoji,
      categoria: fCategoria,
      cantidad: parseFloat(fCantidad) || 1,
      unidad: fUnidad,
      notas: fNotas.trim(),
      creadoPor: alias,
    };
    try {
      if (editando) {
        const res = await editarElemento(editando._id, datos);
        setElementos((prev) =>
          prev.map((e) => (e._id === editando._id ? res.elemento : e)),
        );
        emitir('elemento_actualizado', res.elemento);
      } else {
        const res = await crearElemento(lista._id, datos);
        setElementos((prev) => [...prev, res.elemento]);
        emitir('elemento_creado', res.elemento);
      }
      setModal(false);
    } catch (e) {
      Alert.alert(
        e.response?.status === 409 ? 'Ya existe' : 'Error',
        e.response?.status === 409
          ? 'Ya hay un elemento con ese nombre.'
          : 'No se pudo guardar.',
      );
    }
  };

  const handleMarcarTodos = async () => {
    try {
      await marcarTodos(lista._id);
      setElementos((prev) =>
        prev.map((e) =>
          e.lista === lista._id ? { ...e, necesario: true } : e,
        ),
      );
      emitir('todos_marcados', { listaId: lista._id });
    } catch {}
  };

  const handleDesmarcarTodos = async () => {
    Alert.alert('Desmarcar todos', '¿Poner todos como "ya lo tengo"?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desmarcar',
        onPress: async () => {
          try {
            await desmarcarTodos(lista._id);
            setElementos((prev) =>
              prev.map((e) =>
                e.lista === lista._id ? { ...e, necesario: false } : e,
              ),
            );
            emitir('todos_desmarcados', { listaId: lista._id });
          } catch {}
        },
      },
    ]);
  };

  const toggleCatFiltro = (catId) =>
    setCatsFiltro((prev) =>
      prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId],
    );

  const catsConElementos = useMemo(() => {
    const ids = new Set(
      elementos.filter((e) => e.lista === lista._id).map((e) => e.categoria),
    );
    return CATEGORIAS.filter((c) => ids.has(c.id));
  }, [elementos, lista._id]);

  if (cargando)
    return (
      <View style={[s.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size='large' color={colors.primary} />
      </View>
    );

  return (
    <View style={s.container}>
      {totalLista.length > 0 && (
        <View style={s.resumen}>
          <Text style={s.resumenText}>
            🛒 <Text style={s.resumenNum}>{pendientes}</Text> de{' '}
            {totalLista.length} pendientes
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
              style={[s.filterChip, filtroNec === f.id && s.filterChipActive]}
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
            style={[s.filterChip, catsFiltro.length > 0 && s.filterChipActive]}
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
        </ScrollView>
      </View>

      <View style={s.actionsRow}>
        <TouchableOpacity style={s.actionChip} onPress={handleMarcarTodos}>
          <Text style={s.actionChipText}>✅ Marcar todos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.actionChip} onPress={handleDesmarcarTodos}>
          <Text style={s.actionChipText}>⬜ Desmarcar todos</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={secciones}
        keyExtractor={([cat]) => cat}
        contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
        ListEmptyComponent={
          <Text style={s.empty}>
            No hay elementos.{'\n'}Añade el primero con el botón + 👇
          </Text>
        }
        renderItem={({ item: [cat, items] }) => (
          <SeccionCategoria
            cat={cat}
            items={items}
            colors={colors}
            onToggle={handleToggle}
            onEdit={abrirModal}
            onEliminar={handleEliminar}
          />
        )}
      />

      <TouchableOpacity style={s.fab} onPress={() => abrirModal()}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>

      {/* Modal filtro categorías */}
      <Modal visible={modalFiltro} transparent animationType='slide'>
        <View style={s.modalOverlay}>
          <View style={[s.modalBox]}>
            <View style={s.modalHeaderRow}>
              <Text style={s.modalTitulo}>Filtrar categorías</Text>
              {catsFiltro.length > 0 && (
                <TouchableOpacity onPress={() => setCatsFiltro([])}>
                  <Text style={s.limpiarFiltro}>Limpiar</Text>
                </TouchableOpacity>
              )}
            </View>
            <ScrollView>
              {catsConElementos.map((c) => {
                const activa = catsFiltro.includes(c.id);
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={s.catRow}
                    onPress={() => toggleCatFiltro(c.id)}
                  >
                    <Text style={s.catRowEmoji}>{c.emoji}</Text>
                    <Text
                      style={[
                        s.catRowNombre,
                        activa && { color: colors.primary },
                      ]}
                    >
                      {c.nombre}
                    </Text>
                    <Text style={s.catCheck}>{activa ? '☑️' : '⬜'}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={[s.btnApply, { marginTop: 16 }]}
              onPress={() => setModalFiltro(false)}
            >
              <Text style={s.btnSaveText}>Aplicar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal añadir/editar */}
      <Modal visible={modal} transparent animationType='slide'>
        <View style={s.modalOverlay}>
          <ScrollView style={s.modalBox} keyboardShouldPersistTaps='handled'>
            <Text style={s.modalTitulo}>
              {editando ? 'Editar elemento' : 'Añadir elemento'}
            </Text>
            <Text style={s.label}>Nombre</Text>
            <TextInput
              style={s.input}
              placeholder='Ej: Leche'
              placeholderTextColor={colors.textMuted}
              value={fNombre}
              onChangeText={setFNombre}
              autoFocus
            />
            <Text style={s.label}>Emoji</Text>
            <TextInput
              style={[s.input, { fontSize: 28, textAlign: 'center' }]}
              value={fEmoji}
              onChangeText={setFEmoji}
              maxLength={2}
            />
            <Text style={s.label}>Categoría</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View
                style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}
              >
                {CATEGORIAS.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      s.filterChip,
                      fCategoria === c.id && s.filterChipActive,
                    ]}
                    onPress={() => setFCategoria(c.id)}
                  >
                    <Text
                      style={[
                        s.filterChipText,
                        fCategoria === c.id && s.filterChipTextActive,
                      ]}
                    >
                      {c.emoji} {c.nombre}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Cantidad</Text>
                <TextInput
                  style={s.input}
                  value={fCantidad}
                  onChangeText={setFCantidad}
                  keyboardType='numeric'
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Unidad</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View
                    style={{ flexDirection: 'row', gap: 6, paddingVertical: 4 }}
                  >
                    {UNIDADES.map((u) => (
                      <TouchableOpacity
                        key={u}
                        style={[
                          s.filterChip,
                          fUnidad === u && s.filterChipActive,
                        ]}
                        onPress={() => setFUnidad(u)}
                      >
                        <Text
                          style={[
                            s.filterChipText,
                            fUnidad === u && s.filterChipTextActive,
                          ]}
                        >
                          {u}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>
            <Text style={s.label}>Notas (opcional)</Text>
            <TextInput
              style={s.input}
              placeholder='Ej: Marca Hacendado, sin lactosa...'
              placeholderTextColor={colors.textMuted}
              value={fNotas}
              onChangeText={setFNotas}
              multiline
            />
            <View style={s.modalBtns}>
              <TouchableOpacity
                style={s.btnCancel}
                onPress={() => setModal(false)}
              >
                <Text style={s.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnSave} onPress={guardar}>
                <Text style={s.btnSaveText}>Guardar</Text>
              </TouchableOpacity>
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = (c) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    resumen: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
    resumenText: { fontSize: 13, color: c.textSub },
    resumenNum: { fontWeight: '700', color: c.primary },
    searchRow: { padding: 12, paddingBottom: 0 },
    search: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      padding: 10,
      fontSize: 15,
      color: c.text,
    },
    filtersRow: { marginTop: 8 },
    filtersContent: {
      paddingHorizontal: 12,
      gap: 8,
      alignItems: 'center',
      paddingVertical: 4,
    },
    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    filterChipActive: { backgroundColor: c.primary, borderColor: c.primary },
    filterChipText: { fontSize: 13, color: c.textSub },
    filterChipTextActive: { color: '#fff', fontWeight: '600' },
    filterDivider: { width: 1, height: 24, backgroundColor: c.border },
    actionsRow: { flexDirection: 'row', gap: 8, padding: 12, paddingTop: 8 },
    actionChip: {
      flex: 1,
      padding: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
    },
    actionChipText: { fontSize: 12, color: c.textSub },
    seccion: { marginBottom: 8 },
    seccionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 4,
    },
    seccionEmoji: { fontSize: 16, marginRight: 6 },
    seccionNombre: {
      flex: 1,
      fontSize: 13,
      fontWeight: '700',
      color: c.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    seccionContador: { fontSize: 12, color: c.textMuted, marginRight: 6 },
    seccionArrow: { fontSize: 10, color: c.textMuted },
    empty: {
      textAlign: 'center',
      color: c.textMuted,
      marginTop: 60,
      fontSize: 16,
      lineHeight: 28,
    },
    fab: {
      position: 'absolute',
      bottom: 24,
      right: 24,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: c.primary,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 4,
    },
    fabText: { color: '#fff', fontSize: 32, lineHeight: 36 },
    modalOverlay: {
      flex: 1,
      backgroundColor: '#00000088',
      justifyContent: 'flex-end',
    },
    modalBox: {
      backgroundColor: c.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 24,
      maxHeight: '90%',
      height: '90%',
    },
    modalHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    modalTitulo: { fontSize: 20, fontWeight: '700', color: c.text },
    limpiarFiltro: { color: c.danger, fontSize: 14 },
    catRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    catRowEmoji: { fontSize: 22, marginRight: 12 },
    catRowNombre: { flex: 1, fontSize: 16, color: c.text },
    catCheck: { fontSize: 20 },
    label: { fontSize: 13, color: c.textSub, marginBottom: 6, marginTop: 12 },
    input: {
      backgroundColor: c.surfaceAlt,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      padding: 12,
      fontSize: 16,
      color: c.text,
    },
    modalBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
    btnCancel: {
      flex: 1,
      padding: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
    },
    btnCancelText: { color: c.text },
    btnSave: {
      flex: 1,
      padding: 14,
      borderRadius: 10,
      backgroundColor: c.primary,
      alignItems: 'center',
    },
    btnApply: {
      flex: 1,
      padding: 14,
      borderRadius: 10,
      maxHeight: 48,
      backgroundColor: c.primary,
      alignItems: 'center',
    },
    btnSaveText: { color: '#fff', fontWeight: '700' },
  });

const itemStyles = (c) =>
  StyleSheet.create({
    swipeContainer: { marginBottom: 6, borderRadius: 12, overflow: 'hidden' },
    swipeBg: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: 72,
      backgroundColor: c.danger,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 12,
    },
    swipeBgText: { fontSize: 22 },
    item: {
      backgroundColor: c.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    itemChecked: { backgroundColor: c.checked, borderColor: c.checked },
    itemMain: { flexDirection: 'row', alignItems: 'center', padding: 12 },
    itemEmoji: { fontSize: 28, marginRight: 12 },
    itemInfo: { flex: 1 },
    itemNombre: { fontSize: 16, fontWeight: '600', color: c.text },
    itemNombreChecked: {
      color: c.checkedText,
      textDecorationLine: 'line-through',
    },
    itemNotas: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    itemRight: { alignItems: 'flex-end', gap: 2 },
    itemCantidad: { fontSize: 13, fontWeight: '600', color: c.textSub },
    itemAutor: { fontSize: 11, color: c.textMuted },
    checkmark: {
      position: 'absolute',
      right: 12,
      fontSize: 16,
      color: c.primary,
    },
  });
