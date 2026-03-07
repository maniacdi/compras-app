import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';

import { AppProvider, useApp } from './src/context/AppContext';
import BienvenidaScreen from './src/screens/BienvenidaScreen';
import ListasScreen from './src/screens/ListasScreen';
import ElementosScreen from './src/screens/ElementosScreen';

const Stack = createStackNavigator();

function AppNavigator() {
  const { pareja, colors, scheme } = useApp();
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
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
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
    <AppProvider>
      <AppNavigator />
    </AppProvider>
  );
}
