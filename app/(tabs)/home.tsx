// app/(tabs)/home.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, Platform, Linking, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { colors, spacing, shadows, borderRadius } from '../styles/theme';
import { StandardHeader } from '../components/StandardHeader';
import { useRouter } from 'expo-router';
import { useDataStore } from '../contexts/DataStoreContext'; // Using consolidated context
import { formatSMSCommand, sendSMSCommand } from '../../utils/smsUtils'; // Import sms functions
import { useFocusEffect } from '@react-navigation/native';

export default function HomePage() {
    const router = useRouter();
    const { store, getDeviceById, refreshStore } = useDataStore(); // Use the consolidated context
    const [isSendingSms, setIsSendingSms] = useState(false);
    const [lastAction, setLastAction] = useState<{ action: string; timestamp: Date } | null>(null);

    // Get the active device from the store
    const activeDevice = store.devices.find(d => d.id === store.globalSettings.activeDeviceId);
    const unitNumber = activeDevice?.unitNumber || '';
    const password = activeDevice?.password || '';

    // Fetch the most recent log whenever we focus the page or after actions
    useFocusEffect(
        useCallback(() => {
            const fetchMostRecentLog = async () => {
                if (!activeDevice) return;
                try {
                    const logs = await getDeviceLogs(activeDevice.id);
                    const sortedLogs = logs.sort(
                        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                    );
                    if (sortedLogs.length > 0) {
                        const latest = sortedLogs[0];
                        setLastAction({
                            action: latest.action,
                            timestamp: new Date(latest.timestamp),
                        });
                    }
                } catch (error) {
                    console.error('Failed to fetch recent logs:', error);
                }
            };

            if (activeDevice?.id) {
                fetchMostRecentLog();
            }
        }, [activeDevice])
    );

    // Simplified SMS sending functions, using the utility
    const handleOpenGate = async () => {
        await sendSMS({ deviceId: activeDevice.id });
    };

    const handleCloseGate = async () => {
        await sendSMS({ deviceId: activeDevice.id, commandType: 'CLOSE' });
    };

    const handleCheckStatus = async () => {
        await sendSMS({ deviceId: activeDevice.id, commandType: 'STATUS' });
    };

    // Function to handle opening external URLs
    const openUrl = async (url: string) => {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
            await Linking.openURL(url);
        } else {
            Alert.alert('Error', `Cannot open URL: ${url}`);
        }
    };

    // Function to open email client
    const openEmail = () => {
        openUrl('mailto:support@automotionplus.com.au');
    };

    // Get other devices for the 'Other Devices' section
    const otherDevices = devices.filter(d => d.id !== activeDevice?.id);

    return (
      <View style={styles.container}>
        <StandardHeader title="Gate Control" />

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Active Device Card */}
          <Card title={activeDevice ? activeDevice.type : "Device Control"} elevated>
              {activeDevice ? (
                  <>
                      <Text style={styles.deviceName}>
                          {activeDevice.name}
                          <View style={styles.deviceActions}>
                              <TouchableOpacity
                                  onPress={() =>
                                      router.push({
                                          pathname: '/device-edit',
                                          params: { deviceId: activeDevice.id },
                                      })
                                  }
                                  style={styles.deviceAction}
                              >
                                  <Ionicons name="create-outline" size={16} color={colors.primary} />
                              </TouchableOpacity>
                              {devices.length > 1 && (
                                  <TouchableOpacity
                                      onPress={goToDeviceManagement}
                                      style={styles.deviceAction}
                                  >
                                      <Ionicons name="swap-horizontal-outline" size={16} color={colors.text.secondary} />
                                  </TouchableOpacity>
                              )}
                          </View>
                          <Text style={styles.devicePhone}> • {activeDevice.unitNumber}</Text>
                      </Text>

                      <View style={styles.actionGrid}>
                          <TouchableOpacity style={styles.actionButton} onPress={handleOpenGate}>
                              <View style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
                                  <Ionicons name="lock-open" size={28} color="white" />
                              </View>
                              <Text style={styles.actionText}>Open</Text>
                          </TouchableOpacity>

                          <TouchableOpacity style={styles.actionButton} onPress={handleCloseGate}>
                              <View style={[styles.iconContainer, { backgroundColor: colors.error }]}>
                                  <Ionicons name="lock-closed" size={28} color="white" />
                              </View>
                              <Text style={styles.actionText}>Close</Text>
                          </TouchableOpacity>

                          <TouchableOpacity style={styles.actionButton} onPress={handleCheckStatus}>
                              <View style={[styles.iconContainer, { backgroundColor: colors.warning }]}>
                                  <Ionicons name="information-circle" size={28} color="white" />
                              </View>
                              <Text style={styles.actionText}>Status</Text>
                          </TouchableOpacity>
                      </View>

                      {devices.length > 1 && (
                          <View style={styles.otherDevicesSection}>
                              <Text style={styles.sectionLabel}>Other Devices:</Text>
                              <ScrollView
                                  horizontal
                                  showsHorizontalScrollIndicator={false}
                                  style={styles.devicesList}
                              >
                                  {devices
                                      .filter((device) => device.id !== activeDevice.id)
                                      .map((device) => (
                                          <TouchableOpacity
                                              key={device.id}
                                              style={styles.deviceChip}
                                              onPress={() => handleSwitchDevice(device)}
                                          >
                                              <Text style={styles.deviceChipText}>{device.name}</Text>
                                          </TouchableOpacity>
                                      ))}
                              </ScrollView>
                          </View>
                      )}
                  </>
              ) : (
                  <View style={styles.emptyDeviceContainer}>
                      <Text style={styles.emptyDeviceText}>Add your first device to get started</Text>
                      <Button
                          title="Device Management"
                          variant="solid"
                          onPress={() => router.push('/(tabs)/settings')}
                          style={styles.emptyDeviceButton}
                      />
                  </View>
              )}
          </Card>

          {activeDevice && (
              <Card title="Recent Activity">
                  <View style={styles.statusRow}>
                      <Ionicons name="time-outline" size={20} color={colors.text.secondary} />
                      <Text style={styles.statusValue}>
                          {lastAction
                              ? `${lastAction.action} at ${lastAction.timestamp.toLocaleTimeString()}`
                              : 'No recent activity'}
                      </Text>
                  </View>
                  <TouchableOpacity
                      style={styles.viewLogsButton}
                      onPress={() => router.push('/(tabs)/logs')}
                  >
                      <Text style={styles.viewLogsText}>View All Logs</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                  </TouchableOpacity>
              </Card>
          )}

          {activeDevice && (
              <Card title="Help & Support">
                  <View style={styles.supportSection}>
                      <View style={styles.supportItem}>
                          <Ionicons name="mail-outline" size={24} color={colors.primary} style={styles.supportIcon} />
                          <TouchableOpacity onPress={openEmail}>
                              <Text style={styles.supportLink}>support@automotionplus.com.au</Text>
                          </TouchableOpacity>
                      </View>

                      <Text style={styles.manualTitle}>Installation Manuals:</Text>

                      <View style={styles.supportItem}>
                          <Ionicons name="document-text-outline" size={24} color={colors.primary} style={styles.supportIcon} />
                          <TouchableOpacity onPress={() => openUrl('https://www.automotionplus.com.au/Installation-Manuals/09-%20GSM%20&%20WiFi%20Control%20Systems/01%20-%20GSM%20Audio%20Intercom/APC%20Connect4V%20User%20Manual%20v03.pdf')}>
                              <Text style={styles.supportLink}>Connect4v Manual</Text>
                          </TouchableOpacity>
                      </View>

                      <View style={styles.supportItem}>
                          <Ionicons name="document-text-outline" size={24} color={colors.primary} style={styles.supportIcon} />
                          <TouchableOpacity onPress={() => openUrl('https://www.automotionplus.com.au/Installation-Manuals/09-%20GSM%20&%20WiFi%20Control%20Systems/01%20-%20GSM%20Audio%20Intercom/PHONIC4-User-Manuel-v05.01.pdf')}>
                              <Text style={styles.supportLink}>Phonic4v Manual</Text>
                          </TouchableOpacity>
                      </View>
                  </View>
              </Card>
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
  deviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  devicePhone: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  actionButton: {
    alignItems: 'center',
    width: '30%',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    ...shadows.sm,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
  },
  statusValue: {
    fontSize: 16,
    color: colors.text.secondary,
    marginLeft: 12,
    flex: 1,
  },
  otherDevicesSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: colors.text.secondary,
  },
  devicesList: {
    flexDirection: 'row',
  },
  deviceChip: {
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.pill,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deviceChipText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  emptyDeviceContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyDeviceText: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  emptyDeviceButton: {
    minWidth: 180,
  },
  viewLogsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  viewLogsText: {
    color: colors.primary,
    fontWeight: '500',
    marginRight: 4,
  },
  setupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  setupTextContainer: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  setupTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
  },
  setupDescription: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  deviceActions: {
    flexDirection: 'row',
    marginLeft: spacing.sm,
  },
  deviceAction: {
    padding: 4,
    marginHorizontal: 2,
  },
  supportSection: {
    paddingVertical: spacing.sm,
  },
  supportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  supportIcon: {
    marginRight: spacing.md,
  },
  supportLink: {
    fontSize: 16,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  manualTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
});