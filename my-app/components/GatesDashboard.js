// components/GatesDashboard.js
import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, SafeAreaView 
} from 'react-native';
import { getFirestore, collection, onSnapshot, doc, query } from 'firebase/firestore';

const GatesDashboard = ({ navigation }) => {
  const [gates, setGates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const db = getFirestore();

  // Set up timer for updating the current time
  useEffect(() => {
    // Update time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setLoading(true);
    console.log("Setting up real-time gates listener...");
    
    // Set up a direct listener for the gates collection
    const gatesQuery = query(collection(db, 'gates'));
    
    const unsubscribe = onSnapshot(gatesQuery, (snapshot) => {
      // Process the snapshot directly instead of calling fetchGates
      const gatesMap = new Map();
      
      // Handle added or modified documents
      snapshot.docChanges().forEach((change) => {
        const gateDoc = change.doc;
        const gateId = gateDoc.id;
        const gateData = gateDoc.data();
        
        console.log(`Gate ${gateId} ${change.type}`);
        
        if (change.type === 'added' || change.type === 'modified') {
          // Update our local state with the latest data
          gatesMap.set(gateId, {
            id: gateId,
            ...gateData,
            maxHeight: gateData.height_sensor || 0,
            timestamp: gateData.timestamp ? gateData.timestamp.toDate() : null
          });
        }
      });
      
      // For the initial load, populate the gates map with all documents
      if (loading) {
        snapshot.forEach(doc => {
          const gateId = doc.id;
          const gateData = doc.data();
          
          // Only add if not already processed in docChanges
          if (!gatesMap.has(gateId)) {
            gatesMap.set(gateId, {
              id: gateId,
              ...gateData,
              maxHeight: gateData.height_sensor || 0,
              timestamp: gateData.timestamp ? gateData.timestamp.toDate() : null
            });
          }
        });
      }
      
      // Update state if we have changes
      if (gatesMap.size > 0) {
        setGates(prevGates => {
          // Create a new map with all existing gates
          const updatedGatesMap = new Map(
            prevGates.map(gate => [gate.id, gate])
          );
          
          // Update with new/modified gates
          gatesMap.forEach((gate, id) => {
            updatedGatesMap.set(id, gate);
          });
          
          // Convert back to array
          return Array.from(updatedGatesMap.values());
        });
      }
      
      // Also handle removals
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'removed') {
          const gateId = change.doc.id;
          console.log(`Gate ${gateId} removed`);
          
          setGates(prevGates => 
            prevGates.filter(gate => gate.id !== gateId)
          );
        }
      });
      
      setLoading(false);
    }, (error) => {
      console.error("Error listening to gates collection:", error);
      setLoading(false);
    });
    
    // Set up listeners for each gate's users subcollection
    // This would need to be implemented based on your data structure
    // For example, you might want to listen to the most recent user for each gate
    
    return () => {
      console.log("Cleaning up gates listener");
      unsubscribe();
    };
  }, []);

  // Calculate usage time in minutes and seconds
  const calculateUsageTime = (timestamp) => {
    if (!timestamp) return '0:00';
    
    // Use the currentTime state value instead of creating a new Date
    const diffMs = currentTime - timestamp;
    
    // Calculate minutes and seconds
    const totalSeconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    // Format as MM:SS with leading zeros for seconds
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Determine gate color based on usage time
  const getGateColor = (timestamp) => {
    if (!timestamp) return 'white';
    
    // Use the currentTime state value instead of creating a new Date
    const diffMs = currentTime - timestamp;
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (totalMinutes > 5) return '#FFEB3B'; // Yellow for > 5 minutes
    return '#4CAF50'; // Green for active but < 5 minutes
  };

  const handleGatePress = (gate) => {
    // Navigate to the gate detail view
    navigation.navigate('Gate', { gateId: gate.id });
  };

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Loading gates...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        
        <View style={styles.gatesGrid}>
          {gates.length > 0 ? (
            gates.map(gate => (
              <TouchableOpacity
                key={gate.id}
                style={[
                  styles.gateCard,
                  { backgroundColor: getGateColor(gate.timestamp) }
                ]}
                onPress={() => handleGatePress(gate)}
              >
                <Text style={styles.gateTitle}>{gate.id}</Text>
                {gate.timestamp ? (
                  <>
                    <Text style={styles.gateInfo}>
                      Usage time: {calculateUsageTime(gate.timestamp)} minutes
                    </Text>
                    <Text style={styles.gateInfo}>
                      Max height: {gate.maxHeight}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.gateInfo}>Not in use</Text>
                )}
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.noGatesText}>No gates found in the database</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    margin: 16,
    backgroundColor: '#f5f5f5',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 10,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  gatesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gateCard: {
    width: '48%',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  gateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  gateInfo: {
    fontSize: 14,
    marginBottom: 4,
  },
  noGatesText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    padding: 20,
    width: '100%'
  }
});

export default GatesDashboard;