// utils/DataStore.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addLog, LogEntry } from './LogManager'; // Import log functions
import { safeGetItem, safeSetItem, safeRemoveItem, safeMultiRemove, validateKey } from './storageUtils'; // Import storage utilities
import { v4 as uuidv4 } from 'uuid';
import 'react-native-get-random-values';


// Data model interfaces (as defined in types/index.ts)
export interface User {
  id: string;
  name: string;
  phoneNumber: string;
  serialNumber: string;
  startTime?: string;
  endTime?: string;
}

export interface Device {
  id: string;
  name: string;
  unitNumber: string;
  password: string;
  authorizedUsers: string[];
  createdAt: string;
  updatedAt: string;
  type: 'Connect4v' | 'Phonic4v'; // Specify allowed types
  isActive?: boolean;
  relaySettings?: {
    accessControl: 'AUT' | 'ALL';
    latchTime: string;
  };
}

export interface GlobalSettings {
  adminNumber: string;
  activeDeviceId: string | null;
  completedSteps: string[];
}

interface AppData {
  devices: Device[];
  users: User[];
  logs: Record<string, LogEntry[]>; // DeviceId -> LogEntries
  globalSettings: GlobalSettings;
}

// Default initial state
const initialState: AppData = {
  devices: [],
  users: [],
  logs: {},
  globalSettings: {
    adminNumber: '',
    activeDeviceId: null,
    completedSteps: []
  }
};

const STORE_KEY = 'app_data';

class DataStore {
  private static instance: DataStore;
  private store: AppData = initialState;
  private isInitialized: boolean = false;
  private savePromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): DataStore {
    if (!DataStore.instance) {
      DataStore.instance = new DataStore();
    }
    return DataStore.instance;
  }

  // Initialize the store by loading data from AsyncStorage
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      const storedData = await safeGetItem(STORE_KEY);
      
      //Check that stored data exist
      if (storedData) {
        this.store = JSON.parse(storedData);
        console.log("Store initialized from saved data");
      } else {
          // First time initialization - try to migrate legacy data
        await this.migrateLegacyData();
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize DataStore:', error);
      this.store = { ...initialState }; // Initialize with a copy of the initialState
      this.isInitialized = true;
    }
  }

  // Save the entire store to AsyncStorage with debounce
    private async saveStore(): Promise<void> {
        if (this.savePromise) {
            return this.savePromise;
        }

        this.savePromise = new Promise<void>(async (resolve) => {
            try {
                await AsyncStorage.setItem(STORE_KEY, JSON.stringify(this.store));
            } catch (error) {
                console.error('Failed to save store:', error);
            } finally {
                this.savePromise = null;
                resolve();
            }
        });

        return this.savePromise;
    }

  // Get a copy of the entire store
  public getStore(): AppData {
    return JSON.parse(JSON.stringify(this.store));
  }

  // Get all devices
  public getDevices(): Device[] {
    return [...this.store.devices];
  }

    // Get a specific device by ID
    public getDeviceById(deviceId: string): Device | undefined {
        return this.store.devices.find(d => d.id === deviceId);
    }

  // Add a new device
  public async addDevice(device: Omit<Device, 'id' | 'createdAt' | 'updatedAt'>): Promise<Device> {
    console.log('DataStore: Adding device:', device.name);
    
    const newDevice: Device = {
      ...device,
      id: uuidv4(),
      authorizedUsers: device.authorizedUsers || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.store.devices.push(newDevice);
    await this.saveStore();
    console.log(`DataStore: Device added successfully with ID: ${newDevice.id}`);
    return { ...newDevice };
  }

  // Update an existing device
    public async updateDevice(deviceId: string, updates: Partial<Device>): Promise<Device | null> {
        const index = this.store.devices.findIndex(d => d.id === deviceId);
        if (index === -1) return null;

        this.store.devices[index] = {
            ...this.store.devices[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        await this.saveStore();
        return { ...this.store.devices[index] };
    }
    // Delete a device and all associated data
    public async deleteDevice(deviceId: string): Promise<boolean> {
        if (!deviceId || typeof deviceId !== 'string') {
            console.error('DataStore: Invalid deviceId for deletion:', deviceId);
            return false;
        }

        console.log(`DataStore: Deleting device ${deviceId}`);

        const initialDeviceCount = this.store.devices.length;

        const deviceToDelete = this.store.devices.find(d => d.id === deviceId);
        if (!deviceToDelete) {
            console.log(`DataStore: Device ${deviceId} not found for deletion`);
            return false;
        }
        console.log(`DataStore: Found device to delete: ${deviceToDelete.name}`);

        // Remove device
        this.store.devices = this.store.devices.filter(d => d.id !== deviceId);

        // Remove associated logs
        delete this.store.logs[deviceId];

        // If this was the active device, update activeDeviceId
        if (this.store.globalSettings.activeDeviceId === deviceId) {
            this.store.globalSettings.activeDeviceId = this.store.devices.length > 0 ? this.store.devices[0].id : null;
        }

        await this.saveStore();
        const success = initialDeviceCount !== this.store.devices.length;
        console.log(`DataStore: Device deletion ${success ? 'successful' : 'failed'}`);

        return success;
    }

    // Set active device
    public async setActiveDevice(deviceId: string): Promise<boolean> {
        if (this.store.devices.some(d => d.id === deviceId)) {
            this.store.globalSettings.activeDeviceId = deviceId;
            await this.saveStore();
            return true;
        }
        return false;
    }


  // USER OPERATIONS

    public getUsers(): User[] {
        return [...this.store.users];
    }

  public getDeviceUsers(deviceId: string): User[] {
    const device = this.store.devices.find(d => d.id === deviceId);
    if (!device) return [];
    return this.store.users.filter(user => device.authorizedUsers.includes(user.id));
  }


  public async addUser(user: Omit<User, 'id'>): Promise<User | null> {
    const newUser: User = {
      ...user,
      id: uuidv4()
    };
    this.store.users.push(newUser);
    await this.saveStore();
    return { ...newUser };
  }

  public async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    const index = this.store.users.findIndex(u => u.id === userId);
    if (index === -1) return null;

    this.store.users[index] = {
      ...this.store.users[index],
      ...updates,
    };
    await this.saveStore();
    return { ...this.store.users[index] };
  }

    public async deleteUser(userId: string): Promise<boolean> {
        const initialLength = this.store.users.length;
        this.store.users = this.store.users.filter(user => user.id !== userId);

        // Remove user from all device authorizedUsers arrays
        this.store.devices.forEach(device => {
            device.authorizedUsers = device.authorizedUsers.filter(id => id !== userId);
        });

        await this.saveStore();
        return this.store.users.length < initialLength;
    }

    // AUTHORIZATION OPERATIONS
    public async authorizeUserForDevice(deviceId: string, userId: string): Promise<boolean> {
        const device = this.store.devices.find(d => d.id === deviceId);
        if (!device) return false;
        if (!device.authorizedUsers.includes(userId)) {
            device.authorizedUsers.push(userId);
            await this.saveStore();
            return true;
        }
        return false;
    }

    public async deauthorizeUserForDevice(deviceId: string, userId: string): Promise<boolean> {
        const device = this.store.devices.find(d => d.id === deviceId);
        if (!device) return false;
        const initialLength = device.authorizedUsers.length;
        device.authorizedUsers = device.authorizedUsers.filter(id => id !== userId);
        if (initialLength !== device.authorizedUsers.length) {
            await this.saveStore();
            return true;
        }
        return false;
    }
  // LOG OPERATIONS
  
  // Add a log entry for a specific device
  public async addDeviceLog(
    deviceId: string, 
    action: string, 
    details: string, 
    success: boolean = true,
    category: 'relay' | 'settings' | 'user' | 'system' = 'system'
  ): Promise<LogEntry> {
    // Validate deviceId, also check for empty/whitespace strings
    if (!deviceId || typeof deviceId !== 'string' || !deviceId.trim()) {
      console.error('Invalid deviceId for log entry:', deviceId);
      // Use a fallback deviceId for system logs
      deviceId = 'system';
    }
    if (!this.store.logs[deviceId]) {
      this.store.logs[deviceId] = [];
    }
    
    const newLog: LogEntry = {
      id: generateUUID(),
      timestamp: new Date().toISOString(),
      action,
      details,
      success,
      category
    };
    
    // Add to beginning of array to show newest first
    this.store.logs[deviceId] = [newLog, ...this.store.logs[deviceId].slice(0, 199)];
    await this.saveStore();
    return newLog;
  }

  // Get logs for a specific device
  public getDeviceLogs(deviceId: string): LogEntry[] {
    if (!deviceId || typeof deviceId !== 'string' || !deviceId.trim()) {
      console.error("Invalid deviceId for getting logs:", deviceId);
      deviceId = 'system';
    }
    return this.store.logs[deviceId] ? [...this.store.logs[deviceId]] : [];
  }

  // Clear logs for a specific device
  public async clearDeviceLogs(deviceId: string): Promise<boolean> {
    if (!deviceId || typeof deviceId !== 'string' || !deviceId.trim()) {
      console.error("Invalid deviceId for clearing logs:", deviceId);
      return false; // Return false for invalid input
    }
    
    // Check if the device exists before deleting logs
    if (this.store.logs[deviceId]) {
      delete this.store.logs[deviceId];
      await this.saveStore();
      return true;
    }
    
    return false; // Return false if no logs were found for the device
  }

  public async logSMSOperation(deviceId: string, command: string, success: boolean = true): Promise<LogEntry> {
        let action = "GSM Command";
        let details = command.replace(/\d{4}[A-Z]/g, '****');

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
        } else if (command.includes('A') && !command.includes('ALL') && !command.includes('AUT')) {
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
        } else if (command.includes('GOT')) {
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

        return this.addDeviceLog(deviceId, action, details, success, 'relay');
    }

  // GLOBAL SETTINGS OPERATIONS
  
  // Get global settings
  public getGlobalSettings(): GlobalSettings {
    return {...this.store.globalSettings};
  }

  // Update global settings
  public async updateGlobalSettings(updates: Partial<GlobalSettings>): Promise<GlobalSettings> {
    this.store.globalSettings = {
      ...this.store.globalSettings,
      ...updates
    };
    
    await this.saveStore();
    return { ...this.store.globalSettings };
  }
  
  // Method to force reinitialization
  public async forceReinitialization(): Promise<void> {
    this.isInitialized = false;
    await this.initialize();
    console.log('DataStore: Force reinitialization completed');
  }

  // Migrate legacy data from old AsyncStorage keys
  private async migrateLegacyData(): Promise<void> {
    try {
      const unitNumber = await AsyncStorage.getItem('unitNumber');
      const password = await AsyncStorage.getItem('password');
      const adminNumber = await AsyncStorage.getItem('adminNumber');

      if (unitNumber) {
        // Create a new device with the migrated data
        const newDevice: Device = {
          id: generateUUID(), // Use UUIDs for device IDs
          name: 'My GSM Opener', // Default name
          unitNumber,
          password: password || '1234', // Default password
          authorizedUsers: [], // Initialize empty authorized users
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          type: 'Connect4v', // You might need to adjust this based on your logic
        };

        this.store.devices.push(newDevice);
        this.store.globalSettings.activeDeviceId = newDevice.id;

        // Migrate authorized users (if any)
        const legacyUsersJson = await AsyncStorage.getItem('authorizedUsers');
        if (legacyUsersJson) {
            const legacyUsers = JSON.parse(legacyUsersJson);
            if (Array.isArray(legacyUsers)) {
                legacyUsers.forEach(legacyUser => {
                  if(legacyUser.phone && legacyUser.serial){
                    const newUser: User = {
                        id: generateUUID(), // Generate a new ID for each user
                        name: legacyUser.name || 'Unnamed User', // Use name if available, otherwise default
                        phoneNumber: legacyUser.phone,
                        serialNumber: legacyUser.serial,
                        startTime: legacyUser.startTime,
                        endTime: legacyUser.endTime
                    };
                    this.store.users.push(newUser);
                    newDevice.authorizedUsers.push(newUser.id); // Use the new ID
                  }
                });
            }
        }

        // Migrate system logs (if any)
        const legacyLogsJson = await AsyncStorage.getItem('app_logs');
        if (legacyLogsJson) {
            try {
                const legacyLogs: LogEntry[] = JSON.parse(legacyLogsJson);
                // Associate each log with the new device
                const deviceLogs: LogEntry[] = legacyLogs.map(log => ({
                  ...log,
                  deviceId: newDevice.id // Assign device ID to logs
                }));
                this.store.logs[newDevice.id] = deviceLogs;
            } catch (e) {
                console.error("Could not parse legacy logs");
            }
        }

        if (adminNumber) {
          this.store.globalSettings.adminNumber = adminNumber;
        }

        const completedStepsJson = await AsyncStorage.getItem('completedSteps');
        if (completedStepsJson) {
          try {
            this.store.globalSettings.completedSteps = JSON.parse(completedStepsJson);
          } catch (e) {
            console.error("Could not parse completed steps");
            this.store.globalSettings.completedSteps = [];
          }
        }

        await this.saveStore();
      }
    } catch (error) {
      console.error('Failed to migrate legacy data:', error);
    }
  }
    // Method to create backup
    public async createBackup(): Promise<string> {
        return JSON.stringify(this.store);
    }

    // Method to restore from backup
    public async restoreFromBackup(data: string): Promise<void> {
        this.store = JSON.parse(data);
        await this.saveStore();
    }
}

export default DataStore;