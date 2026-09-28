import { useEffect, useRef, useState } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
  ScrollView,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { getCategoriaInfo } from '../../constants';
import { useStyles } from '../../hooks/useStyles';
import { estilos } from './estilos';

const ALTO = 52;

const aPosiciones = (ids) => Object.fromEntries(ids.map((id, i) => [id, i]));

const desdePosiciones = (pos) =>
  Object.keys(pos).sort((a, b) => pos[a] - pos[b]);

function FilaArrastrable({
  id,
  indiceInicial,
  posiciones,
  total,
  scrollRef,
  onSoltar,
}) {
  const s = useStyles(estilos);
  const info = getCategoriaInfo(id);
  const top = useSharedValue(indiceInicial * ALTO);
  const inicio = useSharedValue(0);
  const activa = useSharedValue(false);

  // Recolocarse cuando otra fila nos desplaza.
  useAnimatedReaction(
    () => posiciones.value[id],
    (pos, prev) => {
      if (pos !== prev && !activa.value) top.value = withTiming(pos * ALTO);
    },
  );

  const pan = Gesture.Pan()
    .blocksExternalGesture(scrollRef)
    .onStart(() => {
      activa.value = true;
      inicio.value = top.value;
    })
    .onUpdate((e) => {
      top.value = inicio.value + e.translationY;
      const destino = Math.max(
        0,
        Math.min(total - 1, Math.round(top.value / ALTO)),
      );
      const actual = posiciones.value[id];
      if (destino !== actual) {
        const nuevas = { ...posiciones.value };
        Object.keys(nuevas).forEach((k) => {
          if (nuevas[k] === destino) nuevas[k] = actual;
        });
        nuevas[id] = destino;
        posiciones.value = nuevas;
      }
    })
    .onFinalize(() => {
      activa.value = false;
      top.value = withTiming(posiciones.value[id] * ALTO);
      scheduleOnRN(onSoltar, posiciones.value);
    });

  const estilo = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0,
    right: 0,
    height: ALTO,
    top: top.value,
    zIndex: activa.value ? 10 : 0,
    opacity: activa.value ? 0.9 : 1,
  }));

  return (
    <Animated.View style={estilo}>
      <View style={[s.ordenRow, { height: ALTO }]}>
        <Text style={s.catRowEmoji}>{info.emoji}</Text>
        <Text style={s.catRowNombre}>{info.nombre}</Text>
        <GestureDetector gesture={pan}>
          <View hitSlop={8}>
            <Text style={s.ordenHandle}>≡</Text>
          </View>
        </GestureDetector>
      </View>
    </Animated.View>
  );
}

// `categorias`: ids presentes en la lista, en su orden actual.
export default function OrdenarCategoriasModal({
  visible,
  categorias,
  onClose,
  onGuardar,
}) {
  const s = useStyles(estilos);
  const posiciones = useSharedValue(aPosiciones(categorias));
  const scrollRef = useRef(null);
  const [ordenado, setOrdenado] = useState(categorias);
  const [apertura, setApertura] = useState(0);

  useEffect(() => {
    if (!visible) return;
    posiciones.value = aPosiciones(categorias);
    setOrdenado(categorias);
    setApertura((n) => n + 1);
  }, [visible, categorias, posiciones]);

  const guardar = () => {
    onGuardar(ordenado);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType='slide'
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { maxHeight: '85%' }]}>
            <View style={s.modalHeaderRow}>
              <Text style={s.modalTitulo}>Ordenar categorías</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={s.cerrarBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={s.ordenAyuda}>
              Arrastra desde ≡ para seguir el recorrido de la tienda.
            </Text>
            <ScrollView ref={scrollRef}>
              {visible && (
                <View style={{ height: categorias.length * ALTO }}>
                  {categorias.map((id, i) => (
                    <FilaArrastrable
                      key={`${apertura}-${id}`}
                      id={id}
                      indiceInicial={i}
                      posiciones={posiciones}
                      total={categorias.length}
                      scrollRef={scrollRef}
                      onSoltar={(pos) => setOrdenado(desdePosiciones(pos))}
                    />
                  ))}
                </View>
              )}
            </ScrollView>
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.btnCancel} onPress={onClose}>
                <Text style={s.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnSave} onPress={guardar}>
                <Text style={s.btnSaveText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
