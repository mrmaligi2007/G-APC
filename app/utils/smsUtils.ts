// utils/smsUtils.ts
import { Linking, Alert, Platform } from 'react-native';
import { addLog } from './LogManager'; // Import from the consolidated logger
import { safeExecute } from './errorUtils'; // Import safe execution utility

// Formats the phone number for use in SMS URI
const formatPhoneNumber = (phoneNumber: string): string => {
  return Platform.OS === 'ios' ? phoneNumber.replace(/[^0-9+]/g, '') : phoneNumber;
};

// Centralized command formatting
export const formatSMSCommand = (password: string, commandType: string, options: any = {}): string => {
    switch (commandType) {
        case 'OPEN':
            return `${password}CC`;
        case 'CLOSE':
            return `${password}DD`;
        case 'STATUS':
            return `${password}EE`;
        case 'ADD_USER':
            return `${password}A${options.serial}#${options.phone}#${options.startTime || ''}#${options.endTime || ''}#`;
        case 'DELETE_USER':
            return `${password}A${options.serial}##`;
        case 'SET_ACCESS':
            return `${password}${options.accessType}#`;
        case 'SET_LATCH':
            return `${password}GOT${options.latchTime.padStart(3, '0')}#`;
        case 'REGISTER_ADMIN':
            return `${password}TEL${options.adminNumber}#`;
        default:
            return command; // Raw command as fallback
    }
};


// Open SMS app (now uses sendSMSCommand internally for consistency)
export const openSMSApp = async (phoneNumber: string, message: string): Promise<boolean> => {
    return sendSMSCommand({ phoneNumber, command: message });
};

export const sendSMSCommand = async (options: {
  phoneNumber: string;
  command: string;
  deviceId?: string;
  setLoading?: (loading: boolean) => void;
  onSuccess?: () => void;
  errorTitle?: string;
  errorMessage?: string;
}): Promise<boolean> => {
    const {phoneNumber, command, deviceId, setLoading, onSuccess, errorTitle, errorMessage} = options;
    
  if (!phoneNumber) {
    Alert.alert('Error', 'Device phone number not available');
    return false;
  }

  return safeExecute(
    async () => {
      // Format the phone number based on platform
      const formattedPhoneNumber = formatPhoneNumber(phoneNumber);
      
      // Create the SMS URL based on platform
      const smsUrl = Platform.select({
        ios: `sms:${formattedPhoneNumber}&body=${encodeURIComponent(command)}`,
        android: `sms:${formattedPhoneNumber}?body=${encodeURIComponent(command)}`,
        default: `sms:${formattedPhoneNumber}?body=${encodeURIComponent(command)}`,
      });
      
      // Check if SMS is supported on this device
      const supported = await Linking.canOpenURL(smsUrl);
      if (!supported) {
        throw new Error('SMS is not available on this device');
      }
      
      // Open the SMS app
      await Linking.openURL(smsUrl);
      
      // Log the SMS operation if we have a device ID
      if (deviceId) {
        await LogManager.logSMSOperation(deviceId, command, true);
      }
      
      return true;
    },
    {
      setLoading,
      onSuccess,
      errorTitle: errorTitle || "SMS Error",
      errorMessage: errorMessage || "Failed to send SMS command.",
      logError: true,
      deviceId,
      logAction: "SMS Operation",
      logCategory: 'relay',
    }
  );
};
export default {
  sendSMSCommand,
  openSMSApp, // Add this line
  formatSMSCommand
};