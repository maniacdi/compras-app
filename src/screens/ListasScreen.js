import { useEffect, useState } from 'react';
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
  RefreshControl,
  Share,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { useStyles } from '../hooks/useStyles';
import { crearLista, editarLista, eliminarLista } from '../api';
import { esErrorDeRed } from '../logic/outbox';
import EstadoConexion from '../components/EstadoConexion';

const EMOJIS_LISTA = ['🛒', '🏠', '🏕️', '🎉'];

export default function ListasScreen({ navigation }) {
  const {
    colors,
    pareja,
    alias,
    listas,
    setListas,
    cargarListas,
    emitir,
    mostrarToast,
    cerrarSesion,
  } = useApp();
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [nombre, setNombre] = useState('');
  const [emojiSel, setEmojiSel] = useState('🛒');

  const s = useStyles(styles);

  useEffect(() => {
    cargarListas().finally(() => setCargando(false));
  }, [cargarListas]);

  const onRefresh = async () => {
    setRefrescando(true);
    await cargarListas();
    setRefrescando(false);
  };

  // Las listas solo se modifican con conexión.
  const avisarError = (e, mensaje) =>
    mostrarToast(
      esErrorDeRed(e) ? 'Sin conexión: prueba cuando tengas red' : mensaje,
    );

  const compartirCodigo = () => {
    Share.share({
      message: `Únete a mi lista de compra con el código: ${pareja?.codigo}\n\nDescarga la app y ponlo en "Unirme con código" 🛒`,
    });
  };

  const abrirModal = (lista = null) => {
    setEditando(lista);
    setNombre(lista?.nombre || '');
    setEmojiSel(lista?.emoji || '🛒');
    setModal(true);
  };

  const guardar = async () => {
    if (!nombre.trim()) return Alert.alert('Falta el nombre');
    try {
      if (editando) {
        const res = await editarLista(editando._id, {
          nombre: nombre.trim(),
          emoji: emojiSel,
        });
        setListas((prev) =>
          prev.map((l) => (l._id === editando._id ? res.lista : l)),
        );
        emitir('lista_actualizada', res.lista);
      } else {
        const res = await crearLista(pareja.codigo, {
          nombre: nombre.trim(),
          emoji: emojiSel,
        });
        setListas((prev) => [...prev, res.lista]);
        emitir('lista_creada', res.lista);
      }
      setModal(false);
    } catch (e) {
      avisarError(e, 'No se pudo guardar la lista');
    }
  };

  const confirmarEliminar = (lista) => {
    Alert.alert(
      'Eliminar lista',
      `¿Eliminar "${lista.nombre}" y todos sus elementos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await eliminarLista(lista._id);
              setListas((prev) => prev.filter((l) => l._id !== lista._id));
              emitir('lista_eliminada', { listaId: lista._id });
            } catch (e) {
              avisarError(e, 'No se pudo eliminar la lista');
            }
          },
        },
      ],
    );
  };

  const abrirLista = (lista) => navigation.navigate('Elementos', { lista });

  if (cargando && listas.length === 0)
    return (
      <View style={[s.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size='large' color={colors.primary} />
      </View>
    );

  return (
    <View style={s.container}>
      <EstadoConexion />
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.saludo}>Hola, {alias} 👋</Text>
          <TouchableOpacity onPress={compartirCodigo} style={s.codigoRow}>
            <Text style={s.codigo}>{pareja?.codigo}</Text>
            <Text style={s.compartir}> 📤</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          onPress={() =>
            Alert.alert('Cerrar sesión', '¿Seguro?', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Salir', style: 'destructive', onPress: cerrarSesion },
            ])
          }
        >
          <Text style={s.salir}>Salir</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={listas}
        keyExtractor={(l) => l._id}
        contentContainerStyle={s.lista}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={s.emptyContainer}>
            <Text style={s.emptyIcon}>🧺</Text>
            <Text style={s.emptyText}>
              Aún no hay listas.{'\n'}Crea la primera 👇
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.card}
            onPress={() => abrirLista(item)}
            activeOpacity={0.7}
          >
            <Text style={s.cardEmoji}>{item.emoji}</Text>
            <Text style={s.cardNombre}>{item.nombre}</Text>
            <TouchableOpacity
              onPress={() => abrirModal(item)}
              style={s.actionBtn}
            >
              <Text style={s.actionText}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => confirmarEliminar(item)}
              style={s.actionBtn}
            >
              <Text style={s.actionText}>🗑️</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />

      {/* FAB */}
      <TouchableOpacity style={s.fab} onPress={() => abrirModal()}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>

      {/* Modal crear/editar */}
      <Modal
        visible={modal}
        transparent
        animationType='slide'
        onRequestClose={() => setModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitulo}>
              {editando ? 'Editar lista' : 'Nueva lista'}
            </Text>

            <Text style={s.label}>Nombre</Text>
            <TextInput
              style={s.input}
              placeholder='Ej: Mercadona'
              placeholderTextColor={colors.textMuted}
              value={nombre}
              onChangeText={setNombre}
              maxLength={30}
              autoFocus
            />

            <Text style={s.label}>Icono</Text>
            <View style={s.emojisGrid}>
              {EMOJIS_LISTA.map((e) => (
                <TouchableOpacity
                  key={e}
                  style={[s.emojiBtn, emojiSel === e && s.emojiBtnSel]}
                  onPress={() => setEmojiSel(e)}
                >
                  <Text style={s.emojiOpt}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>

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
          </View>
        </View>
      </Modal>
    </View>
  );
}

const F = { sm: 13, md: 16, lg: 22 };

const styles = (c) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },

    // Header
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 52,
      paddingBottom: 20,
    },
    saludo: {
      fontSize: F.lg,
      fontWeight: '800',
      color: c.text,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    codigoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    codigo: {
      fontSize: F.sm,
      color: c.textMuted,
      letterSpacing: 1.5,
      fontWeight: '600',
    },
    compartir: { fontSize: F.sm },
    salir: { fontSize: F.sm, color: c.danger },

    // Lista
    lista: { paddingHorizontal: 16, paddingBottom: 100 },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 8,
      borderBottomWidth: 1.5,
      borderBottomColor: c.border,
    },
    cardEmoji: { fontSize: 28, marginRight: 14 },
    cardNombre: { flex: 1, fontSize: F.md, fontWeight: '700', color: c.text },
    actionBtn: { paddingHorizontal: 8, paddingVertical: 4 },
    actionText: { fontSize: F.md },

    // Empty
    emptyContainer: { alignItems: 'center', marginTop: 80 },
    emptyIcon: { fontSize: 56, marginBottom: 16 },
    emptyText: {
      fontSize: F.md,
      color: c.textMuted,
      textAlign: 'center',
      lineHeight: 26,
    },

    // FAB
    fab: {
      position: 'absolute',
      bottom: 28,
      right: 24,
      width: 58,
      height: 58,
      borderRadius: 0,
      borderWidth: 2,
      borderColor: c.text,
      backgroundColor: c.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    fabText: { color: '#fff', fontSize: 30, lineHeight: 34 },

    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: '#00000088',
      justifyContent: 'flex-end',
    },
    modalBox: {
      backgroundColor: c.surface,
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      borderTopWidth: 2,
      borderColor: c.border,
      padding: 24,
      paddingBottom: 40,
    },
    modalTitulo: {
      fontSize: F.lg,
      fontWeight: '800',
      letterSpacing: 0.5,
      color: c.text,
      marginBottom: 16,
    },
    label: {
      fontSize: F.sm,
      color: c.textSub,
      marginBottom: 6,
      marginTop: 12,
      fontWeight: '800',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    input: {
      backgroundColor: c.surfaceAlt,
      borderWidth: 1.5,
      borderColor: c.border,
      borderRadius: 0,
      padding: 12,
      fontSize: F.md,
      color: c.text,
    },
    emojisGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 4,
    },
    emojiBtn: {
      padding: 10,
      borderRadius: 0,
      borderWidth: 1.5,
      borderColor: c.border,
    },
    emojiBtnSel: {
      borderColor: c.primary,
      backgroundColor: c.primary,
    },
    emojiOpt: { fontSize: 24 },
    modalBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
    btnCancel: {
      flex: 1,
      padding: 14,
      borderRadius: 0,
      borderWidth: 2,
      borderColor: c.border,
      alignItems: 'center',
    },
    btnCancelText: { fontSize: F.md, color: c.text },
    btnSave: {
      flex: 1,
      padding: 14,
      borderRadius: 0,
      backgroundColor: c.primary,
      alignItems: 'center',
    },
    btnSaveText: { fontSize: F.md, color: '#fff', fontWeight: '700' },
  });
