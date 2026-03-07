import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { crearPareja, obtenerPareja } from '../api';

export default function BienvenidaScreen() {
  const { colors, guardarSesion } = useApp();
  const [modo, setModo] = useState(null); // 'crear' | 'unirse'
  const [alias, setAlias] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [cargando, setCargando] = useState(false);

  const s = styles(colors);

  const handleCrear = async () => {
    console.log('Intentando crear pareja...');
    if (!alias.trim())
      return Alert.alert(
        'Falta tu nombre',
        'Escribe cómo quieres que te identifiquen.',
      );
    setCargando(true);
    try {
      const res = await crearPareja(nombre || 'Mi Lista');
      await guardarSesion(res.pareja, alias.trim());
    } catch (e) {
      console.log('Error:', e.message, e.response?.data);

      Alert.alert(
        'Error',
        'No se pudo crear la pareja. Comprueba tu conexión.',
      );
    } finally {
      setCargando(false);
    }
  };

  const handleUnirse = async () => {
    if (!alias.trim())
      return Alert.alert(
        'Falta tu nombre',
        'Escribe cómo quieres que te identifiquen.',
      );
    if (!codigo.trim())
      return Alert.alert(
        'Falta el código',
        'Escribe el código que te pasó tu pareja.',
      );
    setCargando(true);
    try {
      const res = await obtenerPareja(codigo.trim().toUpperCase());
      await guardarSesion(res.pareja, alias.trim());
    } catch (e) {
      Alert.alert(
        'Código incorrecto',
        'No se encontró ninguna pareja con ese código.',
      );
    } finally {
      setCargando(false);
    }
  };

  if (!modo) {
    return (
      <View style={s.container}>
        <Text style={s.emoji}>🛒</Text>
        <Text style={s.titulo}>Compras</Text>
        <Text style={s.sub}>La lista de compra de tu pareja</Text>
        <TouchableOpacity style={s.btnPrimary} onPress={() => setModo('crear')}>
          <Text style={s.btnPrimaryText}>Crear lista nueva</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.btnSecondary}
          onPress={() => setModo('unirse')}
        >
          <Text style={s.btnSecondaryText}>Unirme con código</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={s.form}>
        <TouchableOpacity onPress={() => setModo(null)} style={s.back}>
          <Text style={s.backText}>← Atrás</Text>
        </TouchableOpacity>

        <Text style={s.titulo}>
          {modo === 'crear' ? 'Nueva lista' : 'Unirme'}
        </Text>

        <Text style={s.label}>Tu nombre</Text>
        <TextInput
          style={s.input}
          placeholder='Ej: Javi'
          placeholderTextColor={colors.textMuted}
          value={alias}
          onChangeText={setAlias}
          maxLength={20}
        />

        {modo === 'crear' && (
          <>
            <Text style={s.label}>Nombre de la pareja (opcional)</Text>
            <TextInput
              style={s.input}
              placeholder='Ej: Javi y Alba'
              placeholderTextColor={colors.textMuted}
              value={nombre}
              onChangeText={setNombre}
              maxLength={30}
            />
          </>
        )}

        {modo === 'unirse' && (
          <>
            <Text style={s.label}>Código de tu pareja</Text>
            <TextInput
              style={[s.input, s.inputCodigo]}
              placeholder='Ej: ABC123'
              placeholderTextColor={colors.textMuted}
              value={codigo}
              onChangeText={(t) => setCodigo(t.toUpperCase())}
              maxLength={6}
              autoCapitalize='characters'
            />
          </>
        )}

        <TouchableOpacity
          style={[s.btnPrimary, cargando && s.btnDisabled]}
          onPress={modo === 'crear' ? handleCrear : handleUnirse}
          disabled={cargando}
        >
          {cargando ? (
            <ActivityIndicator color='#fff' />
          ) : (
            <Text style={s.btnPrimaryText}>
              {modo === 'crear' ? 'Crear' : 'Unirme'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (c) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.bg,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    form: { width: '100%', paddingTop: 60 },
    emoji: { fontSize: 64, marginBottom: 16 },
    titulo: {
      fontSize: 32,
      fontWeight: '700',
      color: c.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    sub: {
      fontSize: 16,
      color: c.textSub,
      marginBottom: 48,
      textAlign: 'center',
    },
    label: { fontSize: 14, color: c.textSub, marginBottom: 6, marginTop: 16 },
    input: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
      color: c.text,
    },
    inputCodigo: {
      fontSize: 24,
      fontWeight: '700',
      textAlign: 'center',
      letterSpacing: 6,
    },
    btnPrimary: {
      backgroundColor: c.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 24,
    },
    btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    btnSecondary: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 12,
    },
    btnSecondaryText: { color: c.text, fontSize: 16 },
    btnDisabled: { opacity: 0.6 },
    back: { marginBottom: 24 },
    backText: { color: c.primary, fontSize: 16 },
  });
