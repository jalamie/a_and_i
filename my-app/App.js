import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, SafeAreaView, Image, ScrollView, ActivityIndicator } from 'react-native';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot } from 'firebase/firestore';
import { TabView, TabBar } from 'react-native-tab-view';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';

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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const gateName = 'sal2';

export default function App() {
  const [index, setIndex] = useState(0);
  const [routes, setRoutes] = useState([]);
  const [userData, setUserData] = useState({});
  const [imageUrls, setImageUrls] = useState({});
  const [currentImageUrls, setCurrentImageUrls] = useState({});
  const [leftIrisImageUrls, setLeftIrisImageUrls] = useState({});
  const [rightIrisImageUrls, setRightIrisImageUrls] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gateName) return;

    const usersCollectionRef = collection(db, `gates/${gateName}/users`);

    const unsubscribe = onSnapshot(usersCollectionRef, async (snapshot) => {
      if (snapshot.empty) {
        console.log('No users found!');
        setRoutes([]);
        setLoading(false);
        return;
      }

      const data = {};
      const imagePromises = [];

      const newRoutes = snapshot.docs.map((doc, i) => {
        const docData = doc.data();
        data[doc.id] = docData;

        if (docData.passport_image) {
          imagePromises.push(fetchImageUrl(doc.id, docData.passport_image, setImageUrls));
        }
        if (docData.current_image) {
          imagePromises.push(fetchImageUrl(doc.id, docData.current_image, setCurrentImageUrls));
        }
        if (docData.left_iris) {
          imagePromises.push(fetchImageUrl(doc.id, docData.left_iris, setLeftIrisImageUrls));
        }
        if (docData.right_iris) {
          imagePromises.push(fetchImageUrl(doc.id, docData.right_iris, setRightIrisImageUrls));
        }

        return {
          key: doc.id,
          title: `User ${i + 1}`,
        };
      });

      setUserData(data);
      setRoutes(newRoutes);

      // Wait for all images to finish loading before updating UI
      await Promise.all(imagePromises);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [gateName]);

  const fetchImageUrl = async (userId, imagePath, setImageState) => {
    try {
      const imageRef = ref(storage, imagePath);
      const url = await getDownloadURL(imageRef);
      setImageState(prev => ({ ...prev, [userId]: url }));
    } catch (error) {
      console.error(`Error fetching image for ${userId}:`, error);
    }
  };

  const renderDataRow = (label, value) => (
    <View style={styles.dataRow}>
      <Text style={styles.label}>{label}:</Text>
      <Text style={styles.value}>{value || 'N/A'}</Text>
    </View>
  );

  const renderScene = ({ route }) => {
    const user = userData[route.key];
    const imageUrl = imageUrls[route.key];
    const currentImageUrl = currentImageUrls[route.key];
    const leftIrisImageUrl = leftIrisImageUrls[route.key];
    const rightIrisImageUrl = rightIrisImageUrls[route.key];

    return (
      <ScrollView style={styles.scene} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          {renderDataRow('Name', user?.name)}
          {renderDataRow('Passport Number', user?.passport_no)}

          {/* Profile Image */}
          {renderImageSection('Profile Image', imageUrl)}

          {/* Current Image */}
          {renderImageSection('Current Image', currentImageUrl)}

          {/* Left Iris Image */}
          {renderImageSection('Left Iris', leftIrisImageUrl)}

          {/* Right Iris Image */}
          {renderImageSection('Right Iris', rightIrisImageUrl)}
        </View>
      </ScrollView>
    );
  };

  const renderImageSection = (title, imageUrl) => (
    <View style={styles.imageSection}>
      <Text style={styles.imageTitle}>{title}</Text>
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <ActivityIndicator size="large" color="#6200ee" />
        )}
      </View>
    </View>
  );

  const renderTabBar = props => (
    <TabBar {...props} style={styles.tabBar} indicatorStyle={styles.indicator} labelStyle={styles.tabLabel} />
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: Dimensions.get('window').width }}
        renderTabBar={renderTabBar}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scene: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 50,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dataRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  value: {
    flex: 2,
    fontSize: 16,
    color: '#666',
  },
  tabBar: {
    backgroundColor: '#6200ee',
    height: 48,
  },
  indicator: {
    backgroundColor: 'white',
  },
  tabLabel: {
    color: 'white',
    fontSize: 14,
    textTransform: 'none',
  },
  imageSection: {
    marginTop: 16,
  },
  imageTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 4 / 5,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
