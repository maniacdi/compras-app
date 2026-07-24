import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function ScannerModal({ visible, onClose, onCodigo, colors }) {
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [manual, setManual] = useState(false);
  const [ean, setEan] = useState('');
  const [escaneado, setEscaneado] = useState(false);
  const s = styles(colors);

  useEffect(() => {
    if (visible) {
      setEscaneado(false);
      setManual(false);
      setEan('');
    }
  }, [visible]);

  const handleScan = ({ data }) => {
    if (escaneado) return;
    setEscaneado(true);
    onCodigo(data);
  };

  const handleManual = () => {
    if (!ean.trim()) return;
    onCodigo(ean.trim());
  };

  const permisoConcedido = permiso?.granted;

  return (
    <Modal visible={visible} animationType='slide' onRequestClose={onClose}>
      <View style={s.container}>
        <View style={s.headerRow}>
          <Text style={s.titulo}>ESCANEAR</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={s.cerrar}>✕</Text>
          </TouchableOpacity>
        </View>

        {manual ? (
          <View style={s.manualBox}>
            <Text style={s.label}>CÓDIGO EAN</Text>
            <TextInput
              style={s.input}
              value={ean}
              onChangeText={setEan}
              keyboardType='numeric'
              placeholder='Ej: 3017620422003'
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            <TouchableOpacity style={s.btn} onPress={handleManual}>
              <Text style={s.btnText}>BUSCAR</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setManual(false)}>
              <Text style={s.linkText}>← USAR CÁMARA</Text>
            </TouchableOpacity>
          </View>
        ) : !permisoConcedido ? (
          <View style={s.manualBox}>
            <Text style={s.aviso}>
              Se necesita permiso de cámara para escanear.
            </Text>
            <TouchableOpacity style={s.btn} onPress={pedirPermiso}>
              <Text style={s.btnText}>DAR PERMISO</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setManual(true)}>
              <Text style={s.linkText}>ESCRIBIR NÚMERO</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <CameraView
              style={s.camera}
              barcodeScannerSettings={{
                barcodeTypes: ['ean13', 'ean8', 'upc_a'],
              }}
              onBarcodeScanned={handleScan}
            />
            <TouchableOpacity
              style={s.manualLink}
              onPress={() => setManual(true)}
            >
              <Text style={s.btnText}>ESCRIBIR NÚMERO</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = (c) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      paddingTop: 52,
      borderBottomWidth: 2,
      borderColor: c.border,
    },
    titulo: { fontSize: 20, fontWeight: '800', letterSpacing: 1, color: c.text },
    cerrar: { fontSize: 18, color: c.textMuted },
    camera: { flex: 1 },
    manualLink: {
      padding: 16,
      alignItems: 'center',
      borderTopWidth: 2,
      borderColor: c.border,
      backgroundColor: c.primary,
    },
    manualBox: { padding: 24, gap: 16 },
    label: {
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 1,
      color: c.textSub,
    },
    aviso: { fontSize: 16, color: c.text, textAlign: 'center' },
    input: {
      backgroundColor: c.surfaceAlt,
      borderWidth: 2,
      borderColor: c.border,
      borderRadius: 0,
      padding: 14,
      fontSize: 18,
      color: c.text,
    },
    btn: {
      backgroundColor: c.primary,
      borderRadius: 0,
      padding: 16,
      alignItems: 'center',
    },
    btnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 1 },
    linkText: {
      color: c.text,
      fontSize: 14,
      fontWeight: '800',
      letterSpacing: 1,
      textAlign: 'center',
    },
  });
