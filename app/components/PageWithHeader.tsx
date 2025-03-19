 import React, { ReactNode } from 'react';
 import { View, StyleSheet } from 'react-native';
-import { useTheme } from '../contexts/ThemeContext';
 import { StandardHeader } from './StandardHeader';
 
 interface PageWithHeaderProps {
@@ -13,11 +12,9 @@
   } | null;
 }
 
-export const PageWithHeader: React.FC<PageWithHeaderProps> = ({
+export const PageWithHeader: React.FC<PageWithHeaderProps> = ({ // Removed dynamic theme application here
   children,
   title,
   showBack = false,
   backTo,
   onBackPress,
   rightAction
-}) => {
-  const { colors } = useTheme();
-  
+}) => {  
   return (
-    <View style={[styles.container, { backgroundColor: colors.background }]}>
+    <View style={styles.container}>
       <StandardHeader
         title={title}
         showBack={showBack}
       />
       <View style={styles.content}>
         {children}
      </View>
    </View>
  );
};

 const styles = StyleSheet.create({
   container: {
     flex: 1,
+    backgroundColor: colors.background, // Moved to theme.ts
   },
   content: {
     flex: 1,