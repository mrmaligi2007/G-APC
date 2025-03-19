// app/(tabs)/_layout.tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/theme';

function TabBarIcon(props: {
    name: React.ComponentProps<typeof Ionicons>['name'];
    color: string;
    size: number;
}) {
    return <Ionicons {...props} />;
}

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.text.disabled,
                tabBarStyle: {
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                    backgroundColor: 'white',
                    height: 60,
                    paddingBottom: 5,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '500',
                },
                headerShown: false,
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, size }) => (
                        <TabBarIcon name="home-outline" color={color} size={size} />
                    ),
                }}
            />
            <Tabs.Screen
                name="setup"
                options={{
                    title: 'Setup',
                    tabBarIcon: ({ color, size }) => (
                        <TabBarIcon name="construct-outline" color={color} size={size} />
                    ),
                }}
            />
            <Tabs.Screen
                name="logs"
                options={{
                    title: 'Logs',
                    tabBarIcon: ({ color, size }) => (
                        <TabBarIcon name="list-outline" color={color} size={size} />
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarIcon: ({ color, size }) => (
                        <TabBarIcon name="settings-outline" color={color} size={size} />
                    ),
                }}
            />
        </Tabs>
    );
}