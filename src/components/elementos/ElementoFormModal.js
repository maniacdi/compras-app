import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { buscarProducto } from '../../api';
import { getCategoriaInfo, UNIDADES } from '../../constants';
import { useApp } from '../../context/AppContext';
import { useStyles } from '../../hooks/useStyles';
import IconPicker from '../IconPicker';
import ScannerModal from '../ScannerModal';
import CategoriaSelector from './CategoriaSelector';
import { estilos } from './estilos';

// `elemento` null = crear. onGuardar(datos) devuelve true si se cerró bien.
export default function ElementoFormModal({
  visible,
  elemento,
  onClose,
  onGuardar,
}) {
  const { colors } = useApp();
  const s = useStyles(estilos);

  const [nombre, setNombre] = useState('');
  const [emoji, setEmoji] = useState('🛍️');
  const [categoria, setCategoria] = useState('otros');
  const [cantidad, setCantidad] = useState('1');
  const [unidad, setUnidad] = useState('ud');
  const [notas, setNotas] = useState('');
  const [scannerVisible, setScannerVisible] = useState(false);
  const [buscandoOFF, setBuscandoOFF] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setNombre(elemento?.nombre || '');
    setCategoria(elemento?.categoria || 'otros');
    setEmoji(
      elemento?.emoji || getCategoriaInfo(elemento?.categoria || 'otros').emoji,
    );
    setCantidad(String(elemento?.cantidad || '1'));
    setUnidad(elemento?.unidad || 'ud');
    setNotas(elemento?.notas || '');
  }, [visible, elemento]);

  const handleCodigo = async (ean) => {
    setScannerVisible(false);
    setBuscandoOFF(true);
    try {
      const res = await buscarProducto(ean);
      if (res.encontrado) {
        if (res.nombre) setNombre(res.nombre);
        if (res.marca) setNotas((prev) => (prev.trim() ? prev : res.marca));
      } else {
        Alert.alert(
          'No encontrado',
          'No hay datos de ese producto. Complétalo a mano.',
        );
      }
    } finally {
      setBuscandoOFF(false);
    }
  };

  const guardar = () => {
    if (!nombre.trim()) return Alert.alert('Falta el nombre');
    onGuardar({
      nombre: nombre.trim(),
      emoji,
      categoria,
      cantidad: parseFloat(cantidad) || 1,
      unidad,
      notas: notas.trim(),
    });
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType='slide'
        onRequestClose={onClose}
      >
        <View style={s.modalOverlay}>
          <ScrollView style={s.modalBox} keyboardShouldPersistTaps='handled'>
            <View style={s.modalHeaderRow}>
              <Text style={s.modalTitulo}>
                {elemento ? 'Editar elemento' : 'Añadir elemento'}
              </Text>
              <View
                style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}
              >
                <TouchableOpacity onPress={() => setScannerVisible(true)}>
                  <Text style={{ fontSize: 22 }}>📷</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onClose}>
                  <Text style={s.cerrarBtn}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={s.label}>Nombre</Text>
            <TextInput
              style={s.input}
              placeholder='Ej: Leche'
              placeholderTextColor={colors.textMuted}
              value={nombre}
              onChangeText={setNombre}
              autoFocus
            />
            {buscandoOFF && (
              <Text style={{ color: colors.textMuted, marginTop: 6 }}>
                Buscando producto…
              </Text>
            )}

            <Text style={s.label}>Icono</Text>
            <IconPicker
              value={emoji}
              onChange={setEmoji}
              categoriaEmoji={getCategoriaInfo(categoria).emoji}
              colors={colors}
            />

            <Text style={s.label}>Categoría</Text>
            <CategoriaSelector value={categoria} onChange={setCategoria} />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Cantidad</Text>
                <TextInput
                  style={s.input}
                  value={cantidad}
                  onChangeText={setCantidad}
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
                          unidad === u && s.filterChipActive,
                        ]}
                        onPress={() => setUnidad(u)}
                      >
                        <Text
                          style={[
                            s.filterChipText,
                            unidad === u && s.filterChipTextActive,
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
              placeholder='Ej: sin lactosa, marca Hacendado...'
              placeholderTextColor={colors.textMuted}
              value={notas}
              onChangeText={setNotas}
              multiline
            />

            <View style={s.modalBtns}>
              <TouchableOpacity style={s.btnCancel} onPress={onClose}>
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

      <ScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onCodigo={handleCodigo}
        colors={colors}
      />
    </>
  );
}
