import { useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { getCategoriaInfo } from '../../constants';
import { useStyles } from '../../hooks/useStyles';
import { estilos } from './estilos';
import SwipeableItem from './SwipeableItem';

export default function SeccionCategoria({
  cat,
  items,
  onToggle,
  onEdit,
  onEliminar,
  forzarAbierta = false,
  grande = false,
}) {
  const s = useStyles(estilos);
  const catInfo = getCategoriaInfo(cat);
  const necesarios = items.filter((e) => e.necesario).length;
  const [collapsed, setCollapsed] = useState(necesarios === 0);

  // Auto-colapso: se cierra al quedarse sin pendientes y se abre al tener alguno.
  const previos = useRef(necesarios);
  useEffect(() => {
    if (previos.current > 0 && necesarios === 0) setCollapsed(true);
    if (previos.current === 0 && necesarios > 0) setCollapsed(false);
    previos.current = necesarios;
  }, [necesarios]);

  const isCollapsed = forzarAbierta ? false : collapsed;

  return (
    <View style={s.seccion}>
      <TouchableOpacity
        style={s.seccionHeader}
        onPress={() => setCollapsed(!collapsed)}
        disabled={forzarAbierta}
      >
        <Text style={s.seccionEmoji}>{catInfo.emoji}</Text>
        <Text style={s.seccionNombre}>{catInfo.nombre}</Text>
        <Text
          style={[
            s.seccionContador,
            necesarios === 0 && s.seccionContadorVacio,
          ]}
        >
          {grande ? necesarios : `${necesarios}/${items.length}`}
        </Text>
        {!forzarAbierta && (
          <Text style={s.seccionArrow}>{isCollapsed ? '▶' : '▼'}</Text>
        )}
      </TouchableOpacity>
      {!isCollapsed &&
        items.map((el) => (
          <SwipeableItem
            key={el._id}
            el={el}
            onToggle={onToggle}
            onEdit={onEdit}
            onEliminar={onEliminar}
            grande={grande}
          />
        ))}
    </View>
  );
}
