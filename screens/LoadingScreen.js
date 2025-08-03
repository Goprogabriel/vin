import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { getFirestore, collection, addDoc, Timestamp, getDocs, query, where, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth } from '../firebaseConfig';

export default function LoadingScreen({ navigation, route }) {
  const { mealData, uploadedImageUrls } = route.params || {};
  const [requestId, setRequestId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  useEffect(() => {
    if (!mealData || !uploadedImageUrls) {
      Alert.alert('Fejl', 'Ingen måltidsdata fundet');
      navigation.navigate('Main');
      return;
    }
    createUserAndSaveMeal();
  }, []);
  
  // Listen for updates to the recommendation request
  useEffect(() => {
    if (!requestId) return;
    
    const db = getFirestore();
    const requestRef = doc(db, 'recommendationRequests', requestId);
    
    const unsubscribe = onSnapshot(requestRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.status === 'completed' && data.recommendationId) {
          // Recommendation is ready, navigate to results screen
          navigation.replace('RecommendationResult', { recommendationId: data.recommendationId });
        } else if (data.status === 'error') {
          Alert.alert('Fejl', 'Der opstod en fejl ved behandling af din anbefaling: ' + (data.error || 'Ukendt fejl'));
          navigation.navigate('Main');
        }
      }
    });
    
    return () => unsubscribe();
  }, [requestId]);

  // Helper: create user in Firestore if not exists
  const createUserIfNotExists = async (userId) => {
    try {
      console.log("Checking if user exists in Firestore:", userId);
      const db = getFirestore();
      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);
      
      console.log("User exists in Firestore:", userDocSnap.exists());
      
      if (!userDocSnap.exists()) {
        console.log("Creating new user in Firestore with ID:", userId);
        await setDoc(userDocRef, {
          uid: userId,
          credits: 30,
          createdAt: Timestamp.now(),
        });
        console.log("User created successfully!");
      } else {
        console.log("User already exists, no need to create");
      }
    } catch (error) {
      console.error("Error in createUserIfNotExists:", error);
      throw error;
    }
  };
  
  // Opret user og gem måltid
  const createUserAndSaveMeal = async () => {
    try {
      const userId = auth.currentUser?.uid || 'anonymous';
      console.log("Current userId:", userId); // Log userId til debugging
      
      if (userId === 'anonymous') {
        Alert.alert('Login påkrævet', 'Du skal være logget ind for at gemme måltider');
        navigation.navigate('Main');
        return;
      }
      
      try {
        await createUserIfNotExists(userId);
        console.log("User check/create completed"); // Bekræft at brugeroprettelse er forsøgt
      } catch (userError) {
        console.error("Fejl ved brugeroprettelse:", userError);
        throw userError;
      }
      
      await saveMealToFirestore(userId);
    } catch (error) {
      console.error("Samlet fejl:", error); // Mere detaljeret fejllog
      Alert.alert('Fejl', 'Kunne ikke oprette bruger: ' + error.message);
      navigation.navigate('Main');
    }
  };
  const saveMealToFirestore = async (userId) => {
    try {
      const db = getFirestore();
      setIsProcessing(true);
      
      // 1. Save the meal data
      const completeData = {
        ...mealData,
        images: uploadedImageUrls,
        userId: userId,
        createdAt: Timestamp.now()
      };
      
      const mealRef = await addDoc(collection(db, 'meals'), completeData);
      console.log("Meal saved with ID:", mealRef.id);
      
      // 2. Create a recommendation request
      if (mealData.recommendationType) {
        const requestData = {
          userId,
          mealData,
          imageUrls: uploadedImageUrls,
          recommendationType: mealData.recommendationType,
          credits: mealData.credits || 0,
          status: 'pending',
          createdAt: Timestamp.now(),
          mealId: mealRef.id
        };
        
        const requestRef = await addDoc(collection(db, 'recommendationRequests'), requestData);
        console.log("Recommendation request created with ID:", requestRef.id);
        
        // Store the request ID to monitor its status
        setRequestId(requestRef.id);
      } else {
        // No recommendation requested, go back to main
        Alert.alert('Succes', 'Måltidet er gemt!');
        navigation.navigate('Main');
      }
    } catch (error) {
      console.error("Fejl ved gemning af måltid:", error);
      Alert.alert('Fejl', 'Kunne ikke gemme måltidet: ' + error.message);
      navigation.navigate('Main');
    }
  };
  
  // Choose message based on recommendation type
  const getLoadingMessage = () => {
    if (!mealData || !mealData.recommendationType) return 'Gemmer måltid...';
    
    switch (mealData.recommendationType) {
      case 'simple':
        return 'Finder den perfekte vin til din mad...';
      case 'standard':
        return 'Analyserer dine retter for den bedste vinpasning...';
      case 'detailed':
        return 'Skaber en detaljeret vinanbefaling til dig...';
      default:
        return 'Gemmer måltid...';
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <ActivityIndicator size="large" color="#8B0000" />
      <Text style={styles.text}>{getLoadingMessage()}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  text: {
    marginTop: 20,
    fontSize: 18,
    color: '#8B0000',
    fontWeight: '600',
  },
});
