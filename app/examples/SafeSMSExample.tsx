import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Alert } from 'react-native';
import { Button } from '../components/Button';
import { formatSMSCommand, sendSMSCommand } from '../utils/smsUtils';
import { useDataStore } from '../contexts/DataStoreContext'; // Use consolidated context
import { colors, spacing } from '../styles/theme';

const SafeSMSExample = () => {
const [isLoading, setIsLoading] = useState(false);
const { store } = useDataStore(); // Access store through useDataStore

// Get the active device from the store
const activeDevice = store.devices.find(d => d.id === store.globalSettings.activeDeviceId);

const handleSMSCommand = async (commandType: 'OPEN' | 'CLOSE' | 'STATUS') => {
    if (!activeDevice) {
    Alert.alert('No Active Device', 'Please select an active device in settings.');
    return;
    }

    const command = formatSMSCommand(activeDevice.password, commandType);

    const success = await sendSMSCommand({
        phoneNumber: activeDevice.unitNumber,
        command,
        deviceId: activeDevice.id,
        setLoading: setIsLoading
    });

    if (!success) {
        Alert.alert('Error', 'Failed to send SMS. Please try again.');
    }
};

return (
    <View style={styles.container}>
    <Text style={styles.title}>
        Control Device: {activeDevice ? activeDevice.name : 'No device selected'}
    </Text>

    <View style={styles.buttonGroup}>
        <Button
        title="Open Gate"
        onPress={() => handleSMSCommand('OPEN')}
        loading={isLoading}
        disabled={!activeDevice}
        icon="lock-open-outline"
        style={styles.button}
        />

        <Button
        title="Close Gate"
        onPress={() => handleSMSCommand('CLOSE')}
        loading={isLoading}
        disabled={!activeDevice}
        icon="lock-closed-outline"
        style={styles.button}
        />

        <Button
        title="Check Status"
        onPress={() => handleSMSCommand('STATUS')}
        loading={isLoading}
        disabled={!activeDevice}
        variant="secondary"
        icon="information-circle-outline"
        style={styles.button}
        />
    </View>
    </View>
);
};
const styles = StyleSheet.create({
container: {
    padding: spacing.md,
},
title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.md,
    color: colors.text.primary,
},
buttonGroup: {
    flexDirection: 'column',
    gap: spacing.sm,
},
button: {
    marginVertical: spacing.xs,
},
});
export default SafeSMSExample;