// utils/storageUtils.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Validates a key for AsyncStorage.  Keys must be non-empty strings.
 * @param key The key to validate.
 * @returns The original key if valid, or null if invalid.
 */
export const validateKey = (key: any): string | null => {
  if (typeof key === 'string' && key.trim() !== '') {
    return key;
  }
  console.error('Invalid AsyncStorage key:', key);
  return null;
};

/**
 * Safely gets an item from AsyncStorage, handling JSON parsing and errors.
 */
export const safeGetItem = async (key: string, defaultValue: string = 'null'): Promise<string | null> => {
  const validKey = validateKey(key);
  if (!validKey) return null;

  try {
    const item = await AsyncStorage.getItem(validKey);
    return item !== null ? item : defaultValue;
  } catch (error) {
    console.error(`Error getting item "${key}":`, error);
    return null;
  }
};

/**
 * Safely sets an item in AsyncStorage, handling JSON stringification and errors.
 */
export const safeSetItem = async (key: string, value: any): Promise<boolean> => {
  const validKey = validateKey(key);
  if (!validKey) return false;

  try {
    const valueToStore = typeof value === 'string' ? value : JSON.stringify(value);
    await AsyncStorage.setItem(validKey, valueToStore);
    return true;
  } catch (error) {
    console.error(`Error setting item "${key}":`, error);
    return false;
  }
};

/**
 * Safely removes an item from AsyncStorage.
 */
export const safeRemoveItem = async (key: string): Promise<boolean> => {
  const validKey = validateKey(key);
  if (!validKey) return false;

  try {
    await AsyncStorage.removeItem(validKey);
    return true;
  } catch (error) {
    console.error(`Error removing item "${key}":`, error);
    return false;
  }
};

/**
 * Safely removes multiple items from AsyncStorage.
 */
 export const safeMultiRemove = async (keys: string[]): Promise<boolean> => {
    if (!Array.isArray(keys)) {
      console.error('Invalid keys array for multiRemove:', keys);
      return false;
    }

    const validKeys = keys.filter(key => typeof key === 'string');
    if (validKeys.length === 0) return false;

    try {
      await AsyncStorage.multiRemove(validKeys);
      return true;
    } catch (error) {
      console.error('Error removing multiple items:', error);
      return false;
    }
  };

export default {
  safeGetItem,
  safeSetItem,
  safeRemoveItem,
  safeMultiRemove,
  validateKey,
};