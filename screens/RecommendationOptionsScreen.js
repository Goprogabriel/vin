import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert
} from 'react-native';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth } from '../firebaseConfig';

const RecommendationOptionsScreen = ({ navigation, route }) => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [credits, setCredits] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { mealData, uploadedImageUrls } = route.params || {};

  useEffect(() => {
    // Hent brugerens credits når skærmen indlæses
    fetchUserCredits();
  }, []);

  const fetchUserCredits = async () => {
    setIsLoading(true);
    try {
      const db = getFirestore();
      const userId = auth.currentUser?.uid;
      
      if (!userId) {
        Alert.alert("Fejl", "Du skal være logget ind for at fortsætte");
        navigation.goBack();
        return;
      }
      
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setCredits(userData.credits || 0);
      } else {
        // Opret bruger med 30 gratis credits, hvis brugeren ikke findes endnu
        await updateDoc(userRef, {
          credits: 30
        });
        setCredits(30);
      }
    } catch (error) {
      console.error("Fejl ved hentning af credits:", error);
      Alert.alert("Fejl", "Kunne ikke hente dine credits");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptionSelect = (option) => {
    setSelectedOption(option);
  };

  const handleContinue = async () => {
    if (!selectedOption) {
      Alert.alert("Vælg en mulighed", "Vælg venligst en type anbefaling");
      return;
    }

    let requiredCredits;
    switch (selectedOption) {
      case 'simple':
        requiredCredits = 10;
        break;
      case 'standard':
        requiredCredits = 15;
        break;
      case 'detailed':
        requiredCredits = 20;
        break;
    }

    if (credits < requiredCredits) {
      Alert.alert(
        "Ikke nok credits",
        `Du har ${credits} credits, men du skal bruge ${requiredCredits} credits til denne anbefaling.`,
        [
          { text: "Annuller", style: "cancel" },
          { text: "Køb credits", onPress: () => navigation.navigate("BuyCredits") }
        ]
      );
      return;
    }

    try {
      const db = getFirestore();
      const userId = auth.currentUser?.uid;
      const userRef = doc(db, "users", userId);
      
      // Opdater brugerens credits
      await updateDoc(userRef, {
        credits: credits - requiredCredits
      });
      
      // Fortsæt til loading-skærmen med anbefalings-niveau
      navigation.navigate('Loading', { 
        mealData: {
          ...mealData,
          recommendationType: selectedOption,
          credits: requiredCredits
        }, 
        uploadedImageUrls 
      });
      
    } catch (error) {
      console.error("Fejl ved brug af credits:", error);
      Alert.alert("Fejl", "Der opstod en fejl ved brug af dine credits");
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Indlæser dine credits...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Vælg anbefaling</Text>
        
        <View style={styles.creditsContainer}>
          <Text style={styles.creditsTitle}>Tilgængelige credits</Text>
          <Text style={styles.creditsValue}>{credits} credits</Text>
          <TouchableOpacity 
            style={styles.buyButton}
            onPress={() => navigation.navigate("BuyCredits")}
            activeOpacity={0.7}
          >
            <Text style={styles.buyButtonText}>Køb flere credits</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.sectionTitle}>Vælg type af vinanbefaling</Text>
        
        <TouchableOpacity
          style={[styles.optionCard, selectedOption === 'simple' && styles.selectedOptionCard]}
          onPress={() => handleOptionSelect('simple')}
          activeOpacity={0.7}
        >
          <View style={styles.optionHeader}>
            <Text style={styles.optionTitle}>Simpel anbefaling</Text>
            <View style={styles.priceBadge}>
              <Text style={styles.priceText}>10 credits</Text>
            </View>
          </View>
          <Text style={styles.optionDescription}>
            Få en enkel liste med vinflasker der passer til dit måltid
          </Text>
          {selectedOption === 'simple' && (
            <View style={styles.checkmark}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.optionCard, selectedOption === 'standard' && styles.selectedOptionCard]}
          onPress={() => handleOptionSelect('standard')}
          activeOpacity={0.7}
        >
          <View style={styles.optionHeader}>
            <Text style={styles.optionTitle}>Standard anbefaling</Text>
            <View style={styles.priceBadge}>
              <Text style={styles.priceText}>15 credits</Text>
            </View>
          </View>
          <Text style={styles.optionDescription}>
            Få vinflasker der passer til dit måltid og en forklaring på hvorfor de passer
          </Text>
          {selectedOption === 'standard' && (
            <View style={styles.checkmark}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.optionCard, selectedOption === 'detailed' && styles.selectedOptionCard]}
          onPress={() => handleOptionSelect('detailed')}
          activeOpacity={0.7}
        >
          <View style={styles.optionHeader}>
            <Text style={styles.optionTitle}>Grundig forklaring</Text>
            <View style={styles.priceBadge}>
              <Text style={styles.priceText}>20 credits</Text>
            </View>
          </View>
          <Text style={styles.optionDescription}>
            Alt fra standard anbefalingen plus fun facts om hver vinflaske til at imponere dine gæster
          </Text>
          {selectedOption === 'detailed' && (
            <View style={styles.checkmark}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.continueButton, !selectedOption && styles.disabledButton]}
          onPress={handleContinue}
          disabled={!selectedOption}
          activeOpacity={0.7}
        >
          <Text style={styles.continueButtonText}>
            {selectedOption ? `Fortsæt (Brug ${selectedOption === 'simple' ? 10 : selectedOption === 'standard' ? 15 : 20} credits)` : 'Vælg en mulighed'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>Tilbage</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    padding: 16,
    flexGrow: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#1C1C1C',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 12,
    color: '#888',
  },
  creditsContainer: {
    backgroundColor: '#F2E6D8',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#8B0000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  creditsTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1C',
    marginBottom: 8,
  },
  creditsValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8B0000',
    marginBottom: 12,
  },
  buyButton: {
    backgroundColor: '#D2691E',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  buyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    shadowColor: '#8B0000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedOptionCard: {
    borderColor: '#8B0000',
    borderWidth: 2,
    backgroundColor: '#FFF8F8',
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1C',
  },
  priceBadge: {
    backgroundColor: '#F2E6D8',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  priceText: {
    color: '#8B0000',
    fontWeight: '500',
    fontSize: 14,
  },
  optionDescription: {
    fontSize: 15,
    lineHeight: 22,
    color: '#555',
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#8B0000',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  continueButton: {
    backgroundColor: '#8B0000',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#8B0000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  backButton: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#8B0000',
  },
  backButtonText: {
    color: '#8B0000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#8B0000',
  },
});

export default RecommendationOptionsScreen;
