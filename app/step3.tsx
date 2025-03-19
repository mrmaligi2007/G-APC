import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StandardHeader } from './components/StandardHeader';
import { Card } from './components/Card';
import { Button } from './components/Button';
import { TextInputField } from './components/TextInputField';
import { colors, spacing, borderRadius } from './styles/theme';
import { useDataStore } from './contexts/DataStoreContext';
import { User } from './utils/DataStore'; // Import User from DataStore
import { formatSMSCommand, sendSMSCommand } from './utils/smsUtils';
import { useStepCompletion } from './hooks/useStepCompletion';
import { mapIoniconName } from './utils/iconMapping';

export default function Step3Page() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { store, getDeviceById, addUser, authorizeUserForDevice, updateGlobalSettings } = useDataStore();
  const [newUserName, setNewUserName] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserSerial, setNewUserSerial] = useState('');
  const [newUserStartTime, setNewUserStartTime] = useState('');
  const [newUserEndTime, setNewUserEndTime] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const deviceId = params.deviceId ? String(params.deviceId) : undefined;
  const [device, setDevice] = useState<Device | null>(null);
  const { isCompleted, markStepCompletion } = useStepCompletion({ stepKey: 'step3' });


  const loadDeviceData = useCallback(async () => {
        if (!deviceId) return;

        try {
            const foundDevice = getDeviceById(deviceId);
            if (foundDevice) {
                setDevice(foundDevice);
            }
        } catch (error) {
            console.error('Failed to load device data:', error);
        }
    }, [deviceId, getDeviceById]);

    useEffect(() => {
      loadDeviceData();
    }, [loadDeviceData]);

  const { users: authorizedUsers, saveUsers } = useAuthorizedUsers(deviceId);

  const generateNextSerial = () => {
    if (!authorizedUsers) {
        return '001';
    }

    const usedSerials = authorizedUsers.map(user => parseInt(user.serialNumber, 10))
                                       .filter(num => !isNaN(num));
    let nextSerial = 1;
    while (usedSerials.includes(nextSerial) && nextSerial <= 200) {
        nextSerial++;
    }

    if (nextSerial <= 200) {
        return nextSerial.toString().padStart(3, '0');
    }

    return ''; // Or handle the case where all serials are used
  };

  // Set the next serial number when authorizedUsers change or component mounts
    useEffect(() => {
        if (authorizedUsers) {
            setNewUserSerial(generateNextSerial());
        }
    }, [authorizedUsers]);

  const validateUser = () => {
    if (!newUserPhone.trim() || !newUserSerial.trim()) {
      Alert.alert('Error', 'Please enter both phone number and serial position');
      return false;
    }
    // Add more validation as needed, e.g., phone number format
    return true;
  };

  const handleAddUser = async () => {
    if (!validateUser() || !deviceId || !device) return;
    setIsLoading(true);

    try {
      const newUser: Omit<User, 'id'> = {
        name: newUserName || 'Unnamed User',
        phoneNumber: newUserPhone,
        serialNumber: newUserSerial,
        startTime: newUserStartTime || undefined,
        endTime: newUserEndTime || undefined
      };

      // Add the user to the data store.
      const addedUser = await addUser(newUser);
      if (!addedUser) {
        throw new Error("Failed to add user to the data store.");
      }
      
      // Authorize this user for the current device.
      await authorizeUserForDevice(deviceId, addedUser.id);

      // Format the command using the centralized function.
      const command = formatSMSCommand(device.password, 'ADD_USER', {
          serial: newUserSerial,
          phone: newUserPhone,
          startTime: newUserStartTime,
          endTime: newUserEndTime,
      });

      // Send the SMS command.
      const success = await sendSMSCommand({
        phoneNumber: device.unitNumber,
        command,
        deviceId: device.id,
        setLoading
      });
        
      if(success){
          await addDeviceLog(deviceId, 'User Management', `Added user: ${newUser.name}`, true, 'user');
          
          // Mark step as completed
          await markStepCompletion();
          
          Alert.alert(
            'Success',
            'User added and command sent successfully',
            [{ text: 'OK', onPress: () => {
              // Clear input fields
              setNewUserName('');
              setNewUserPhone('');
              setNewUserSerial('');
              setNewUserStartTime('');
              setNewUserEndTime('');
              
              loadUsers(); // Refresh users
            }}]
          );
      }

    } catch (error) {
      console.error('Failed to add user:', error);
      Alert.alert('Error', 'Failed to add user');
    } finally {
      setIsLoading(false);
    }
  };

  const viewAuthorizedUsers = () => {
    router.push({
        pathname: '/authorized-users-list',
        params: { deviceId }
      });
  };

  return (
    <View style={styles.container}>
      <StandardHeader showBack backTo="/setup" title="Manage Users" />
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Card title="Add Authorized Users" elevated>
          <View style={styles.infoContainer}>
            <Ionicons name={mapIoniconName("information-circle-outline")} size={24} color={colors.primary} style={styles.infoIcon} />
            <Text style={styles.infoText}>
              Add phone numbers that are authorized to control your device. 
              Each user is stored in a position from 001-200 on your device.
            </Text>
          </View>
          
          <TextInputField
            label="Serial Position (001-200)"
            value={newUserSerial}
            onChangeText={setNewUserSerial}
            placeholder="e.g., 001"
            keyboardType="number-pad"
            maxLength={3}
            containerStyle={styles.inputContainer}
            editable={!isLoading}
          />
          
          <TextInputField
            label="Phone Number"
            value={newUserPhone}
            onChangeText={setNewUserPhone}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
            containerStyle={styles.inputContainer}
            editable={!isLoading}
          />
          
          <TextInputField
            label="Name (Optional)"
            value={newUserName}
            onChangeText={setNewUserName}
            placeholder="Enter user name"
            containerStyle={styles.inputContainer}
            editable={!isLoading}
          />
          
          <TouchableOpacity 
            style={styles.advancedToggle}
            onPress={() => setShowAdvanced(!showAdvanced)}
          >
            <Text style={styles.advancedToggleText}>
              {showAdvanced ? 'Hide Time Restrictions' : 'Add Time Restrictions'}
            </Text>
            <Ionicons 
              name={mapIoniconName(showAdvanced ? "chevron-up-outline" : "chevron-down-outline")} 
              size={18} 
              color={colors.primary} 
            />
          </TouchableOpacity>
          
          {showAdvanced && (
            <View style={styles.advancedOptions}>
              <Text style={styles.advancedTitle}>Time Restrictions</Text>
              <Text style={styles.advancedDescription}>
                Optionally restrict when this user can access the device by setting start and end times.
              </Text>
              
              <View style={styles.timeRow}>
                <View style={styles.timeInput}>
                  <TextInputField
                    label="Start Time"
                    value={newUserStartTime}
                    onChangeText={setNewUserStartTime}
                    placeholder="YYMMDDHHMM"
                    keyboardType="number-pad"
                    maxLength={10}
                    info="Format: Year Month Day Hour Min"
                    editable={!isLoading}
                  />
                </View>
                
                <View style={styles.timeInput}>
                  <TextInputField
                    label="End Time"
                    value={newUserEndTime}
                    onChangeText={setNewUserEndTime}
                    placeholder="YYMMDDHHMM"
                    keyboardType="number-pad"
                    maxLength={10}
                    info="Format: Year Month Day Hour Min"
                    editable={!isLoading}
                  />
                </View>
              </View>
              
              <Text style={styles.exampleText}>
                Example: Start 2408050800 = Aug 5, 2024 8:00 AM
              </Text>
            </View>
          )}
          
          <Button
            title="Add User"
            onPress={handleAddUser}
            loading={isLoading}
            disabled={isLoading || !newUserPhone || !newUserSerial}
            icon={<Ionicons name="person-add-outline" size={20} color="white" />}
            fullWidth
          />
        </Card>
        
        <View style={styles.viewUsersButtonContainer}>
          <Button
            title="View Authorized Users"
            onPress={viewAuthorizedUsers}
            variant="secondary"
            icon={<Ionicons name="list-outline" size={20} color={colors.primary} />}
          />
        </View>
        
        <Button
          title="Continue to Device Settings"
          variant="secondary"
          onPress={() => router.push({
            pathname: '/step4',
            params: deviceId ? { deviceId } : {}
          })}
          style={styles.nextButton}
          icon={<Ionicons name={mapIoniconName("arrow-forward")} size={20} color={colors.primary} />}
          fullWidth
        />
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
    paddingBottom: spacing.xxl,
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: `${colors.primary}10`,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
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
  inputContainer: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    padding: 8,
    backgroundColor: `${colors.primary}10`,
    borderRadius: 8,
  },
  advancedToggleText: {
    color: colors.primary,
    fontWeight: '500',
    marginRight: 4,
  },
  advancedOptions: {
    marginTop: 8,
    marginBottom: 16,
    padding: 12,
    backgroundColor: `${colors.surfaceVariant}50`,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  advancedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  advancedDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 12,
},
timeRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
},
timeInput: {
  width: '48%',
},
exampleText: {
  fontSize: 12,
  color: colors.text.secondary,
  fontStyle: 'italic',
  marginTop: 4,
  textAlign: 'center',
},
addButton: {
  marginTop: spacing.md,
},
  viewUsersButtonContainer: {
  marginTop: spacing.md,
},
  nextButton: {
  marginTop: spacing.md,
},
});