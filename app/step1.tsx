// app/step1.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StandardHeader } from './components/StandardHeader';
import { Card } from './components/Card';
import { Button } from './components/Button';
import { TextInputField } from './components/TextInputField';
import { colors, spacing, borderRadius } from './styles/theme';
import { useDataStore } from './contexts/DataStoreContext';
import { formatSMSCommand, sendSMSCommand } from './utils/smsUtils'; // Import sms functions
import { Device } from './utils/DataStore'; // Use the unified Device type
import { useStepCompletion } from './hooks/useStepCompletion';

export default function Step1Page() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { store, getDeviceById, updateDevice, addDevice, updateGlobalSettings } = useDataStore();
  const [deviceName, setDeviceName] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [password, setPassword] = useState('1234');
  const [adminNumber, setAdminNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined); // To store device ID
  const [device, setDevice] = useState<Device | null>(null); // To store the whole device object
  const { isCompleted, markStepCompleted } = useStepCompletion({ stepKey: 'step1' });

  // Load device data based on params or active device
    const loadDeviceData = useCallback(async () => {
        setIsLoading(true);
        try {
            let currentDeviceId;
            if (params.deviceId) {
                currentDeviceId = String(params.deviceId);
                setDeviceId(currentDeviceId);
                const foundDevice = getDeviceById(currentDeviceId);
                if (foundDevice) {
                    setDevice(foundDevice);
                    setDeviceName(foundDevice.name);
                    setUnitNumber(foundDevice.unitNumber);
                    setPassword(foundDevice.password); // Load existing password
                }
            } else if (store.globalSettings.activeDeviceId) {
                currentDeviceId = store.globalSettings.activeDeviceId;
                setDeviceId(currentDeviceId);
                const activeDevice = getDeviceById(currentDeviceId);
                if (activeDevice) {
                    setDevice(activeDevice);
                    setDeviceName(activeDevice.name);
                    setUnitNumber(activeDevice.unitNumber);
                    setPassword(activeDevice.password); // Load existing password
                }
            }

            // Always load admin number from global settings
            setAdminNumber(store.globalSettings.adminNumber);

        } catch (error) {
            console.error('Failed to load device data:', error);
            Alert.alert('Error', 'Failed to load device data. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [params.deviceId, store.globalSettings.activeDeviceId, getDeviceById]);

    useEffect(() => {
        loadDeviceData();
    }, [loadDeviceData]);

    const validateForm = () => {
        if (!deviceName.trim()) {
            Alert.alert('Error', 'Please enter a name for your device');
            return false;
        }

        if (!unitNumber.trim()) {
            Alert.alert('Error', 'Please enter the device phone number');
            return false;
        }

        if (!password.trim() || password.length !== 4 || !/^\d+$/.test(password)) {
            Alert.alert('Error', 'Password must be exactly 4 digits');
            return false;
        }
          if (!adminNumber.trim()) {
            Alert.alert('Error', 'Please enter your admin phone number');
            return false;
          }

        return true;
    };

    const handleSaveSettings = async () => {
        if (!validateForm()) return;
        setIsLoading(true);

        try {
            if (deviceId) {
                // Update existing device
                const updatedDevice = await updateDevice(deviceId, {
                    name: deviceName,
                    unitNumber,
                    password,
                });
                if (!updatedDevice) {
                  throw new Error("Failed to update the device");
                }
            } else {
                // Add new device
                const newDevice = await addDevice({
                    name: deviceName,
                    unitNumber,
                    password,
                    authorizedUsers: [],
                    type: 'Connect4v', // Assuming default, adapt if you have device type selection
                });
              if(!newDevice) {
                throw new Error("Failed to create a device");
              }
                setDeviceId(newDevice.id);
            }

            // Update global settings (admin number and completed steps)
            await updateGlobalSettings({
                adminNumber,
                completedSteps: [...store.globalSettings.completedSteps.filter(step => step !== 'step1'), 'step1']
            });
            await markStepCompleted(); // Mark this step as complete
            Alert.alert('Success', 'Settings saved successfully', [
                { text: 'OK', onPress: () => router.push('/setup')// ... (rest of the imports from the previous code block)

                ]);
            } catch (error) {
                console.error('Failed to save settings:', error);
                Alert.alert('Error', 'Failed to save settings');
            } finally {
                setIsLoading(false);
            }
        };
    
      const handleRegisterAdmin = async () => {
        if (!validateForm()) return;
    
        setIsLoading(true);
    
        try {
          // Format the admin number to remove any non-digit characters
          let formattedAdminNumber = adminNumber.replace(/\D/g, '');
    
          // Make sure the number has the correct format with "00" prefix before country code
          if (formattedAdminNumber.startsWith('0') && !formattedAdminNumber.startsWith('00')) {
            formattedAdminNumber = '00' + formattedAdminNumber.substring(1); // Replace single 0 with 00
          } else if (!formattedAdminNumber.startsWith('00')) {
            formattedAdminNumber = '00' + formattedAdminNumber;
          }
    
          // Format: PwdTEL00614xxxxxxxx#
          const command = formatSMSCommand(password, 'REGISTER_ADMIN', { adminNumber: formattedAdminNumber });
          console.log(`Admin registration command: ${command}`);
    
            // Open SMS app with pre-filled command
            const smsResult = await openSMSApp(unitNumber, command);
    
            if (smsResult) {
              console.log('SMS app opened successfully for registering admin');
    
              // Save settings locally after successful SMS opening
                await saveToLocalStorage();
              }
    
        } catch (error) {
          console.error('Failed to register admin number:', error);
          Alert.alert('Error', 'Failed to register admin number');
        } finally {
          setIsLoading(false);
        }
      };
    
      const handleTestConnection = async () => {
        if (!unitNumber) {
          Alert.alert('Error', 'Please enter the GSM relay number first');
          return;
        }
        setIsLoading(true)
        const command = formatSMSCommand(password, 'STATUS');
        console.log(`Status check command: ${command}`);
    
        // Open SMS app with pre-filled command
        await sendSMSCommand({phoneNumber: unitNumber, command, deviceId, setLoading, errorTitle:"test connection error"});
      };
    
      // Conditional rendering based on whether a device is selected/created
      const showSetupForm = () => {
          return (
              <>
                  <Card title="Configure Your GSM Opener" elevated>
                      <View style={styles.infoContainer}>
                          <Ionicons
                              name={mapIoniconName("information-circle-outline")}
                              size={24}
                              color={colors.primary}
                              style={styles.infoIcon}
                          />
                          <Text style={styles.infoText}>
                              Enter the phone number of your GSM relay device and give it a name for easy identification.
                          </Text>
                      </View>
    
                      <TextInputField
                          label="Device Name"
                          value={deviceName}
                          onChangeText={setDeviceName}
                          placeholder="Enter a name for this device"
                          containerStyle={styles.inputContainer}
                          editable={!isLoading} // Disable when loading
                      />
    
                      <TextInputField
                          label="GSM Relay Phone Number"
                          value={unitNumber}
                          onChangeText={setUnitNumber}
                          placeholder="Enter phone number"
                          keyboardType="phone-pad"
                          autoComplete="tel"
                          containerStyle={styles.inputContainer}
                          editable={!isLoading} // Disable when loading
                      />
    
                      <TextInputField
                          label="Device Password"
                          value={password}
                          onChangeText={(text) => {
                             const filtered = text.replace(/[^0-9]/g, '').slice(0, 4);
                             setPassword(filtered);
                          }}
                          placeholder="Default is 1234"
                          keyboardType="number-pad"
                          maxLength={4}
                          secureTextEntry
                          containerStyle={styles.inputContainer}
                          editable={!isLoading}
                      />
    
                      <View style={styles.divider} />
    
                      <View style={styles.adminRegistrationContainer}>
                          <Text style={styles.sectionTitle}>Register Admin Number</Text>
                          <View style={styles.infoContainer}>
                              <Ionicons name={mapIoniconName("alert-circle-outline")} size={24} color={colors.warning} style={styles.infoIcon} />
                              <Text style={styles.infoText}>
                                  Important: Register your phone as an administrator to control the relay.
                                  Number format example: 0061469xxxxxx
                              </Text>
                          </View>
    
                          <TextInputField
                              label="Your Admin Phone Number"
                              value={adminNumber}
                              onChangeText={setAdminNumber}
                              placeholder="Enter your number (e.g., 0061469xxxxxx)"
                              keyboardType="phone-pad"
                              containerStyle={styles.inputContainer}
                              editable={!isLoading} // Disable when loading
                          />
    
                          <Text style={styles.commandPreview}>
                            Command: {password}TEL{adminNumber.replace(/\D/g, '').startsWith('00') ?
                            adminNumber.replace(/\D/g, '') :
                            '00' + adminNumber.replace(/\D/g, '')}#
                        </Text>
    
                         <Button
                              title="Register Admin Number"
                              onPress={handleRegisterAdmin}
                              loading={isLoading}
                              disabled={!adminNumber || !unitNumber || isLoading} // Disable if loading or missing info
                              icon={<Ionicons name="key-outline" size={20} color="white" />}
                              style={styles.registerButton}
                              fullWidth
                          />
                      </View>
    
                      <View style={styles.divider} />
    
                      <View style={styles.actionContainer}>
                          <Button
                              title="Test Connection"
                              variant="secondary"
                              onPress={handleTestConnection}
                              loading={isLoading}
                              disabled={!unitNumber || isLoading} // Disable when unitNumber is missing or loading
                              style={styles.actionButton}
                          />
    
                          <Button
                              title="Save Settings"
                              onPress={saveToLocalStorage}
                              loading={isLoading}
                              disabled={!unitNumber || !password || isLoading} // Disable when loading or fields are empty
                              icon={<Ionicons name="save-outline" size={20} color="white" />}
                              style={styles.actionButton}
                          />
                      </View>
                  </Card>
    
                  <Card title="How It Works" style={styles.helpCard}>
                    <View style={styles.helpItem}>
                        <Ionicons name={mapIoniconName("phone-portrait-outline")} size={24} color={colors.primary} style={styles.helpIcon} />
                        <Text style={styles.helpText}>
                        The app communicates with your GSM relay device via SMS commands.
                        </Text>
                    </View>
    
                    <View style={styles.helpItem}>
                        <Ionicons name={mapIoniconName("shield-outline")} size={24} color={colors.primary} style={styles.helpIcon} />
                        <Text style={styles.helpText}>
                        Register your number as an administrator to maintain full control over the device.
                        </Text>
                    </View>
                    </Card>
    
                    <Button
                    title="Continue to Change Password"
                    variant="secondary"
                    onPress={() => router.push({
                      pathname: '/step2',
                      params: deviceId ? { deviceId } : {}
                    })}
                    style={styles.nextButton}
                    icon={<Ionicons name={mapIoniconName("arrow-forward")} size={20} color={colors.primary} />}
                    fullWidth
                    />
              </>
          );
      };
    
      return (
        <View style={styles.container}>
          <StandardHeader showBack backTo={deviceId ? "/devices" : "/setup"} title="Initial Setup: Step 1" />
          <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
            {isLoadingData ? (
                <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading device settings...</Text>
              </View>
            ) : (
                showSetupForm()
            )}
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
        infoContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: `${colors.primary}10`, // Light blue background
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
        divider: {
            height: 1,
            backgroundColor: colors.border,
            marginVertical: spacing.md,
        },
        adminRegistrationContainer: {
            marginBottom: spacing.md,
        },
        sectionTitle: {
            fontSize: 16,
            fontWeight: '600',
            color: colors.text.primary,
            marginBottom: spacing.sm,
        },
        registerButton: {
            marginTop: spacing.md,
        },
        testConnectionContainer: {
            marginTop: spacing.md,
        },
        helpCard: {
            marginTop: spacing.lg,
        },
         helpItem: {
        flexDirection: 'row',
        alignItems: 'flex-start', // Align items to the top
        marginBottom: spacing.md,
      },
      helpIcon: {
        marginRight: spacing.md,
        marginTop: 3,
      },
      helpText: {
        flex: 1, // Take up remaining space
        fontSize: 14,
        color: colors.text.secondary,
        lineHeight: 20,
      },
        commandPreview: {
          fontSize: 14,
          color: colors.text.secondary,
          backgroundColor: colors.background, // Use a contrasting background
          padding: spacing.sm,
          borderRadius: borderRadius.sm,
          marginTop: spacing.xs,
          fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
      },
      nextButton: {
        marginTop: spacing.md,
      },
      loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      },
        loadingText: {
        marginTop: spacing.md,
        color: colors.text.secondary,
      },
    });