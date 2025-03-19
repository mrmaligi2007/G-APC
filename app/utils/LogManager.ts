import AsyncStorage from '@react-native-async-storage/async-storage';
import { LogEntry } from '../types'; // Centralized types
import { safeGetItem, safeSetItem } from './storageUtils';

// Unified LogManager class
class LogManager {
    private static readonly LEGACY_LOGS_KEY = 'smsCommandLogs';
    private static readonly SYSTEM_LOGS_KEY = 'systemLogs';

    private static getDeviceLogsKey(deviceId: string): string {
        return `app_logs_${deviceId}`;
    }

    // Add a new log entry (consolidated)
    public static async addLog(
        action: string,
        details: string,
        success: boolean = true,
        deviceId?: string,
        category: 'relay' | 'settings' | 'user' | 'system' = 'system'
    ): Promise<LogEntry> {
          // Create new log entry
        const newLog: LogEntry = {
          id: Date.now().toString(), // Simplest unique ID
          timestamp: new Date().toISOString(),
          action,
          details,
          success,
          deviceId,
          category,
        };
        
        try {
          if (deviceId) {
            const deviceLogsKey = this.getDeviceLogsKey(deviceId);
            const logsJson = await safeGetItem(deviceLogsKey, '[]');
            const logs: LogEntry[] = JSON.parse(logsJson);
            const updatedDeviceLogs = [newLog, ...logs.slice(0, 199)];
            await safeSetItem(deviceLogsKey, JSON.stringify(updatedDeviceLogs));

          }
          // Always save system-level logs too, for broader tracking
            const systemLogsJson = await safeGetItem(this.SYSTEM_LOGS_KEY, '[]');
            const systemLogs: LogEntry[] = JSON.parse(systemLogsJson);
            const updatedSystemLogs = [newLog, ...systemLogs.slice(0, 99)];
            await safeSetItem(this.SYSTEM_LOGS_KEY, JSON.stringify(updatedSystemLogs));
          console.log('Log added:', action, details, success);
          return newLog;
        } catch (error) {
          console.error('Error adding log:', error);
          return newLog; // Return the log anyway
        }
  }


    // Get logs for a specific device
    public static async getDeviceLogs(deviceId?: string): Promise<LogEntry[]> {
        try {
            if (deviceId) {
                const deviceLogsKey = this.getDeviceLogsKey(deviceId);
                const logsJson = await safeGetItem(deviceLogsKey);
                if (logsJson) {
                    return JSON.parse(logsJson);
                }
            }
            // Fallback to legacy logs
            const legacyLogsJson = await safeGetItem(LEGACY_LOGS_KEY);
             if (legacyLogsJson) {
                return JSON.parse(legacyLogsJson)
             }
        } catch (error) {
            console.error('Failed to get logs:', error);
        }
        return [];
    }


    // Clear logs for a specific device
    public static async clearDeviceLogs(deviceId?: string): Promise<void> {
        try {
            if(deviceId){
                const deviceLogsKey = this.getDeviceLogsKey(deviceId);
                await safeSetItem(deviceLogsKey, '[]');
            } else {
                // Clear system logs if no deviceId
                await safeSetItem(this.SYSTEM_LOGS_KEY, '[]');
            }
        } catch (error) {
            console.error('Failed to clear logs:', error);
        }
    }

    // Log SMS operation with details extraction and sanitization
    public static async logSMSOperation(deviceId: string, command: string, success: boolean = true): Promise<LogEntry> {
        let action = "GSM Command";
        let details = command.replace(/\d{4}[A-Z]/g, '****'); // Hide password

        if (command.includes('CC')) {
            action = "Gate Open";
            details = "Opened gate/activated relay (ON)";
        } else if (command.includes('DD')) {
            action = "Gate Close";
            details = "Closed gate/deactivated relay (OFF)";
        } else if (command.includes('P') && command.length === 8) {
            action = "Password Change";
            details = "Changed device password";
        } else if (command.includes('EE')) {
            action = "Status Check";
            details = "Requested device status";
        } else if (command.includes('TEL')) {
            action = "Admin Registration";
            details = "Registered admin phone number";
        }  else if (command.includes('A') && !command.includes('ALL') && !command.includes('AUT')) {
            action = "User Management";
            if (command.includes('##')) {
                const serial = command.match(/\d{4}A(\d{3})##/)?.[1];
                details = `Removed authorized user from position ${serial || ''}`;
            } else if (command.match(/\d{4}A\d{3}#[^#]+#/)) {
                const matches = command.match(/\d{4}A(\d{3})#([^#]+)#/);
                if (matches) {
                    const [_, serial, phone] = matches;
                    details = `Added user ${phone} at position ${serial}`;
                }
            }
        } else if (command.includes('AUT')) {
            action = "Access Control";
            details = "Set to authorized users only";
        } else if (command.includes('ALL')) {
            action = "Access Control";
            details = "Set to allow all callers";
        }  else if (command.includes('GOT')) {
            action = "Relay Timing";
            const seconds = command.match(/\d{4}GOT(\d{3})#/)?.[1];
            if (seconds === '000') {
                details = 'Set relay to momentary mode (pulse)';
            } else if (seconds === '999') {
                details = 'Set relay to toggle mode (stays ON until next call)';
            } else {
                details = `Set relay to close for ${parseInt(seconds || '0', 10)} seconds`;
            }
        }

        return this.addLog(action, details, success, deviceId, 'relay');
    }
}

export default LogManager;