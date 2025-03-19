import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert, Platform, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StandardHeader } from './components/StandardHeader';
import { Card } from './components/Card';
import { Button } from './components/Button';
import { TextInputField } from './components/TextInputField';
import { colors, spacing, borderRadius } from './styles/theme';
import { useDataStore } from './contexts/DataStoreContext';
import { formatSMSCommand, sendSMSCommand } from '../utils/smsUtils';
import { useStepCompletion } from './hooks/useStepCompletion';

export default function Step2Page() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { store, getDeviceById, updateDevice, addDeviceLog, logSMSOperation } = useDataStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true); // Separate loading for initial data load
  const deviceId = params.deviceId ? String(params.deviceId) : undefined;
  const { isCompleted, markStepCompleted } = useStepCompletion({ stepKey: 'step2' });

  const loadDeviceData = useCallback(async () => {
    if (!deviceId) return;

    setIsDataLoading(true);
    try {
      const foundDevice = getDeviceById(deviceId);
      if (foundDevice) {
        setCurrentPassword(foundDevice.password);
      }
    } catch (error) {
      console.error('Failed to load device data:', error);
      Alert.alert('Error', 'Failed to load device data.');
    } finally {
      setIsDataLoading(false);
    }
  }, [deviceId, getDeviceById]);

  useEffect(() => {
    loadDeviceData();
  }, [loadDeviceData]);

  const validatePasswords = () => {
    if (!newPassword) {
      Alert.alert('Error', 'Please enter a new password');
      return false;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }

    if (newPassword.length !== 4 || !/^\d+$/.test(newPassword)) {
      Alert.alert('Error', 'Password must be exactly 4 digits');
      return false;
    }

    return true;
  };

  const handleChangePassword = async () => {
    if (!validatePasswords() || !deviceId) return;
  
    setIsLoading(true);
    try {
      // Update device with new password in DataStore
      const updatedDevice = await updateDevice(deviceId, { password: newPassword });
  
      if (updatedDevice) {
        const command = formatSMSCommand(currentPassword, 'CHANGE_PASSWORD', { newPassword });
        const smsSuccess = await sendSMSCommand({
          phoneNumber: updatedDevice.unitNumber,
          command,
          deviceId,
          setLoading,
          errorTitle: "Password Change Error",
          errorMessage: "Failed to send SMS to change password. Please try again.",
        });
  
        if (smsSuccess) {
          await addDeviceLog(deviceId, 'Password Change', 'Device password updated successfully', true, 'settings');
          await markStepCompleted(); // Mark this step as complete
          Alert.alert(
            'Success',
            'Password changed successfully! The app and your device will use the new password now.',
            [{ text: 'OK', onPress: () => router.push('/setup') }]
          );
        } else {
          // If SMS sending fails, revert the password change in DataStore
          await updateDevice(deviceId, { password: currentPassword });
        }
      } else {
        Alert.alert('Error', 'Failed to update device password');
      }
    } catch (error) {
      console.error('Failed to change password:', error);
      Alert.alert('Error', 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StandardHeader showBack backTo="/setup" title="Change Device Password" />

      {isDataLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <Card title="Change Device Password" elevated>
            <View style={styles.infoContainer}>
              <Ionicons name="information-circle-outline" size={24} color={colors.primary} style={styles.infoIcon} />
              <Text style={styles.infoText}>
                Change your GSM relay password. Password must be 4 digits. This will update both the app and the device.
              </Text>
            </View>

            <TextInputField
              label="Current Password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Current 4-digit password"
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              editable={false} // Current password should be pre-filled and not editable
              info="Your current password as stored in the app"
            />

            <TextInputField
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new 4-digit password"
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
            />

            <TextInputField
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Enter new password again"
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              error={newPassword && confirmPassword && newPassword !== confirmPassword ? "Passwords don't match" : undefined}
            />

            <Button
              title="Change Password"
              onPress={handleChangePassword}
              disabled={!newPassword || !confirmPassword || newPassword !== confirmPassword || isLoading}
              loading={isLoading}
              icon={<Ionicons name="key-outline" size={20} color="white" />}
              style={styles.changeButton}
              fullWidth
            />
          </Card>

          <Card title="Password Requirements" style={styles.helpCard}>
            <View style={styles.helpItem}>
              <Ionicons name="lock-closed-outline" size={24} color={colors.primary} style={styles.helpIcon} />
              <Text style={styles.helpText}>
                The password must be exactly 4 digits (0-9).
              </Text>
            </View>

            <View style={styles.helpItem}>
              <Ionicons name="warning-outline" size={24} color={colors.warning} style={styles.helpIcon} />
              <Text style={styles.helpText}>
                After changing the password, all authorized users must use the new password when sending commands.
              </Text>
            </View>
          </Card>

          <Button
            title="Continue to User Management"
            variant="secondary"
            onPress={() => router.push({
              pathname: '/step3',
              params: deviceId ? { deviceId } : {}
            })}
            style={styles.nextButton}
            icon={<Ionicons name="arrow-forward" size={20} color={colors.primary} />}
            fullWidth
          />
        </ScrollView>
      )}
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
    changeButton: {
        marginTop: spacing.md,
    },
    helpCard: {
        marginTop: spacing.lg,
    },
    helpItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: spacing.md,
    },
    helpIcon: {
        marginRight: spacing.md,
        marginTop: 3, // Adjust for icon alignment
    },
    helpText: {
        flex: 1,
        fontSize: 14,
        color: colors.text.secondary,
        lineHeight: 20,
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
  nextButton: {
    marginTop: spacing.md,
  },
});