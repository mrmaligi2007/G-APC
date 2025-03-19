// app/devices.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StandardHeader } from './components/StandardHeader';
import { Button } from './components/Button';
import { Card } from './components/Card';
import { colors, spacing, shadows } from './styles/theme';
import { useDataStore } from './contexts/DataStoreContext';
import { Device } from './utils/DataStore';

export default function DevicesPage() {
  const router = useRouter();
  const { store, getDeviceById, setActiveDevice, refreshStore, deleteDevice } = useDataStore();
  const [isLoading, setIsLoading] = useState(true);
  const activeDevice = store.devices.find(d => d.id === store.globalSettings.activeDeviceId);

  const loadDevices = useCallback(async () => {
    setIsLoading(true);
    try {
      await refreshStore();
    } catch (error) {
      console.error('Failed to load devices', error);
      Alert.alert('Error', 'Failed to load devices.');
    } finally {
      setIsLoading(false);
    }
  }, [refreshStore]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const handleSelectDevice = async (deviceId: string) => {
    try {
      await setActiveDevice(deviceId);
      Alert.alert('Success', 'Active device changed successfully');
      await refreshStore();
    } catch (error) {
      console.error('Failed to change active device:', error);
      Alert.alert('Error', 'Failed to change active device');
    }
  };

  const handleEditDevice = (device: Device) => {
    router.push({
      pathname: '/device-edit',
      params: { deviceId: device.id }
    });
  };

const handleDeleteDevice = (device: Device) => {
    Alert.alert(
        'Delete Device',
        `Are you sure you want to delete "${device.name}"? This action cannot be undone.`,
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
        ]
    );
};

  const navigateToAddDevice = () => {
    // Navigate to Step 1 for adding a new device
    router.push('/step1');
  };

  return (
    <View style={styles.container}>
      <StandardHeader title="Manage Devices" showBack
        rightAction={{
            icon: "add",
            onPress: navigateToAddDevice
          }}
        />

      <View style={styles.content}>
        {isLoading ? (
          <Text>Loading devices...</Text>
        ) : (
          <>
            {store.devices.length === 0 ? (
              <Card title="No Devices Found">
                <Text style={styles.emptyText}>
                  You haven't added any devices yet. Add your first device to get started.
                </Text>
                <Button 
                  title="Add Your First Device" 
                  variant="solid" 
                  onPress={navigateToAddDevice} 
                  icon={<Ionicons name="add-circle-outline" size={20} color="white" />}
                />
              </Card>
            ) : (
                <FlatList
                    data={store.devices}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item: device }) => (
                        <Card title={device.name} elevated={device.id === store.globalSettings.activeDeviceId}>
                            <View style={styles.deviceInfo}>
                                <View style={styles.deviceDetails}>
                                    <Text style={styles.deviceType}>{device.type}</Text>
                                    <Text style={styles.devicePhone}>{device.unitNumber}</Text>
                                </View>

                                <View style={styles.deviceActions}>
                                    {device.id === store.globalSettings.activeDeviceId ? (
                                        <View style={[styles.activeIndicator, { backgroundColor: `${colors.success}25` }]}>
                                            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                                            <Text style={[styles.activeText, {color: colors.success}]}>Active</Text>
                                        </View>
                                    ) : (
                                        <Button
                                            title="Set Active"
                                            variant="outline"
                                            onPress={() => handleSelectDevice(device.id)}
                                        />
                                    )}
                                </View>
                            </View>
                            
                            <View style={styles.buttonRow}>
                                <TouchableOpacity style={styles.iconButton} onPress={() => handleEditDevice(device)}>
                                    <Ionicons name="create-outline" size={24} color={colors.primary} />
                                    <Text style={styles.iconButtonText}>Edit</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity style={styles.iconButton} onPress={() => handleDeleteDevice(device)}>
                                    <Ionicons name="trash-outline" size={24} color={colors.error} />
                                    <Text style={[styles.iconButtonText, { color: colors.error }]}>Delete</Text>
                                </TouchableOpacity>
                            </View>
                        </Card>
                    )}
                />
            )}
             <Button
                title="Add Another Device"
                onPress={navigateToAddDevice}
                icon="add-circle-outline"
                fullWidth
              />
          </>
        )}
      </View>
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
    padding: spacing.md,
  },
  deviceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  deviceDetails: {
    flex: 1,
  },
  deviceType: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  devicePhone: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  deviceActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12, // Reduced from borderRadius.full (which might be too large)
    marginRight: 8,
  },
  activeText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
  },
  iconButton: {
    alignItems: 'center',
    padding: spacing.sm,
  },
  iconButtonText: {
    fontSize: 12,
    color: colors.text.primary,
    marginTop: 4,
  },
    emptyText: {
    textAlign: 'center',
    color: colors.text.secondary,
    marginVertical: spacing.md,
  },
  addButton: {
    marginTop: spacing.md,
  },
});