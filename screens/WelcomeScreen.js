import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  FlatList,
  Dimensions,
} from 'react-native';
import { getFirestore, doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { auth } from '../firebaseConfig';

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

const SLIDES = [
  {
    emoji: '🥂',
    title: 'Find den perfekte vin',
    desc: 'Appen hjælper dig med at finde den vin,\nder passer bedst til dit måltid –\nbaseret på både mad og dine egne vine.'
  },
  {
    emoji: '📸',
    title: 'Brug dine egne flasker',
    desc: 'Tag et billede af din vinreol –\nappen genkender flaskerne\nog matcher dem med maden.'
  },
  {
    emoji: '🍽️',
    title: 'Tilpasset din menu',
    desc: 'Udfyld hvad du skal spise –\nfra forret til dessert –\nog få personlige vinforslag.'
  },
  {
    emoji: '🧠',
    title: 'Lær lidt undervejs',
    desc: 'Få små fun facts om vinene,\nog bliv klogere\nmens du nyder dem.'
  },
];

const { width } = Dimensions.get('window');

const WelcomeScreen = () => {
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const createUserInFirestore = async (userId) => {
    try {
      const db = getFirestore();
      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);
      if (!userDocSnap.exists()) {
        await setDoc(userDocRef, {
          uid: userId,
          credits: 30,
          createdAt: Timestamp.now(),
        });
      }
    } catch (error) {
      console.error("Error creating user in Firestore:", error);
    }
  };

  const handleAnonymousAuth = async () => {
    setLoading(true);
    try {
      const userCredential = await signInAnonymously(auth);
      const userId = userCredential.user.uid;
      await createUserInFirestore(userId);
      Alert.alert('Succes', 'Du er nu startet anonymt!');
    } catch (error) {
      Alert.alert('Fejl', error.message || 'Kunne ikke starte anonymt');
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = (e) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  };

  const goToNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current.scrollToIndex({ index: currentIndex + 1 });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.introContainer}>
            <View style={[styles.slide, { width }]}> 
              <View style={styles.slideContentCentered}>
                <Text style={styles.slideEmoji}>{SLIDES[currentIndex].emoji}</Text>
                <Text style={styles.slideTitle}>{SLIDES[currentIndex].title}</Text>
                <Text style={styles.slideDesc}>{SLIDES[currentIndex].desc}</Text>
              </View>
            </View>
            <View style={styles.dotsContainerFixed}>
              {SLIDES.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, currentIndex === i && styles.dotActive]}
                />
              ))}
            </View>
            <TouchableOpacity
              style={styles.nextButtonFixed}
              onPress={currentIndex === SLIDES.length - 1 ? handleAnonymousAuth : () => setCurrentIndex(currentIndex + 1)}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>
                {loading
                  ? 'Behandler...'
                  : currentIndex === SLIDES.length - 1
                    ? 'Tryk her for at begynde!'
                    : 'Næste'}
              </Text>
            </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  slideContentCentered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 0,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F6F3', // off-white beige
  },
  introContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  slideContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  nextButtonFixed: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: '#BFAFA3',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginHorizontal: 40,
    alignSelf: 'center',
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  slideEmoji: {
    fontSize: 54,
    marginBottom: 18,
  },
  slideTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#7B1F2B',
    marginBottom: 10,
    textAlign: 'center',
  },
  slideDesc: {
    fontSize: 16,
    color: '#6B5C4B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    width: '90%',
    alignSelf: 'center',
  },
  nextButton: {
    backgroundColor: '#BFAFA3',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 32,
    marginTop: 10,
  },
  nextButtonText: {
    color: '#7B1F2B',
    fontWeight: '700',
    fontSize: 16,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#BFAFA3',
    marginHorizontal: 5,
    opacity: 0.5,
  },
  dotActive: {
    backgroundColor: '#7B1F2B',
    opacity: 1,
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
  startButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 10,
    paddingHorizontal: 40,
  },
  startButtonText: {
    color: '#7B1F2B',
    fontSize: 22,
    fontWeight: '700',
  },
  primaryButtonText: {
    color: '#FFF9F5',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default WelcomeScreen;
