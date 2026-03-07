import React, { useEffect, useState } from 'react';
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
  Share,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { obtenerListas, crearLista, editarLista, eliminarLista } from '../api';

const EMOJIS_LISTA = ['🛒', '🧺', '🏠', '🏕️', '🎉'];

export default function ListasScreen({ navigation }) {
  const {
    colors,
    pareja,
    alias,
    listas,
    setListas,
    setListaActiva,
    emitir,
    cerrarSesion,
  } = useApp();
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [nombre, setNombre] = useState('');
  const [emojiSel, setEmojiSel] = useState('🛒');

  const s = styles(colors);

  useEffect(() => {
    cargar();
  }, []);

  const cargar = async () => {
    try {
      const res = await obtenerListas(pareja.codigo);
      setListas(res.listas);
    } catch {
      Alert.alert('Error', 'No se pudieron cargar las listas.');
    } finally {
      setCargando(false);
    }
  };

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
    } catch {
      Alert.alert('Error', 'No se pudo guardar la lista.');
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
            } catch {
              Alert.alert('Error', 'No se pudo eliminar la lista.');
            }
          },
        },
      ],
    );
  };

  const abrirLista = (lista) => {
    setListaActiva(lista);
    navigation.navigate('Elementos', { lista });
  };

  if (cargando)
    return (
      <View style={[s.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size='large' color={colors.primary} />
      </View>
    );

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.saludo}>Hola, {alias} 👋</Text>
          <TouchableOpacity onPress={compartirCodigo} style={s.codigoRow}>
            <Text style={s.codigo}>Código: {pareja?.codigo}</Text>
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
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <Text style={s.empty}>
            No hay listas aún.{'\n'}Crea la primera 👇
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => abrirLista(item)}>
            <Text style={s.cardEmoji}>{item.emoji}</Text>
            <Text style={s.cardNombre}>{item.nombre}</Text>
            <View style={s.cardActions}>
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
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Botón añadir */}
      <TouchableOpacity style={s.fab} onPress={() => abrirModal()}>
        <Text style={s.fabText}>+ Nueva lista</Text>
      </TouchableOpacity>

      {/* Modal crear/editar */}
      <Modal visible={modal} transparent animationType='slide'>
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

const styles = (c) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      paddingTop: 50,
      backgroundColor: c.surface,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    saludo: { fontSize: 18, fontWeight: '700', color: c.text },
    codigoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    codigo: { fontSize: 13, color: c.textMuted },
    compartir: { fontSize: 13 },
    salir: { color: c.danger, fontSize: 14 },
    card: {
      backgroundColor: c.surface,
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.border,
    },
    cardEmoji: { fontSize: 32, marginRight: 14 },
    cardNombre: { flex: 1, fontSize: 18, fontWeight: '600', color: c.text },
    cardActions: { flexDirection: 'row', gap: 8 },
    actionBtn: { padding: 6 },
    actionText: { fontSize: 18 },
    empty: {
      textAlign: 'center',
      color: c.textMuted,
      marginTop: 60,
      fontSize: 16,
      lineHeight: 28,
    },
    fab: {
      margin: 16,
      backgroundColor: c.primary,
      borderRadius: 14,
      padding: 16,
      alignItems: 'center',
    },
    fabText: { color: '#fff', fontSize: 16, fontWeight: '700' },
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
      paddingBottom: 40,
    },
    modalTitulo: {
      fontSize: 20,
      fontWeight: '700',
      color: c.text,
      marginBottom: 16,
    },
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
    emojisGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 4,
    },
    emojiBtn: {
      padding: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
    },
    emojiBtnSel: {
      borderColor: c.primary,
      backgroundColor: c.primaryDark + '33',
    },
    emojiOpt: { fontSize: 24 },
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
    btnSaveText: { color: '#fff', fontWeight: '700' },
  });
