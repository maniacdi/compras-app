import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppProvider, useApp } from './src/context/AppContext';
import BienvenidaScreen from './src/screens/BienvenidaScreen';
import ListasScreen from './src/screens/ListasScreen';
import ElementosScreen from './src/screens/ElementosScreen';
import Toast from './src/components/Toast';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { pareja, colors, scheme, hidratando } = useApp();
  const theme = scheme === 'dark' ? DarkTheme : DefaultTheme;

  const navTheme = {
    ...theme,
    colors: {
      ...theme.colors,
      background: colors.bg,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  };

  // Leyendo la sesión guardada: evita el flash de Bienvenida.
  if (hidratando) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size='large' color={colors.primary} />
      </View>
    );
  }

  if (!pareja) {
    return (
      <NavigationContainer theme={navTheme}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name='Bienvenida' component={BienvenidaScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.surface,
            borderBottomWidth: 2,
            borderBottomColor: colors.border,
          },
          headerShadowVisible: false,
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '800', letterSpacing: 0.5 },
        }}
      >
        <Stack.Screen
          name='Listas'
          component={ListasScreen}
          options={{ title: '🛒 Mis Listas', headerLeft: null }}
        />
        <Stack.Screen
          name='Elementos'
          component={ElementosScreen}
          options={({ route }) => ({
            title: `${route.params?.lista?.emoji} ${route.params?.lista?.nombre}`,
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <AppNavigator />
          <Toast />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
