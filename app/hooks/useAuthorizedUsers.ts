// app/hooks/useAuthorizedUsers.ts
import { useState, useEffect, useCallback } from 'react';
import { useDataStore } from '../contexts/DataStoreContext';
import { User } from '../utils/DataStore';

export const useAuthorizedUsers = (deviceId?: string) => {
  const { store, getDeviceUsers, addUser, updateUser, authorizeUserForDevice, deleteUser, deauthorizeUserForDevice } = useDataStore();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    if (!deviceId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const deviceUsers = getDeviceUsers(deviceId);
      setUsers(deviceUsers);
    } catch (e) {
      setError('Failed to load users');
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [deviceId, getDeviceUsers]);


  // Load users whenever the deviceId changes.
  useEffect(() => {
    if (deviceId) {
      loadUsers();
    } else {
      setUsers([]); // Clear users if no deviceId
      setIsLoading(false);
    }
  }, [deviceId, loadUsers]);


  // Add a saveUsers function
  const saveUsers = useCallback(async (updatedUsers: User[]) => {
      if (!deviceId) {
        setError("No device selected");
        return false;
      }
      try {
        // First, add any users that don't exist yet
        for (const user of updatedUsers) {
          if (!user.id || user.id.startsWith('new_')) {
            const newUser = await addUser({
              name: user.name,
              phoneNumber: user.phoneNumber,
              serialNumber: user.serialNumber,
              startTime: user.startTime,
              endTime: user.endTime
            });
            if (newUser) {
              await authorizeUserForDevice(deviceId, newUser.id);
            }
          } else {
            await updateUser(user.id, user);
          }
        }
        
        // Then, get a list of all users supposed to be authorized for this device.
        const currentDeviceUsers = getDeviceUsers(deviceId);

        // Find any users that were removed
        const usersToRemove = currentDeviceUsers.filter(currentUser => 
          !updatedUsers.some(updatedUser => updatedUser.id === currentUser.id)
        );

        // Deauthorize removed users
        for (const userToRemove of usersToRemove) {
          await deauthorizeUserForDevice(deviceId, userToRemove.id);
          // Optionally, delete the user if not associated with other devices.
          // This is complex logic, and you might want to handle this at a higher level.
        }
        
        await loadUsers(); // Refresh users
        return true;
      } catch (error) {
        console.error('Failed to save users:', error);
        setError('Failed to save users');
        return false;
      }
  }, [deviceId, addUser, authorizeUserForDevice, updateUser, loadUsers, getDeviceUsers]);


  return {
    users,
    setUsers,
    isLoading,
    error,
    deviceId,
    loadUsers,
    saveUsers
  };
};

export default useAuthorizedUsers;