import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StandardHeader } from './components/StandardHeader';
import { Button } from './components/Button';
import { Card } from './components/Card';
import { TextInputField } from './components/TextInputField';
import { colors, spacing, borderRadius } from './styles/theme';
import { useDataStore } from './contexts/DataStoreContext';
import { Device } from './utils/DataStore';

export default function EditDevicePage() {
    const router = useRouter();
    const { deviceId } = useLocalSearchParams(); // Get deviceId from params
    const [device, setDevice] = useState<Device | null>(null);
    const [deviceName, setDeviceName] = useState('');
    const [unitNumber, setUnitNumber] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const { getDeviceById, updateDevice, deleteDevice, refreshStore } = useDataStore();

    // Load device data when deviceId changes
    const loadDevice = useCallback(async () => {
        setIsLoading(true);
        try {
            if (typeof deviceId === 'string') {
                const foundDevice = getDeviceById(deviceId);
                if (foundDevice) {
                    setDevice(foundDevice);
                    setDeviceName(foundDevice.name);
                    setUnitNumber(foundDevice.unitNumber);
                } else {
                    Alert.alert('Error', 'Device not found');
                    router.back(); // Go back if device not found
                }
            }
        } catch (error) {
            console.error('Failed to load device:', error);
            Alert.alert('Error', 'Failed to load device information');
        } finally {
            setIsLoading(false);
        }
    }, [deviceId, getDeviceById, router]);

    useEffect(() => {
        loadDevice();
    }, [loadDevice]);

    const validateForm = () => {
        if (!deviceName.trim()) {
            Alert.alert('Error', 'Please enter a name for your device');
            return false;
        }

        if (!unitNumber.trim()) {
            Alert.alert('Error', 'Please enter the device phone number');
            return false;
        }

        return true;
    };

    const handleSaveDevice = async () => {
        if (!validateForm() || !device) return;

        setIsSaving(true);

        try {
            const updatedDevice = await updateDevice(device.id, {
                name: deviceName,
                unitNumber,
            });
            if (updatedDevice) {
                await refreshStore();
                Alert.alert('Success', 'Device updated successfully', [
                    { text: 'OK', onPress: () => router.back() }
                ]);
            }
        } catch (error) {
            console.error('Failed to update device:', error);
            Alert.alert('Error', 'Failed to update device. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteDevice = async () => {
    if (!device) return;
  
    Alert.alert(
      'Delete Device',
      `Are you sure you want to delete "${device.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              const success = await deleteDevice(device.id);
              if (success) {
                await refreshStore();
                Alert.alert('Success', 'Device deleted successfully');
                router.replace('/devices'); // Navigate to devices list
              } else {
                Alert.alert('Error', 'Failed to delete device');
              }
            } catch (error) {
              console.error('Failed to delete device:', error);
              Alert.alert('Error', 'Failed to delete device. Please try again.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
    );
  };


  if (isLoading) {
    return (
      <View style={styles.container}>
        <StandardHeader title="Edit Device" showBack />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text>Loading device information...</Text>
        </View>
      </View>
    );
  }

    return (
        <View style={styles.container}>
            <StandardHeader title="Edit Device" showBack />

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                <Card title={`Edit ${device?.type || 'Device'}`} elevated>
                    <TextInputField
                        label="Device Name"
                        value={deviceName}
                        onChangeText={setDeviceName}
                        placeholder="Enter a name (e.g., Home Gate, Office Door)"
                        containerStyle={styles.inputContainer}
                        editable={!isLoading}
                    />

                    <TextInputField
                        label="Device Phone Number"
                        value={unitNumber}
                        onChangeText={setUnitNumber}
                        placeholder="Enter phone number"
                        keyboardType="phone-pad"
                        autoComplete="tel"
                        containerStyle={styles.inputContainer}
                        editable={!isLoading}
                    />
                </Card>

                <View style={styles.buttonsContainer}>
                    <Button
                        title="Save Changes"
                        onPress={handleSaveDevice}
                        loading={isSaving}
                        style={styles.saveButton}
                        fullWidth
                    />

                    <Button
                        title="Delete Device"
                        onPress={handleDeleteDevice}
                        variant="secondary"
                        icon="trash-outline"
                        style={styles.deleteButton}
                        fullWidth
                    />
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: spacing.md,
    },
    inputContainer: {
        marginBottom: spacing.md,
    },
    buttonsContainer: {
        marginTop: spacing.md,
    },
    saveButton: {
        marginBottom: spacing.md,
    },
    deleteButton: {
        backgroundColor: `${colors.error}15`,
        borderColor: colors.error,
    },
     loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});