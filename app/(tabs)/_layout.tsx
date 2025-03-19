// app/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from './contexts/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DeviceProvider } from './contexts/DeviceContext';
import { DataStoreProvider } from './contexts/DataStoreContext';
import { debugDataStore } from '../utils/debugTools';
import { DataStoreSyncMonitor } from './components/DataStoreSyncMonitor';
import { View, StyleSheet } from 'react-native';
import { StandardHeader } from './components/StandardHeader';
import { useTheme } from './contexts/ThemeContext';
import '../utils/asyncStorageDebug';

declare global {
    interface Window {
        frameworkReady?: () => void;
    }
}

export default function RootLayout() {
    const { colors } = useTheme();

    useEffect(() => {
        window.frameworkReady?.();

        // Debug DataStore during app startup
        setTimeout(() => {
            debugDataStore().then(result => {
                console.log('DataStore initialized status:', result ? 'SUCCESS' : 'FAILED');
            });
        }, 2000);
    }, []);

    return (
        <ErrorBoundary>
            <ThemeProvider>
                <DataStoreProvider>
                    <View style={[styles.container, { backgroundColor: colors.background }]}>
                        <DataStoreSyncMonitor />
                        <Stack
                            screenOptions={{
                                // Hide the default header since we're using StandardHeader
                                headerShown: false,

                                // Animation settings
                                animation: 'slide_from_right',

                                // Content style (apply padding to account for header height)
                                contentStyle: {
                                    backgroundColor: colors.background,
                                },
                            }}
                            // Set initialRouteName to the home screen within the tabs group
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
                            <Stack.Screen
                                name="authorized-users-list"
                                options={{
                                    title: 'Authorized Users',
                                    headerShown: false,
                                }}
                            />
                            <Stack.Screen
                                name="step1"
                                options={{
                                    title: 'Step 1',
                                    headerShown: false
                                }}
                            />

                            <Stack.Screen
                                name="step2"
                                options={{
                                    title: 'Step 2',
                                    headerShown: false
                                }}
                            />
                            <Stack.Screen
                                name="step3"
                                options={{
                                    title: 'Step 3',
                                    headerShown: false
                                }}
                            />
                            <Stack.Screen
                                name="step4"
                                options={{
                                    title: 'Step 4',
                                    headerShown: false
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