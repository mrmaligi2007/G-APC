import React, { createContext, useContext, useState, useCallback, useReducer, useEffect } from 'react';
import DataStore, { Device, User, LogEntry, GlobalSettings } from '../utils/DataStore'; // Correct path
import { safeExecute } from '../utils/errorUtils';

interface DataStoreContextProps {
-  store: AppData;  // Use the AppData interface
+  store: AppData;
  isLoading: boolean;
  refreshStore: () => Promise<void>;
  getDeviceById: (deviceId: string) => Device | undefined;
@@ -17,7 +16,7 @@

const DataStoreContext = createContext<DataStoreContextProps | undefined>(undefined);

-// Use a consistent interface for the entire store
+// Use the AppData interface from DataStore
interface AppData {
  devices: Device[];
  users: User[];
@@ -37,8 +36,8 @@
  const dataStore = DataStore.getInstance();
  const [store, dispatch] = useReducer(dataStoreReducer, initialState); // Use initial state here
  const [isLoading, setIsLoading] = useState(true);
-
-  // Initialize the DataStore when the component mounts
+    const isRefreshing = useRef(false);
+    
  useEffect(() => {
    const initializeDataStore = async () => {
       setIsLoading(true);
@@ -51,23 +50,26 @@
       }

    };
-    initializeDataStore();
-  }, []);
+     initializeDataStore();
+  }, [dataStore]);

  // Refresh the store data
  const refreshStore = useCallback(async () => {
-    setIsLoading(true);
-    try {
-      await dataStore.initialize();
-      dispatch({ type: 'SET_STORE', payload: dataStore.getStore() });
-    } catch (error) {
-      console.error('Failed to refresh store:', error);
-    } finally {
-      setIsLoading(false);
-    }
+      if (isRefreshing.current) return;
+        isRefreshing.current = true;
+        setIsLoading(true);
+        try {
+            await dataStore.initialize();
+            dispatch({ type: 'SET_STORE', payload: dataStore.getStore() });
+        } catch (error) {
+        console.error('Failed to refresh store:', error);
+        } finally {
+        setIsLoading(false);
+         isRefreshing.current = false; 
+        }
  }, [dataStore]);

-  // Memoized methods to prevent unnecessary re-renders
+ // Memoized methods to prevent unnecessary re-renders
  const getDeviceById = useCallback((deviceId: string) => {
    return store.devices.find(d => d.id === deviceId);
  }, [state.devices]);