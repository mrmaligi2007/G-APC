// app/components/DeviceInfo.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext'; // Import

interface DeviceInfoProps {
  unitNumber: string;
}

export default function DeviceInfo({ unitNumber }: DeviceInfoProps) {
    const { colors } = useTheme();
  if (!unitNumber) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.text, {color: colors.text.primary}]}>
        <Text style={[styles.label, { color: colors.text.secondary }]}>Unit Telephone Number: </Text>
        {unitNumber}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 16,
  },
  text: {
    fontSize: 18,
    marginBottom: 4,
  },
  label: {
    fontWeight: '600',
  },
});