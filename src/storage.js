import AsyncStorage from '@react-native-async-storage/async-storage';

export const CLAVES = {
  codigo: 'pareja_codigo',
  alias: 'alias',
  cola: 'outbox',
  listas: (codigo) => `cache:listas:${codigo}`,
  elementos: (listaId) => `cache:elementos:${listaId}`,
  ordenCats: (listaId) => `ordenCats:${listaId}`,
};

export const leerJSON = async (clave, porDefecto = null) => {
  try {
    const raw = await AsyncStorage.getItem(clave);
    return raw == null ? porDefecto : JSON.parse(raw);
  } catch {
    return porDefecto;
  }
};

export const guardarJSON = async (clave, valor) => {
  try {
    await AsyncStorage.setItem(clave, JSON.stringify(valor));
  } catch {}
};

export const borrarCaches = async () => {
  try {
    const claves = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(
      claves.filter((k) => k.startsWith('cache:')),
    );
  } catch {}
};
