import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from './contexts/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DataStoreProvider } from './contexts/DataStoreContext';
import { debugDataStore } from '../utils/debugTools';
import { DataStoreSyncMonitor } from './components/DataStoreSyncMonitor';
import { View, StyleSheet } from 'react-native';
import { useTheme } from './contexts/ThemeContext';
import '../utils/asyncStorageDebug';

// Type definition for window
declare global {
  interface Window {
    frameworkReady?: () => void;
  }
}

export default function RootLayout() {
  const { colors } = useTheme();

    useEffect(() => {
        window.frameworkReady?.();
    }, []);

    return (
        <ErrorBoundary>
            <ThemeProvider>
                <DataStoreProvider>
                    <View style={[styles.container, { backgroundColor: colors.background }]}>
                        <DataStoreSyncMonitor />
                        <Stack
                            screenOptions={{
                                headerShown: false,
                                animation: 'slide_from_right',
                            }}
                            initialRouteName="(tabs)"
                        >
                            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                            <Stack.Screen name="+not-found" options={{ title: 'Oops!' }} />
                            <Stack.Screen
                                name="device-edit"
                                options={{
                                    title: 'Edit Device',
                                    headerShown: false,
                                }}
                            />
                        </Stack>
                        <StatusBar style="auto" />
                    </View>
                </DataStoreProvider>
            </ThemeProvider>
        </ErrorBoundary>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});