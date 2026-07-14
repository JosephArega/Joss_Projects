import 'react-native-url-polyfill/auto';
import React from 'react';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SettingsProvider } from './src/state/SettingsContext';
import { useI18n } from './src/i18n';
import { colors } from './src/theme';
import HomeMapScreen from './src/screens/HomeMapScreen';
import TipsScreen from './src/screens/TipsScreen';
import RouteScreen from './src/screens/RouteScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.surface,
    primary: colors.amber,
    text: colors.text,
    border: colors.border,
  },
};

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Map: 'map',
  Tips: 'chatbubbles',
  Route: 'navigate',
  Settings: 'settings',
};

function Tabs() {
  const { t } = useI18n();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.amber,
        tabBarInactiveTintColor: colors.textDim,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICONS[route.name]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Map" component={HomeMapScreen} options={{ tabBarLabel: t('tabs.map') }} />
      <Tab.Screen name="Tips" component={TipsScreen} options={{ tabBarLabel: t('tabs.tips') }} />
      <Tab.Screen name="Route" component={RouteScreen} options={{ tabBarLabel: t('tabs.route') }} />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: t('tabs.settings') }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <NavigationContainer theme={navTheme}>
          <StatusBar style="light" />
          <Tabs />
        </NavigationContainer>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
