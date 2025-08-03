import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { auth } from '../firebaseConfig';

const WelcomeScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  // Opret bruger i Firestore efter Auth registrering
  const createUserInFirestore = async (userId) => {
    try {
      console.log("Creating user in Firestore with ID:", userId);
      const db = getFirestore();
      const userDocRef = doc(db, 'users', userId);
      
      // Tjek først om brugeren allerede findes
      const userDocSnap = await getDoc(userDocRef);
      
      if (!userDocSnap.exists()) {
        // Opret brugerprofil med standardindstillinger
        await setDoc(userDocRef, {
          uid: userId,
          credits: 30,
          createdAt: Timestamp.now(),
        });
        console.log("User created in Firestore successfully!");
        return true;
      } else {
        console.log("User already exists in Firestore");
        return false;
      }
    } catch (error) {
      console.error("Error creating user in Firestore:", error);
      throw error;
    }
  };

  const handleAuth = async () => {
    if (!email || !password || (isSignUp && !confirmPassword)) {
      Alert.alert('Fejl', 'Indtast venligst email og begge password-felter');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      Alert.alert('Fejl', 'De to passwords matcher ikke');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        // Opret bruger i Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const userId = userCredential.user.uid;
        
        // Opret bruger i Firestore med samme userId
        await createUserInFirestore(userId);
        
        Alert.alert('Succes', 'Bruger oprettet succesfuldt!');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        
        // Når brugeren logger ind, sikrer vi os også, at de har en bruger i Firestore
        const userId = auth.currentUser.uid;
        await createUserInFirestore(userId);
      }
    } catch (error) {
      let errorMessage = 'Der opstod en fejl';
      
      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = 'Ugyldig email adresse';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Brugerkonto er deaktiveret';
          break;
        case 'auth/user-not-found':
          errorMessage = 'Bruger ikke fundet';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Forkert password';
          break;
        case 'auth/email-already-in-use':
          errorMessage = 'Email er allerede i brug';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password er for svagt';
          break;
        default:
          errorMessage = error.message;
      }
      
      Alert.alert('Fejl', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.headerContainer}>
            <Text style={styles.heading}>Velkommen</Text>
            <Text style={styles.sectionLabel}>
              {isSignUp ? 'Opret ny bruger' : 'Log ind på din konto'}
            </Text>
          </View>

          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Indtast din email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor="#888"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Indtast dit password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor="#888"
              />
            </View>
            {isSignUp && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Gentag password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Gentag dit password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  placeholderTextColor="#888"
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleAuth}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Behandler...' : (isSignUp ? 'Opret bruger' : 'Log ind')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => setIsSignUp(!isSignUp)}
              activeOpacity={0.7}
            >
              <Text style={styles.switchButtonText}>
                {isSignUp
                  ? 'Har du allerede en konto? Log ind'
                  : 'Har du ikke en konto? Opret bruger'
                }
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'stretch',
    padding: 16,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1C',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 16,
    color: '#888',
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: '#F2E6D8',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#8B0000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    color: '#1C1C1C',
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#1C1C1C',
  },
  button: {
    backgroundColor: '#8B0000',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginVertical: 8,
    width: '100%',
    shadowColor: '#8B0000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  switchButton: {
    alignItems: 'center',
    padding: 10,
    width: '100%',
  },
  switchButtonText: {
    color: '#D2691E',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default WelcomeScreen;
