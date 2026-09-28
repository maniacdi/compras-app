import { memo, useRef } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useStyles } from '../../hooks/useStyles';
import { estilosItem } from './estilos';

function SwipeableItem({ el, onToggle, onEdit, onEliminar, grande = false }) {
  const s = useStyles(estilosItem);
  const swipeRef = useRef(null);
  const tachado = !el.necesario && s.itemNombreChecked;

  const renderAcciones = () => (
    <TouchableOpacity
      style={s.swipeAccion}
      onPress={() => {
        swipeRef.current?.close();
        onEliminar(el);
      }}
    >
      <Text style={s.swipeAccionText}>🗑️</Text>
    </TouchableOpacity>
  );

  return (
    <ReanimatedSwipeable
      ref={swipeRef}
      enabled={!grande}
      friction={1.5}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={renderAcciones}
    >
      <View style={[s.item, !el.necesario && s.itemChecked]}>
        <TouchableOpacity
          style={[s.itemMain, grande && s.itemMainGrande]}
          onPress={() => {
            swipeRef.current?.close();
            onToggle(el);
          }}
          onLongPress={grande ? undefined : () => onEdit(el)}
          activeOpacity={0.7}
        >
          <Text style={[s.itemEmoji, grande && s.itemEmojiGrande]}>
            {el.emoji}
          </Text>
          <View style={s.itemInfo}>
            <Text style={[s.itemNombre, grande && s.itemNombreGrande, tachado]}>
              {el.nombre}
            </Text>
            {el.notas ? <Text style={s.itemNotas}>{el.notas}</Text> : null}
          </View>
          <View style={s.itemRight}>
            <Text
              style={[s.itemCantidad, grande && s.itemCantidadGrande, tachado]}
            >
              {el.cantidad} {el.unidad}
            </Text>
            {el.creadoPor && !grande ? (
              <Text style={s.itemAutor}>{el.creadoPor}</Text>
            ) : null}
          </View>
          {!el.necesario && <Text style={s.checkmark}>✓</Text>}
        </TouchableOpacity>
      </View>
    </ReanimatedSwipeable>
  );
}

export default memo(SwipeableItem);
