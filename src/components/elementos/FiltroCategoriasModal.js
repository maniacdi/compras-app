import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useApp } from '../../context/AppContext';
import { useStyles } from '../../hooks/useStyles';
import { estilos } from './estilos';

export default function FiltroCategoriasModal({
  visible,
  onClose,
  categorias,
  seleccion,
  onToggle,
  onLimpiar,
}) {
  const { colors } = useApp();
  const s = useStyles(estilos);

  return (
    <Modal
      visible={visible}
      transparent
      animationType='slide'
      onRequestClose={onClose}
    >
      <View style={s.modalOverlay}>
        <View style={[s.modalBox, { maxHeight: '80%' }]}>
          <View style={s.modalHeaderRow}>
            <Text style={s.modalTitulo}>Filtrar categorías</Text>
            <View
              style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}
            >
              {seleccion.length > 0 && (
                <TouchableOpacity onPress={onLimpiar}>
                  <Text style={s.limpiarFiltro}>Limpiar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose}>
                <Text style={s.cerrarBtn}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView>
            {categorias.map((c) => {
              const activa = seleccion.includes(c.id);
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    s.catRow,
                    activa && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => onToggle(c.id)}
                >
                  <Text style={s.catRowEmoji}>{c.emoji}</Text>
                  <Text
                    style={[
                      s.catRowNombre,
                      activa && { color: '#fff', fontWeight: '800' },
                    ]}
                  >
                    {c.nombre}
                  </Text>
                  {activa && <Text style={{ color: '#fff' }}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity
            style={[s.btnApply, { marginTop: 16 }]}
            onPress={onClose}
          >
            <Text style={s.btnSaveText}>Aplicar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
