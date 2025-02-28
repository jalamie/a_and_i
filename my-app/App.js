import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, Dimensions, SafeAreaView, Image, ScrollView, ActivityIndicator, TouchableOpacity 
} from 'react-native';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
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
  const [imageLoading, setImageLoading] = useState({});
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (!gateName) return;

    const usersCollectionRef = collection(db, `gates/${gateName}/users`);

    const unsubscribe = onSnapshot(usersCollectionRef, async (snapshot) => {
      setLoading(true);
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

        return { key: doc.id, title: `User ${i + 1}` };
      });

      setUserData(data);
      setRoutes(newRoutes);
      await Promise.all(imagePromises);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [gateName]);

  const fetchImageUrl = async (userId, imagePath, setImageState) => {
    try {
      setImageLoading(prev => ({ ...prev, [userId]: true }));
      const imageRef = ref(storage, imagePath);
      const url = await getDownloadURL(imageRef);
      setImageState(prev => ({ ...prev, [userId]: url }));
      setImageLoading(prev => ({ ...prev, [userId]: false }));
    } catch (error) {
      console.error(`Error fetching image for ${userId}:`, error);
      setImageLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const updateTilt = async (userId, direction) => {
    try {
      const userRef = doc(db, `gates/${gateName}/users`, userId);  // 🔹 Reference to the user's Firestore document
  
      await updateDoc(userRef, {
        tilt: direction,  // 🔹 Update the "tilt" field
      });
  
      console.log(`Tilt ${direction} command sent for user: ${userId}`);
    } catch (error) {
      console.error('Error updating tilt direction:', error);
    }
  };

  const updatefrontflap = async (action) => {
    try {
      const userRef = doc(db, `gates/${gateName}`);  // 🔹 Reference to the user's Firestore document
  
      await updateDoc(userRef, {
        front_flap: action, 
      });
  
      console.log(`close front flap`);
    } catch (error) {
      console.error('Error updating front flap action', error);
    }
  };
  const updatebackflap = async (action) => {
    try {
      const userRef = doc(db, `gates/${gateName}`);  // 🔹 Reference to the user's Firestore document
  
      await updateDoc(userRef, {
        back_flap: action, 
      });
    } catch (error) {
      console.error('Error updating back flap action', error);
    }
  };

  const renderScene = ({ route }) => {
    const user = userData[route.key];

    if (!user) return <Text style={styles.errorText}>No user data available</Text>;

    const imageUrl = imageUrls[route.key] || null;
    const currentImageUrl = currentImageUrls[route.key] || null;
    const leftIrisImageUrl = leftIrisImageUrls[route.key] || null;
    const rightIrisImageUrl = rightIrisImageUrls[route.key] || null;
    const isImageLoading = imageLoading[route.key];

    return (
          <ScrollView style={styles.scene} contentContainerStyle={styles.scrollContent}>
            <View style={styles.cardWrapper}>
            <View style={styles.card}>
              {/* Profile section with image on left, text on right */}
              <View style={styles.profileSection}>
                {/* Profile Image on the left */}
                <View style={styles.profileImageContainer}>
                  {isImageLoading ? (
                    <ActivityIndicator size="large" color="#6200ee" />
                  ) : imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.profileImage} resizeMode="cover" />
                  ) : (
                    <Text style={styles.noImageText}>No Image Available</Text>
                  )}
                  <Text style={styles.imageCaption}>Profile Image</Text>
                </View>
                
                {/* User info on the right */}
                <View style={styles.userInfoContainer}>
                  {renderDataRow('Name', user?.name)}
                  {renderDataRow('Passport Number', user?.passport_no)}
                  {renderDataRow('Approved', user?.scan_status)}
                </View>
              </View>
              
              {/* Current Image */}
              <View style={styles.imagesRow}>
              <View style={styles.currentImageContainer}>
                  {isImageLoading ? (
                    <ActivityIndicator size="large" color="#6200ee" />
                  ) : currentImageUrl ? (
                    <Image source={{ uri: currentImageUrl }} style={styles.currentImage} resizeMode="cover" />
                  ) : (
                    <Text style={styles.noImageText}>No Image Available</Text>
                  )}
                  <Text style={styles.imageCaption}>Current Image</Text>
                </View>
    
              {/* Current image below profile with left and right iris on sides */}
                {/* Left Iris */}
                <View style={styles.irisImageContainer}>
                  {isImageLoading ? (
                    <ActivityIndicator size="small" color="#6200ee" />
                  ) : leftIrisImageUrl ? (
                    <Image source={{ uri: leftIrisImageUrl }} style={styles.irisImage} resizeMode="cover" />
                  ) : (
                    <Text style={styles.noImageText}>No Image</Text>
                  )}
                  <Text style={styles.imageCaption}>Left Iris</Text>
                </View>
                
                {/* Right Iris */}
                <View style={styles.irisImageContainer}>
                  {isImageLoading ? (
                    <ActivityIndicator size="small" color="#6200ee" />
                  ) : rightIrisImageUrl ? (
                    <Image source={{ uri: rightIrisImageUrl }} style={styles.irisImage} resizeMode="cover" />
                  ) : (
                    <Text style={styles.noImageText}>No Image</Text>
                  )}
                  <Text style={styles.imageCaption}>Right Iris</Text>
                </View>
              </View>
            </View>
           </View> 
          </ScrollView>
        );
  };

  const renderDataRow = (label, value) => (
      <View style={styles.dataRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value || 'N/A'}</Text>
      </View>
    );
    
    const renderTabBar = props => (
      <TabBar
        {...props}
        style={styles.tabBar}
        indicatorStyle={styles.indicator}
        labelStyle={styles.tabLabel}
      />
    );
    
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text>Loading...</Text>
        </View>
      );
    }
    
    if (routes.length === 0) {
      return (
        <View style={styles.noUserContainer}>
          <Text style={styles.noUserText}>No users found</Text>
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
        {/* Actions Dropdown */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.dropdownButton} 
            onPress={toggleDropdown}
          >
            <Text style={styles.dropdownButtonText}>
              Actions {dropdownOpen ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>
          
          {dropdownOpen && (
            <View style={styles.dropdownContent}>
              {/* Flapper controls - side by side */}
              <View style={styles.buttonRow}>
                <View style={styles.buttonGroup}>
                  <Text style={styles.buttonGroupTitle}>Front Flapper</Text>
                  <View style={styles.buttonGroupRow}>
                  <TouchableOpacity 
                    style={[styles.rowButton, styles.buttonLeft]} 
                    onPress={() => {
                      updatefrontflap(true);
                      console.log('Open Front Flapper');
                    }}
                  >
                    <Text style={styles.rowButtonText}>Open</Text>
                  </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.rowButton, styles.buttonRight]} 
                      onPress={() => {
                        updatefrontflap(false);
                        console.log('CLose Front Flapper');
                      }}
                    >
                      <Text style={styles.rowButtonText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.buttonGroup}>
                  <Text style={styles.buttonGroupTitle}>Back Flapper</Text>
                  <View style={styles.buttonGroupRow}>
                    <TouchableOpacity 
                      style={[styles.rowButton, styles.buttonLeft]} 
                      onPress={() => {
                        updatebackflap(true);
                        console.log('Open Back Flapper');
                      }}
                    >
                      <Text style={styles.rowButtonText}>Open</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.rowButton, styles.buttonRight]} 
                      onPress={() => {
                        updatebackflap(false);
                        console.log('Open Back Flapper');
                      }}
                    >
                      <Text style={styles.rowButtonText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              
              {/* Tilt controls - side by side */}
              <View style={styles.buttonRow}>
                <View style={styles.buttonGroup}>
                  <Text style={styles.buttonGroupTitle}>Tilt Controls</Text>
                  <View style={styles.buttonGroupRow}>
                    <TouchableOpacity 
                      style={[styles.rowButton, styles.buttonLeft]} 
                      onPress={() => console.log('Tilt Up')}
                    >
                      <Text style={styles.rowButtonText}>Tilt Up</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.rowButton, styles.buttonRight]} 
                      onPress={() => console.log('Tilt Down')}
                    >
                      <Text style={styles.rowButtonText}>Tilt Down</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // marginTop: 20,
    width: '100%',
    backgroundColor: 'white',
  },
  cardWrapper: {
    width: '100%',
    alignItems: 'center', // Centers the card and actions
    marginBottom: 20, // Ensures space below the card
  },
  scene: {
    // flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
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
    flexWrap: 'wrap',
    // flex: 1,
    marginBottom: 20,
  },
  // Profile section with image on left and text on right
  profileSection: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  profileImageContainer: {
    width: '40%',
    aspectRatio: 3/4,
    marginRight: 16,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  userInfoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  // Row with current image in center and iris images on sides
  imagesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    
  },
  currentImageContainer: {
    width: '40%',
    aspectRatio: 3/4,
    marginRight: 16,
    marginBottom: 10,
  },
  currentImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  irisImageContainer: {
    width: '22%',
    aspectRatio: 1,
  },
  irisImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  // Shared styles
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
  imageCaption: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    color: '#333',
    flexWrap: 'wrap',
  },
  noImageText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    flexWrap: 'wrap',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noUserContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noUserText: {
    fontSize: 18,
    color: '#666',
  },
  // Actions dropdown styles
  actionsContainer: {
    width: '100%',
    // marginTop: 20,
    padding: 10,
    backgroundColor: '6200ee',
    borderTopWidth: 1,
    borderTopColor: 'white',
    position: 'relative', // ✅ This makes sure dropdownContent positions relative to this container
    marginBottom: 190, // ✅ Adds extra space for dropdown when opened
  },

  dropdownButton: {
    backgroundColor: '#6200ee',
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
  },

  dropdownContent: {
    position: 'absolute', // ✅ Makes dropdown appear **over** other content
    top: '100%', // ✅ Ensures dropdown appears **below** the button
    left: 0,
    right: 0,
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 10, // ✅ Ensures dropdown is **above** everything else
  },
  dropdownButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Button row styling
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  buttonGroup: {
    flex: 1,
    marginHorizontal: 5,
  },
  buttonGroupTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
    textAlign: 'center',
  },
  buttonGroupRow: {
    flexDirection: 'row',
    height: 40,
  },
  rowButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6200ee',
  },
  buttonLeft: {
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    marginRight: 1,
  },
  buttonRight: {
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    marginLeft: 1,
  },
  rowButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  actionButton: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionButtonText: {
    fontSize: 16,
    color: '#333',
  },
  text: {
    fontSize: 16,
    flexWrap: 'wrap', // Ensures text wraps inside its container
    overflow: 'hidden', // Prevents overflowing text
    paddingHorizontal: 5, // Adds spacing inside the text area
    paddingVertical: 3, // Prevents text from being too close to edges
    textAlign: 'left', // Ensures text is properly aligned
},

});
