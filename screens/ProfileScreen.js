import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { auth } from '../firebaseConfig';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../AuthContext';

export default function ProfileScreen({ navigation }) {
  const { logout } = useAuth();
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          console.log('No user is signed in');
          setLoading(false);
          return;
        }

        const db = getFirestore();
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          setUserInfo(userDoc.data());
        } else {
          console.log('No such document!');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      Alert.alert('Logget ud', 'Du er nu logget ud.');
      // Always redirect to WelcomeScreen after logout
      navigation.reset({
        index: 0,
        routes: [{ name: 'Welcome' }],
      });
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Fejl', 'Kunne ikke logge ud: ' + error.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#7B1F2B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profil</Text>
      
      {userInfo && (
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>Email: {auth.currentUser?.email}</Text>
          <Text style={styles.infoText}>Credits: {userInfo.credits || 0}</Text>
        </View>
      )}
      
      <TouchableOpacity style={styles.createMealButton} onPress={() => navigation.navigate('CreateMeal')}>
        <Text style={styles.createMealButtonText}>Opret ny anbefaling</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Log ud</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F6F3',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 30,
    color: '#7B1F2B',
  },
  infoContainer: {
    backgroundColor: '#FFF9F5',
    width: '100%',
    padding: 20,
    borderRadius: 18,
    marginBottom: 30,
    shadowColor: '#7B1F2B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F2E6D8',
  },
  infoText: {
    fontSize: 16,
    color: '#7B1F2B',
    marginBottom: 10,
  },
  createMealButton: {
    backgroundColor: '#7B1F2B',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 30,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  createMealButtonText: {
    color: '#FFF9F5',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  logoutButton: {
    backgroundColor: '#7B1F2B',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 30,
    alignItems: 'center',
    width: '100%',
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
