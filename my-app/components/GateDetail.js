// components/GateDetail.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, Dimensions, SafeAreaView, Image, ScrollView, 
  ActivityIndicator, TouchableOpacity, Alert 
} from 'react-native';
import { getFirestore, collection, onSnapshot, doc, updateDoc, getDoc, deleteField } from 'firebase/firestore';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { TabView, TabBar } from 'react-native-tab-view';
import Toast from 'react-native-toast-message';

const GateDetail = ({ route, navigation }) => {
  const { gateId } = route.params;
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
  const [gateData, setGateData] = useState(null);
  const lastAlertRef = useRef(null);
  const [usersToOverrule, setUsersToOverrule] = useState([]);
  const exitingCheckedRef = useRef(false);

  const db = getFirestore();
  const storage = getStorage();
  const checkAllUsersProcessed = () => {
    if (Object.keys(userData).length == 0) return false;
    console.log("Checking scan status for all users:");
    const userEntries = Object.entries(userData);
    for (let i = 0; i < userEntries.length; i++) {
      const [userId, user] = userEntries[i];
      console.log(`User ID: ${userId} | Scan Status: ${user.scan_status || 'Empty/Undefined'}`);
      
      if (!user.scan_status || user.scan_status === '') {
        console.log(`User ${userId} is not processed yet - returning false immediately`);
        return false; // Return immediately upon finding an unprocessed user
      }
    }
    return true;
  };
  useEffect(() => {
    if (!gateId) {
      console.log("No gate ID provided");
      return;
    }

    console.log(`Loading details for gate: ${gateId}`);

    // Get the gate data first
    const fetchGateData = async () => {
      try {
        const gateRef = doc(db, 'gates', gateId);
        const gateSnapshot = await getDoc(gateRef);
        
        if (gateSnapshot.exists()) {
          setGateData({
            id: gateSnapshot.id,
            ...gateSnapshot.data()
          });
          console.log(`Gate data loaded for ${gateId}`);
        } else {
          console.log(`Gate ${gateId} not found in 'gates' collection, checking root`);
          
          // Try to get from root collection if it doesn't exist in gates/
          const rootGateRef = doc(db, gateId);
          const rootGateSnapshot = await getDoc(rootGateRef);
          
          if (rootGateSnapshot.exists()) {
            setGateData({
              id: rootGateSnapshot.id,
              ...rootGateSnapshot.data()
            });
            console.log(`Gate data loaded from root for ${gateId}`);
          } else {
            console.log(`No data found for gate ${gateId}`);
          }
        }
      } catch (error) {
        console.error(`Error fetching gate data: ${error}`);
      }
    };
    
    fetchGateData();

    // Now get the users for this gate
    const usersCollectionRef = collection(db, `gates/${gateId}/users`);

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
        console.log('current_image:',docData.current_image)
        console.log('left_iris:',docData.left_iris)
        setImageUrls({});
        setCurrentImageUrls({});
        setLeftIrisImageUrls({});
        setRightIrisImageUrls({});

        if (docData.passport_image) {
          imagePromises.push(fetchImageUrl(doc.id, docData.passport_image, setImageUrls));
        }
        if (docData.current_image) {
          console.log('current_image exist')
          imagePromises.push(fetchImageUrl(doc.id, docData.current_image, setCurrentImageUrls));
        }
        if (docData.left_iris) {
          imagePromises.push(fetchImageUrl(doc.id, docData.left_iris, setLeftIrisImageUrls));
        }
        if (docData.right_iris) {
          imagePromises.push(fetchImageUrl(doc.id, docData.right_iris, setRightIrisImageUrls));
        }
        

        return { key: doc.id, title: doc.id };
      });

      setUserData(data);
      setRoutes(newRoutes);
      await Promise.all(imagePromises);
      setLoading(false);
    });

    // Listen for realtime updates to the gate document
    const gateUnsubscribe = onSnapshot(doc(db, 'gates', gateId), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        setGateData({
          id: docSnapshot.id,
          ...docSnapshot.data()
        });
        if (data.alerts && data.alerts.trim() !== '' && data.alerts !== lastAlertRef.current) {
          console.log(data.alerts, lastAlertRef.current);
          Toast.show({
            type: 'error', // or 'success', 'info'
            text1: '🚨 Gate Alert',
            text2: data.alerts,
            position: 'top', // 'top' | 'bottom'
        visibilityTime: 10000, // auto dismiss after 10     S                                ch seconds
          });
          console.log('Gate Alert:', data.alerts);
          if (data.alerts.includes('[error] manual authentication for')) {
            try {
              const userListMatch = data.alerts.match(/\[(.*?)\]/g);
              if (userListMatch && userListMatch.length > 1) {
                const userListStr = userListMatch[1].replace('[', '').replace(']', '');
                const usersList = userListStr.split(',').map(user => user.trim());
                setUsersToOverrule(usersList);
                console.log('Users requiring manual authentication:', usersList);
                console.log('Users requiring manual authentication:', usersList);
              }
            } catch (error) {
              console.error('Error parsing alert message:', error);
            }
          }
          lastAlertRef.current = data.alerts; // prevent repeat
        }   
      }
    });

    return () => {
      unsubscribe();
      gateUnsubscribe();
    };
  }, [gateId, db]);

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

  const confirmFrontFlap = (action) => {
    Alert.alert(
      `${action ? 'Open' : 'Close'} Front Flap`,
      `Are you sure you want to ${action ? 'open' : 'close'} the front flap?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes', onPress: () => updatefrontflap(action) },
      ],
      { cancelable: true }
    );
  };
  
  const confirmBackFlap = (action) => {
    Alert.alert(
      `${action ? 'Open' : 'Close'} Back Flap`,
      `Are you sure you want to ${action ? 'open' : 'close'} the back flap?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes', onPress: () => updatebackflap(action) },
      ],
      { cancelable: true }
    );
  };

  const updatefrontflap = async (action) => {
    try {
      const userRef = doc(db, `gates/${gateId}`);
      // await updateDoc(userRef, {
      //   front_flap: action, 
      // });
      if(action){
        await updateDoc(userRef, {
          front_flap: action, 
          status: 'entering', 
        });
      }
      else{
        await updateDoc(userRef, {
          front_flap: action, 
          status: 'entered', 
        }); 
      }
      
  
      console.log(`${action ? 'Open' : 'Close'} front flap`);
    } catch (error) {
      console.error('Error updating front flap action', error);
    }
  };
  
  const updatebackflap = async (action) => {
    try {
      const userRef = doc(db, `gates/${gateId}`);
      
      if(!action & gateData.status === 'exiting'){
        await updateDoc(userRef, {
          status: 'exited',
        });
      }
      else{
        await updateDoc(userRef, {
          back_flap: action,
        });
      }
      
      console.log(`${action ? 'Open' : 'Close'} back flap`);
    } catch (error) {
      console.error('Error updating back flap action', error);
    }
  };

  const updatetilt = async (action) =>{
    try{
      const userRef = doc(db, `gates/${gateId}`);
  
      await updateDoc(userRef, {
        to_tilt: true, 
        tilt_mode: action, 
      });
    } catch (error){
      
    }
  }
  const handleExiting = async () => {
    try {
      console.log("All users processed, initiating exit sequence");
      
      // Now db and gateId are in scope
      const gateRef = doc(db, `gates/${gateId}`);
      console.log("Creating reference to path:", `gates/${gateId}`);
      await updateDoc(gateRef, {
        status: 'exiting',
        back_flap: true,
        timestamp: deleteField(),
      });
      console.log("Firestore update successful!");
      // Show success toast
      Toast.show({
        type: 'info',
        text1: 'Exit Sequence Initiated',
        text2: 'All users processed, gate will begin exit sequence',
        position: 'top',
        visibilityTime: 3000,
      });
      
      console.log("Exit sequence initiated for gate:", gateId);
      
      // Mark as checked to prevent multiple calls
      exitingCheckedRef.current = true;
    } catch (error) {
      console.error('Error initiating exit sequence:', error);
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      // Reset the flag if there was an error
      exitingCheckedRef.current = false;
      Toast.show({
        type: 'error',
        text1: 'Exit Sequence Failed',
        text2: 'Could not initiate exit sequence',
        position: 'top',
        visibilityTime: 3000,
      });
    }
  };
  const overruleUser = async (userId) => {
    try {
      const userRef = doc(db, `gates/${gateId}/users`, userId);
      
      // Confirm before overruling
      Alert.alert(
        "Manual Authentication Override",
        `Are you sure you want to manually authenticate user: ${userId}?`,
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Confirm", 
            onPress: async () => {
              await updateDoc(userRef, {
                scan_status: "Manually Approved",
                override: true,
                override_timestamp: new Date().toISOString()
              });

              console.log(`User ${userId} manually authenticated`);
              
              // Remove this user from the overrule list
              setUsersToOverrule(prev => prev.filter(id => id !== userId));
              
              // Show success toast
              Toast.show({
                type: 'success',
                text1: 'Override Successful',
                text2: `User ${userId} has been manually authenticated`,
                position: 'top',
                visibilityTime: 3000,
              });
              
              console.log(`User ${userId} manually authenticated`);
            }
            
          }
        ]
      );
    } catch (error) {
      console.error('Error overriding user authentication:', error);
      
      Toast.show({
        type: 'error',
        text1: 'Override Failed',
        text2: `Could not authenticate user ${userId}`,
        position: 'top',
        visibilityTime: 3000,
      });
    }
    
  };
  useEffect(() => {
    console.log("🔍 useEffect for userData triggered");
    
    // Skip on first render or when empty
    if (Object.keys(userData).length === 0) {
      console.log("⚠️ userData is empty, skipping check");
      return;
    }
    
    // Don't run check if we've already initiated exiting
    if (exitingCheckedRef.current) {
      console.log("⚠️ Exit already initiated (exitingCheckedRef.current = true), skipping check");
      return;
    }
    
    console.log("📊 userData changed, checking if all users are processed");
    console.log("🧾 Current userData:", JSON.stringify(userData));
    
    const allProcessed = checkAllUsersProcessed();
    console.log("✅ All users processed check result:", allProcessed);
    
    if (allProcessed) {
      console.log("🚪 All users processed, calling handleExiting()");
      handleExiting();
    } else {
      console.log("⏳ Not all users processed yet, waiting for updates");
    }
  }, [userData]);

  const renderScene = ({ route }) => {
    const user = userData[route.key];

    if (!user) return <Text style={styles.errorText}>No user data available</Text>;

    const imageUrl = imageUrls[route.key] || null;
    const currentImageUrl = currentImageUrls[route.key] || null;
    const leftIrisImageUrl = leftIrisImageUrls[route.key] || null;
    const rightIrisImageUrl = rightIrisImageUrls[route.key] || null;
    const isImageLoading = imageLoading[route.key];
    const showOverruleButton = usersToOverrule.includes(route.key);

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
                {renderdobDataRow('Date of Birth', user?.dob, '[Age: ', user?.age, ']')}
                {renderDataRow('Approved', user?.scan_status)}
                {showOverruleButton && (
                  <TouchableOpacity 
                    style={styles.overruleButton}
                    onPress={() => overruleUser(route.key)}
                  >
                    <Text style={styles.overruleButtonText}>Overrule</Text>
                  </TouchableOpacity>
                )}
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
                  <Image 
                    source={{ uri: leftIrisImageUrl }} 
                    style={[
                      styles.irisImage, 
                      { transform: [{ scaleX: -1 }] }  // This flips the image horizontally
                    ]} 
                    resizeMode="cover" 
                  />
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
                  <Image 
                    source={{ uri: rightIrisImageUrl }} 
                    style={[
                      styles.irisImage, 
                      { transform: [{ scaleX: -1 }] }  // This flips the image horizontally
                    ]} 
                    resizeMode="cover" 
                  />
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
  const renderdobDataRow = (label, value, separator, additionalValue, suffix) => (
    <View style={styles.dataRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>
        {value || 'N/A'}
        {value && additionalValue ? ` ${separator} ${additionalValue} ${suffix}` : ''}
      </Text>
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
  
  // Display information about the gate if no users are available
  if (routes.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
        </TouchableOpacity>
        
        <View style={styles.noUserContainer}>
          <Text style={styles.gateTitle}>{gateId}</Text>
          {gateData ? (
            <View style={styles.gateInfoContainer}>
              <Text style={styles.gateInfoTitle}>Gate Information</Text>
              {gateData.height_sensor !== undefined && (
                <Text style={styles.gateInfoText}>Height Sensor: {gateData.height_sensor}</Text>
              )}
              {gateData.front_flap !== undefined && (
                <Text style={styles.gateInfoText}>Front Flap: {gateData.front_flap ? 'Active' : 'Inactive'}</Text>
              )}
              {gateData.back_flap !== undefined && (
                <Text style={styles.gateInfoText}>Back Flap: {gateData.back_flap ? 'Active' : 'Inactive'}</Text>
              )}
              {gateData.people !== undefined && (
                <Text style={styles.gateInfoText}>People Detected: {gateData.people ? 'Yes' : 'No'}</Text>
              )}
            </View>
          ) : (
            <Text style={styles.noUserText}>Gate information not available</Text>
          )}
          <Text style={styles.noUserText}>No users found for this gate</Text>
        </View>
      </SafeAreaView>
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
                      confirmFrontFlap(true);
                      console.log('Open Front Flapper');
                    }}
                  >
                    <Text style={styles.rowButtonText}>Open</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.rowButton, styles.buttonRight]} 
                    onPress={() => {
                      confirmFrontFlap(false);
                      console.log('Close Front Flapper');
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
                      confirmBackFlap(true);
                      console.log('Open Back Flapper');
                    }}
                  >
                    <Text style={styles.rowButtonText}>Open</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.rowButton, styles.buttonRight]} 
                    onPress={() => {
                      confirmBackFlap(false);
                      console.log('Close Back Flapper');
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
                    style={[styles.rowButton, styles.buttonTiltLeft]} 
                    onPress={() => {
                      updatetilt('low');
                      console.log('tilt down');
                    }}
                  >
                    <Text style={styles.rowButtonText}>Tilt down</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.rowButton, styles.buttonTiltCenter]} 
                    onPress={() => {
                      updatetilt('original');
                      console.log('original');
                    }}
                  >
                    <Text style={styles.rowButtonText}>Original</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.rowButton, styles.buttonTiltRight]} 
                    onPress={() => {
                      updatetilt('high');
                      console.log('tilt up');
                    }}
                  >
                    <Text style={styles.rowButtonText}>Tilt Up</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

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
  buttonTiltLeft: {
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
    marginRight: 5,
  },
  buttonTiltCenter: {
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
  },
  buttonTiltRight: {
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
    marginLeft: 5,
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
overruleButton: {
  backgroundColor: '#FF5722',
  padding: 8,
  borderRadius: 4,
  marginTop: 10,
  alignItems: 'center',
},
overruleButtonText: {
  color: 'white',
  fontWeight: 'bold',
  fontSize: 14,
},

});

export default GateDetail;