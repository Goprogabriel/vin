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
import AsyncStorage from '@react-native-async-storage/async-storage';

// Reusable Card component
const Card = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

// Reusable SectionTitle component
const SectionTitle = ({ children }) => (
  <Text style={styles.sectionTitle}>{children}</Text>
);

// Reusable PrimaryButton component
const PrimaryButton = ({ children, onPress, disabled, loading }) => (
  <TouchableOpacity
    style={[styles.primaryButton, disabled && styles.buttonDisabled]}
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.8}
  >
    <Text style={styles.primaryButtonText}>
      {loading ? 'Behandler...' : children}
    </Text>
  </TouchableOpacity>
);
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { auth } from '../firebaseConfig';

const WelcomeScreen = () => {
  // Navigation support
  const navigation = typeof useNavigation === 'function' ? useNavigation() : null;
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
        // Log ind med email og password
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Gem brugeren i AsyncStorage for at bevare login-status
        try {
          await AsyncStorage.setItem('user', JSON.stringify({
            uid: user.uid,
            email: user.email
          }));
          console.log("User saved to AsyncStorage");
        } catch (storageError) {
          console.error("Error saving user to AsyncStorage:", storageError);
        }
        
        // Når brugeren logger ind, sikrer vi os også, at de har en bruger i Firestore
        const userId = user.uid;
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
            <SectionTitle>
              {isSignUp ? 'Opret ny bruger' : 'Log ind på din konto'}
            </SectionTitle>
          </View>

          <Card style={styles.formCard}>
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
                placeholderTextColor="#BFAFA3"
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
                placeholderTextColor="#BFAFA3"
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
                  placeholderTextColor="#BFAFA3"
                />
              </View>
            )}

            <PrimaryButton
              onPress={handleAuth}
              disabled={loading}
              loading={loading}
            >
              {isSignUp ? 'Opret bruger' : 'Log ind'}
            </PrimaryButton>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => setIsSignUp(!isSignUp)}
              activeOpacity={0.8}
            >
              <Text style={styles.switchButtonText}>
                {isSignUp
                  ? 'Har du allerede en konto? Log ind'
                  : 'Har du ikke en konto? Opret bruger'
                }
              </Text>
            </TouchableOpacity>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F6F3', // off-white beige
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'stretch',
    padding: 24,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 36,
  },
  heading: {
    fontSize: 32,
    fontWeight: '700',
    color: '#7B1F2B', // deep wine red
    marginBottom: 6,
    letterSpacing: 1,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#BFAFA3', // muted beige
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#FFF9F5', // soft beige
    borderRadius: 18,
    padding: 22,
    shadowColor: '#7B1F2B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#F2E6D8',
  },
  formCard: {
    marginBottom: 0,
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 16,
    color: '#7B1F2B',
    marginBottom: 7,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  input: {
    borderWidth: 1,
    borderColor: '#BFAFA3',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#F8F6F3',
    color: '#7B1F2B',
    marginBottom: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F2E6D8',
    marginVertical: 18,
    borderRadius: 1,
  },
  primaryButton: {
    backgroundColor: '#7B1F2B',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#7B1F2B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryButtonText: {
    color: '#FFF9F5',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  switchButton: {
    alignItems: 'center',
    padding: 12,
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#F2E6D8',
    marginTop: 2,
    shadowColor: '#BFAFA3',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  switchButtonText: {
    color: '#7B1F2B',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2
  }
});

export default WelcomeScreen;
