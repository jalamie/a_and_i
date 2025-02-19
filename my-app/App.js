import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, SafeAreaView, Image,ScrollView } from 'react-native';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot } from 'firebase/firestore';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';

// Firebase configuration remains the same
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
  const [userData, setUserData] = useState({}); // New state to store user data
  const [imageUrls, setImageUrls] = useState({});
  const [currentimageUrls, setCurrentImageUrls] = useState({});
  const [fetchLeftIrisImageUrls, setLeftIrisImageUrls] = useState({});
  const [fetchRightIrisImageUrls, setRightIrisImageUrls] = useState({});

  useEffect(() => {
    if (!gateName) return;
  
    const usersCollectionRef = collection(db, `gates/${gateName}/users`);
  
    const unsubscribe = onSnapshot(usersCollectionRef, (snapshot) => {
      if (snapshot.empty) {
        console.log('No documents found in Firestore!');
        setRoutes([]);
        return;
      }
  
      const data = {};
      const newRoutes = snapshot.docs.map((doc, i) => {
        const docData = doc.data();
        data[doc.id] = docData; // Store the full document data
        // If document has an image path, fetch the URL
        console.log('Passport image path:', docData.passport_image);
        if (docData.passport_image) {
          console.log('passport_image: ',docData.passport_image)
          fetchPassportImageUrl(doc.id, docData.passport_image);
        }
        if (docData.current_image) {
          console.log('passport_image: ',docData.current_image)
          fetchCurrentImageUrl(doc.id, docData.current_image);
        }
        if (docData.left_iris) {
          console.log('passport_image: ',docData.left_iris)
          fetchLeftIrisImageUrl(doc.id, docData.left_iris);
        }
        if (docData.right_iris) {
          console.log('passport_image: ',docData.right_iris)
          fetchRightIrisImageUrl(doc.id, docData.right_iris);
        }
        return {
          key: doc.id,
          title: `User ${i + 1}`,
        };
      });
  
      setUserData(data); // Store the user data
      setRoutes(newRoutes);
    });
  
    return () => unsubscribe();
  }, [gateName]);

  const fetchPassportImageUrl = async (userId, imagePath) => {
    try {
        console.log('Starting to fetch image for user:', userId);
        console.log('Image path:', imagePath);
        
        const imageRef = ref(storage, imagePath);
        const url = await getDownloadURL(imageRef);
        
        console.log('Successfully got passport URL:', url);
        
        setImageUrls(prev => ({
            ...prev,
            [userId]: url
        }));
    } catch (error) {
        console.error("Error fetching image URL:", error);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
    }
};

const fetchCurrentImageUrl = async (userId, imagePath) => {
  try {
      console.log('Starting to fetch image for user:', userId);
      console.log('Image path:', imagePath);
      
      const imageRef = ref(storage, imagePath);
      const url = await getDownloadURL(imageRef);
      
      console.log('Successfully got passport URL:', url);
      
      setCurrentImageUrls(prev => ({
          ...prev,
          [userId]: url
      }));
  } catch (error) {
      console.error("Error fetching image URL:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
  }
};

const fetchLeftIrisImageUrl = async (userId, imagePath) => {
  try {
      console.log('Starting to fetch image for user:', userId);
      console.log('Image path:', imagePath);
      
      const imageRef = ref(storage, imagePath);
      const url = await getDownloadURL(imageRef);
      
      console.log('Successfully got left iris URL:', url);
      
      setLeftIrisImageUrls(prev => ({
          ...prev,
          [userId]: url
      }));
  } catch (error) {
      console.error("Error fetching image URL:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
  }
};
const fetchRightIrisImageUrl = async (userId, imagePath) => {
  try {
      console.log('Starting to fetch image for user:', userId);
      console.log('Image path:', imagePath);
      
      const imageRef = ref(storage, imagePath);
      const url = await getDownloadURL(imageRef);
      
      console.log('Successfully got right iris URL:', url);
      
      setRightIrisImageUrls(prev => ({
          ...prev,
          [userId]: url
      }));
  } catch (error) {
      console.error("Error fetching image URL:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
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
    const currentImageUrl = currentimageUrls[route.key];
    const leftIrisImageUrl = fetchLeftIrisImageUrls[route.key];
    const rightIrisImageUrl = fetchRightIrisImageUrls[route.key];
    
    return (
      <ScrollView style={styles.scene} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          {renderDataRow('Name', user?.name)}
          {renderDataRow('Passport Number', user?.passport_no)}
          
          {/* Image Section with loading state */}
          <View style={styles.imageSection}>
            <Text style={styles.imageTitle}>Profile Image</Text>
            <View style={styles.imageContainer}>
              {imageUrl ? (
                <Image 
                  source={{ uri: imageUrl }}
                  style={styles.image}
                  resizeMode="cover"
                  onError={(e) => console.log('Image loading error:', e.nativeEvent.error)}
                  // Add loading indicator
                  onLoadStart={() => console.log('Image loading started')}
                  onLoadEnd={() => console.log('Image loading finished')}
                />
              ) : (
                <Text style={styles.loadingText}>Loading image...</Text>
              )}
            </View>
          </View>
          <View style={styles.imageSection}>
          <Text style={styles.imageTitle}>Current Image</Text>
            <View style={styles.imageContainer}>
              {currentImageUrl ? (
                <Image 
                  source={{ uri: currentImageUrl }}
                  style={styles.image}
                  resizeMode="cover"
                  onError={(e) => console.log('Image loading error:', e.nativeEvent.error)}
                  // Add loading indicator
                  onLoadStart={() => console.log('Image loading started')}
                  onLoadEnd={() => console.log('Image loading finished')}
                />
              ) : (
                <Text style={styles.loadingText}>Loading image...</Text>
              )}
            </View>
          </View>
          <View style={styles.imageSection}>
            <Text style={styles.imageTitle}>Left Iris</Text>
            <View style={styles.imageContainer}>
              {leftIrisImageUrl ? (
                <Image 
                  source={{ uri: leftIrisImageUrl }}
                  style={styles.image}
                  resizeMode="cover"
                  onError={(e) => console.log('Image loading error:', e.nativeEvent.error)}
                  // Add loading indicator
                  onLoadStart={() => console.log('Image loading started')}
                  onLoadEnd={() => console.log('Image loading finished')}
                />
              ) : (
                <Text style={styles.loadingText}>Loading image...</Text>
              )}
            </View>
          </View>
          <View style={styles.imageSection}>
            <Text style={styles.imageTitle}>Right Iris</Text>
            <View style={styles.imageContainer}>
              {rightIrisImageUrl ? (
                <Image 
                  source={{ uri: rightIrisImageUrl }}
                  style={styles.image}
                  resizeMode="cover"
                  onError={(e) => console.log('Image loading error:', e.nativeEvent.error)}
                  // Add loading indicator
                  onLoadStart={() => console.log('Image loading started')}
                  onLoadEnd={() => console.log('Image loading finished')}
                />
              ) : (
                <Text style={styles.loadingText}>Loading image...</Text>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderTabBar = props => (
    <TabBar
      {...props}
      style={styles.tabBar}
      indicatorStyle={styles.indicator}
      labelStyle={styles.label}
    />
  );

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
  scene: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
    width: '100%',
},
imageTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
},
imageContainer: {
    width: '100%',
    aspectRatio: 4/5, // This maintains a consistent aspect ratio
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    overflow: 'hidden',
},
image: {
    width: '100%',
    height: '100%',
},
});