import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StandardHeader } from './components/StandardHeader';
import { Card } from './components/Card';
import { Button } from './components/Button';
import { TextInputField } from './components/TextInputField';
import { colors, spacing, borderRadius } from './styles/theme';
import { useDataStore } from './contexts/DataStoreContext';
import { formatSMSCommand, sendSMSCommand } from '../utils/smsUtils'; // Import sms functions
import { Device } from './utils/DataStore'; // Use the unified Device type
import { useStepCompletion } from './hooks/useStepCompletion';

export default function Step4Page() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { store, getDeviceById, updateDevice, addDeviceLog, logSMSOperation } = useDataStore();
    const [device, setDevice] = useState<Device | null>(null);
    const [unitNumber, setUnitNumber] = useState('');
    const [password, setPassword] = useState('');
    const [deviceId, setDeviceId] = useState<string | undefined>(undefined);
    const [relaySettings, setRelaySettings] = useState({
        accessControl: 'AUT',  // AUT (only authorized) or ALL (anyone can control)
        latchTime: '000',      // Relay latch time in seconds (000-999)
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isDataLoading, setIsDataLoading] = useState(true); // Separate loading for initial data load
    const {isCompleted, markStepCompleted } = useStepCompletion({stepKey: 'step4'});

    // Load device data based on params or active device
    const loadDeviceData = useCallback(async () => {
        if (!params.deviceId) return;
            const id = String(params.deviceId)
        setIsDataLoading(true);
        try {
            const foundDevice = getDeviceById(id);
            if (foundDevice) {
                setDevice(foundDevice);
                setDeviceId(foundDevice.id);
                setUnitNumber(foundDevice.unitNumber);
                setPassword(foundDevice.password);
              if (foundDevice.relaySettings) {
                setRelaySettings(foundDevice.relaySettings);
                }
            }
        } catch (error) {
            console.error('Failed to load device data:', error);
            Alert.alert('Error', 'Failed to load device data. Please try again.');
        } finally {
            setIsDataLoading(false);
        }
    }, [params.deviceId, getDeviceById]);

    useEffect(() => {
        loadDeviceData();
    }, [loadDeviceData]);

    const saveSettings = async () => {
        if (!deviceId) {
        Alert.alert('Error', 'No device selected.');
        return;
      }
        setIsLoading(true);

        try {
          // Update device with new relay settings
          const updatedDevice = await updateDevice(deviceId, { relaySettings });

          if (updatedDevice) {
              // Mark step as completed
              await updateGlobalSettings({ 
                completedSteps: store.globalSettings.completedSteps.includes('step4') 
                  ? store.globalSettings.completedSteps 
                  : [...store.globalSettings.completedSteps, 'step4']
              });
            // Log the action
              await addDeviceLog(deviceId, 'Relay Settings', 'Updated relay settings', true, 'settings');
              await markStepCompleted();
            Alert.alert('Success', 'Relay settings saved successfully!');
          } else {
            Alert.alert('Error', 'Failed to update device settings');
          }
        } catch (error) {
          console.error('Failed to save relay settings:', error);
          Alert.alert('Error', 'Failed to save relay settings');
        } finally {
          setIsLoading(false);
        }
      };

    // Relay Access Control Settings with disabled state when unitNumber is missing
    const setAccessControl = (type: 'AUT' | 'ALL') => {
        if (!unitNumber) {
            Alert.alert('Error', 'Device phone number is missing. Please configure it in Step 1 first.');
            return;
        }

        // Update local state
        setRelaySettings(prev => ({ ...prev, accessControl: type }));

        // Send command to device, now handled by a centralized utility
        const command = formatSMSCommand(password, 'SET_ACCESS', { accessType: type });
        sendSMS({ deviceId, command });
    };

    // Latch Time Settings with disabled state when unitNumber is missing
    const setLatchTime = async () => {
        if (!unitNumber) {
          Alert.alert('Error', 'Device phone number is missing. Please configure it in Step 1 first.');
          return;
        }
    
        setIsLoading(true);
        const command = formatSMSCommand(password, 'SET_LATCH', { latchTime: relaySettings.latchTime });
    
        const success = await sendSMSCommand({
          phoneNumber: unitNumber,
          command,
          deviceId,
          setLoading,
          errorTitle: "Latch Time Error",
          errorMessage: "Failed to update latch time. Check device connection and try again.",
        });
    
        if (success) {
          await saveSettings();
          Alert.alert('Success', 'Latch time updated successfully!');
        }
    };

    // Handle latch time input
    const handleLatchTimeChange = (text: string) => {
        // Filter non-digits and limit to 3 digits
        const filtered = text.replace(/[^0-9]/g, '').slice(0, 3);
        setRelaySettings(prev => ({ ...prev, latchTime: filtered }));
    };

    if (isDataLoading) {
        return (
          <PageWithHeader title="Relay Settings" showBack backTo="/setup">
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading device settings...</Text>
            </View>
          </PageWithHeader>
        );
    }

    return (
        <PageWithHeader title="Relay Settings" showBack backTo="/setup">
            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                <View style={styles.infoContainer}>
                    <Ionicons name={mapIoniconName("information-circle-outline")} size={24} color={colors.primary} style={styles.infoIcon} />
                    <Text style={styles.infoText}>
                        Configure how your GSM relay operates. These settings control access permissions and relay behavior.
                    </Text>
                </View>

                {/* Display warning if unitNumber is missing */}
                {!unitNumber && (
                  <View style={styles.warningContainer}>
                    <Ionicons name={mapIoniconName("warning-outline")} size={24} color={colors.warning} style={styles.infoIcon} />
                    <Text style={styles.warningText}>
                      Device phone number is missing. Please configure it in Step 1 before changing device settings.
                    </Text>
                    <Button
                      title="Go to Step 1"
                      variant="secondary"
                      onPress={() => router.push('/step1')}
                      style={styles.warningButton}
                      icon={<Ionicons name={mapIoniconName("arrow-back")} size={16} color={colors.primary} />}
                      fullWidth
                    />
                  </View>
                )}

                <Card title="Access Control" elevated>
                    <Text style={styles.sectionDescription}>
                        Choose who can control your GSM relay device
                    </Text>

                    <View style={styles.optionsContainer}>
                        <TouchableOpacity
                            style={[
                                styles.optionButton,
                                relaySettings.accessControl === 'AUT' && styles.optionButtonSelected,
                                !unitNumber && styles.optionButtonDisabled // Add disabled style
                            ]}
                            onPress={() => setAccessControl('AUT')}
                            disabled={!unitNumber} // Disable when unitNumber is missing
                        >
                            <Ionicons
                                name="people"
                                size={24}
                                color={relaySettings.accessControl === 'AUT' ? colors.primary : colors.text.secondary}
                            />
                            <Text style={[
                                styles.optionText,
                                relaySettings.accessControl === 'AUT' && styles.optionTextSelected
                            ]}>
                                Authorized Only
                            </Text>
                            <Text style={styles.optionDescription}>
                                Only authorized phone numbers can control the relay
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.optionButton,
                                relaySettings.accessControl === 'ALL' && styles.optionButtonSelected,
                                !unitNumber && styles.optionButtonDisabled // Add disabled style
                            ]}
                            onPress={() => setAccessControl('ALL')}
                            disabled={!unitNumber} // Disable when unitNumber is missing
                        >
                            <Ionicons
                                name="globe"
                                size={24}
                                color={relaySettings.accessControl === 'ALL' ? colors.primary : colors.text.secondary}
                            />
                            <Text style={[
                                styles.optionText,
                                relaySettings.accessControl === 'ALL' && styles.optionTextSelected
                            ]}>
                                Allow All
                            </Text>
                            <Text style={styles.optionDescription}>
                                Any phone number can control the relay with correct password
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Card>

                <Card title="Relay Timing Settings">
                    <Text style={styles.sectionDescription}>
                        Configure how long the relay stays active
                    </Text>

                    <View style={styles.latchTimeContainer}>
                        <Text style={styles.latchTimeLabel}>Latch Time (in seconds)</Text>
                        <Text style={styles.latchTimeHelp}>
                            Set to 000 for toggle mode (stays on until turned off)
                        </Text>

                        <View style={styles.latchInputRow}>
                            <TextInputField
                                value={relaySettings.latchTime}
                                onChangeText={handleLatchTimeChange}
                                placeholder="Enter time in seconds (000-999)"
                                keyboardType="number-pad"
                                maxLength={3}
                                containerStyle={styles.latchTimeInput}
                                editable={!!unitNumber} // Make editable only when unitNumber exists
                            />

                            <Button
                                title="Set Timing"
                                onPress={setLatchTime}
                                loading={isLoading}
                                disabled={!relaySettings.latchTime || !unitNumber} // Disable when unitNumber is missing
                                style={!unitNumber ? styles.buttonDisabled : undefined} // Add disabled style
                            />
                        </View>
                    </View>
                </Card>

                <Button
                    title="Complete Setup"
                    variant="secondary"
                    onPress={() => router.push('/(tabs)/home')}
                    style={styles.completeButton}
                    icon={<Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                    fullWidth
                />
            </ScrollView>
        </PageWithHeader>
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
        paddingBottom: spacing.xxl,
    },
    infoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${colors.primary}10`,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    infoIcon: {
        marginRight: spacing.sm,
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        color: colors.text.secondary,
        lineHeight: 20,
    },
    sectionDescription: {
        fontSize: 14,
        color: colors.text.secondary,
        marginBottom: spacing.md,
    },
    optionsContainer: {
        flexDirection: 'column',
        gap: spacing.md
    },
    optionButton: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        padding: spacing.md,
    },
    optionButtonSelected: {
        borderColor: colors.primary,
        backgroundColor: `${colors.primary}10`,
    },
    optionText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text.primary,
        marginTop: spacing.xs,
        marginBottom: spacing.xs / 2,
    },
    optionTextSelected: {
        color: colors.primary,
    },
    optionDescription: {
        fontSize: 14,
        color: colors.text.secondary,
    },
    latchTimeContainer: {
        marginVertical: spacing.xs,
    },
    latchTimeLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.text.primary,
        marginBottom: spacing.xs / 2,
    },
    latchInputRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    latchTimeInput: {
        flex: 1,
        marginRight: spacing.sm,
        marginBottom: 0,
    },
    button: {
        marginBottom: spacing.sm,
    },
    // Add new styles for warning and disabled elements
    warningContainer: {
        backgroundColor: `${colors.warning}15`,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.md,
        alignItems: 'center',
    },
    warningText: {
        flex: 1,
        fontSize: 14,
        color: colors.text.secondary,
        lineHeight: 20,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    warningButton: {
        marginTop: spacing.xs,
    },
     optionButtonDisabled: {
        opacity: 0.5,
        backgroundColor: `${colors.surfaceVariant}50`,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    loadingText: {
        marginTop: spacing.md,
        color: colors.text.secondary,
        fontSize: 16,
    },
    completeButton: {
        marginTop: spacing.md,
    },
});