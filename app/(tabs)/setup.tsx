// app/(tabs)/setup.tsx (as a layout file)
import React from 'react';
import { Stack } from 'expo-router';
//import { StandardHeader } from '../components/StandardHeader'; //No longer needed, individual screens add their header

export default function SetupLayout() {
  return (
    <Stack>
      <Stack.Screen name="step1" options={{ headerShown: false }} />
      <Stack.Screen name="step2" options={{ headerShown: false }} />
      <Stack.Screen name="step3" options={{ headerShown: false }} />
      <Stack.Screen name="step4" options={{ headerShown: false }} />
       <Stack.Screen name="authorized-users-list" options={{ headerShown: false }} />
    </Stack>
  );
}