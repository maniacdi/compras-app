import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { EMOJI_SECCIONES } from '../constants/emojis';

const COLS = 8;

// Aplana secciones a filas: cabecera o fila de emojis.
function construirFilas() {
  const filas = [];
  EMOJI_SECCIONES.forEach((sec) => {
    filas.push({ tipo: 'header', key: `h-${sec.titulo}`, titulo: sec.titulo });
    for (let i = 0; i < sec.emojis.length; i += COLS) {
      filas.push({
        tipo: 'fila',
        key: `${sec.titulo}-${i}`,
        emojis: sec.emojis.slice(i, i + COLS),
      });
    }
  });
  return filas;
}

const FILAS = construirFilas();

export default function IconPicker({ value, onChange, colors, categoriaEmoji }) {
  const [open, setOpen] = useState(false);
  const s = styles(colors);

  const elegir = (e) => {
    onChange(e);
    setOpen(false);
  };

  return (
    <>
      <TouchableOpacity style={s.trigger} onPress={() => setOpen(true)}>
        <Text style={s.triggerEmoji}>{value}</Text>
        <Text style={s.triggerLabel}>CAMBIAR ICONO</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType='slide'>
        <View style={s.overlay}>
          <View style={s.box}>
            <View style={s.headerRow}>
              <Text style={s.titulo}>ICONO</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Text style={s.cerrar}>✕</Text>
              </TouchableOpacity>
            </View>

            {categoriaEmoji ? (
              <View style={s.sugeridoRow}>
                <Text style={s.sugeridoLabel}>CATEGORÍA</Text>
                <TouchableOpacity
                  style={s.sugeridoBtn}
                  onPress={() => elegir(categoriaEmoji)}
                >
                  <Text style={s.sugeridoEmoji}>{categoriaEmoji}</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <FlatList
              data={FILAS}
              keyExtractor={(it) => it.key}
              initialNumToRender={12}
              maxToRenderPerBatch={12}
              windowSize={10}
              removeClippedSubviews
              renderItem={({ item }) =>
                item.tipo === 'header' ? (
                  <Text style={s.seccion}>{item.titulo}</Text>
                ) : (
                  <View style={s.fila}>
                    {item.emojis.map((e) => (
                      <TouchableOpacity
                        key={e}
                        style={[s.celda, e === value && s.celdaSel]}
                        onPress={() => elegir(e)}
                      >
                        <Text style={s.celdaEmoji}>{e}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )
              }
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = (c) =>
  StyleSheet.create({
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 2,
      borderColor: c.border,
      borderRadius: 0,
      padding: 12,
      backgroundColor: c.surfaceAlt,
    },
    triggerEmoji: { fontSize: 28 },
    triggerLabel: {
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 1,
      color: c.textSub,
    },
    overlay: {
      flex: 1,
      backgroundColor: '#00000088',
      justifyContent: 'flex-end',
    },
    box: {
      backgroundColor: c.surface,
      borderTopWidth: 2,
      borderColor: c.border,
      padding: 16,
      height: '80%',
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    titulo: { fontSize: 20, fontWeight: '800', letterSpacing: 1, color: c.text },
    cerrar: { fontSize: 18, color: c.textMuted, paddingHorizontal: 4 },
    sugeridoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12,
    },
    sugeridoLabel: {
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1,
      color: c.textMuted,
    },
    sugeridoBtn: { borderWidth: 2, borderColor: c.primary, padding: 8 },
    sugeridoEmoji: { fontSize: 26 },
    seccion: {
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1,
      color: c.textMuted,
      marginTop: 12,
      marginBottom: 6,
      textTransform: 'uppercase',
    },
    fila: { flexDirection: 'row' },
    celda: {
      flex: 1,
      aspectRatio: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    celdaSel: { backgroundColor: c.primary },
    celdaEmoji: { fontSize: 26 },
  });
