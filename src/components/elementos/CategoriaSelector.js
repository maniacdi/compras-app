import { useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { CATEGORIAS, getCategoriaInfo } from '../../constants';
import { useApp } from '../../context/AppContext';
import { useStyles } from '../../hooks/useStyles';
import { estilos } from './estilos';

export default function CategoriaSelector({ value, onChange }) {
  const { colors } = useApp();
  const s = useStyles(estilos);
  const [open, setOpen] = useState(false);
  const selected = getCategoriaInfo(value);

  return (
    <>
      <TouchableOpacity style={s.dropdown} onPress={() => setOpen(true)}>
        <Text style={s.dropdownText}>
          {selected.emoji} {selected.nombre}
        </Text>
        <Text style={s.dropdownArrow}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType='slide'
        onRequestClose={() => setOpen(false)}
      >
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { maxHeight: '80%' }]}>
            <View style={s.modalHeaderRow}>
              <Text style={s.modalTitulo}>Categoría</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Text style={s.cerrarBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {CATEGORIAS.map((c) => {
                const activa = c.id === value;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      s.catRow,
                      activa && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => {
                      onChange(c.id);
                      setOpen(false);
                    }}
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
          </View>
        </View>
      </Modal>
    </>
  );
}
