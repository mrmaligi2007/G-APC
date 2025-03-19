// utils/debugTools.ts
import DataStore from './DataStore';
import { safeGetItem } from './storageUtils';
import { Alert } from 'react-native';

// Log the entire store for debugging
export const debugDataStore = async () => {
  try {
    const dataStore = DataStore.getInstance();
    const storeData = dataStore.getStore();
    console.log('=== DataStore Debug Info ===');
    console.log(storeData);
    return true
  } catch (error) {
    console.error('DataStore Debug Error:', error);
    return false
  }
};

// Log all AsyncStorage keys and values
export const debugAsyncStorage = async () => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    console.log('=== AsyncStorage Debug Info ===');
    console.log('Keys:', allKeys);

    for (const key of allKeys) {
      const value = await safeGetItem(key); // Use safeGetItem
      console.log(`Key: ${key}, Value: ${value}`);
    }
  } catch (error) {
    console.error('AsyncStorage Debug Error:', error);
  }
};

// Clear all AsyncStorage data (use with caution!)
export const clearAllAsyncStorage = async () => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(allKeys);
    console.log('AsyncStorage cleared successfully.');
    Alert.alert('Success', 'AsyncStorage cleared successfully.');
  } catch (error) {
    console.error('Error clearing AsyncStorage:', error);
    Alert.alert('Error', 'Failed to clear AsyncStorage.');
  }
};

// Export functions
export default {
    debugDataStore,
    debugAsyncStorage,
    clearAllAsyncStorage
};