// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar, View, Text, Dimensions } from 'react-native';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import Toast from 'react-native-toast-message';
import GatesDashboard from './components/GatesDashboard';
import GateDetail from './components/GateDetail';

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDc3qxRx6i28a_tY3bMB0tXWK3jM7MUo-g",
  authDomain: "capstone-sal.firebaseapp.com",
  projectId: "capstone-sal",
  storageBucket: "capstone-sal.firebasestorage.app",
  messagingSenderId: "506687469413",
  appId: "1:506687469413:web:661076c64cf63e6197138c",
  measurementId: "G-YPD0ZE5W55"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Create a stack navigator
const Stack = createStackNavigator();

// Custom toast configuration
const toastConfig = {
  error: ({ text1, text2, props, ...rest }) => {
    const { width } = Dimensions.get('window');
    
    return (
      <View 
        style={{
          width: width,
          backgroundColor: 'red',
          padding: 15,
          marginTop: 10,
        }}
      >
        <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
          {text1}
        </Text>
        {text2 && (
          <Text style={{ color: 'white', fontSize: 14, marginTop: 5 }}>
            {text2}
          </Text>
        )}
      </View>
    );
  },
  // You can keep the default styles for other toast types if needed
};

// Main App component with navigation
export default function App() {
  React.useEffect(() => {
  }, []);
  return (
    <>
      <NavigationContainer>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <Stack.Navigator initialRouteName="Dashboard">
          <Stack.Screen 
            name="Dashboard" 
            component={GatesDashboard} 
            options={{ title: 'Gates Dashboard' }} 
          />
          <Stack.Screen 
            name="Gate" 
            component={GateDetail} 
            options={({ route }) => ({ title: route.params?.gateId || 'Gate Details' })} 
          />
        </Stack.Navigator>
      </NavigationContainer>

      {/* Toast with custom configuration */}
      <Toast config={toastConfig} />
    </>
  );
}