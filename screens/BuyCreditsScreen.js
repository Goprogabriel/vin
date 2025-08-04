import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Image
} from 'react-native';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { collection, addDoc } from 'firebase/firestore';
import { auth } from '../firebaseConfig';

const BuyCreditsScreen = ({ navigation }) => {
  const [credits, setCredits] = useState(0);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [packages, setPackages] = useState([
    { id: 'credits_50', amount: 50, price: '29 kr', popular: false },
    { id: 'credits_100', amount: 100, price: '49 kr', popular: true },
    { id: 'credits_200', amount: 200, price: '89 kr', popular: false },
  ]);
  
  React.useEffect(() => {
    // Fetch user credits
    fetchUserCredits();
  }, []);
  
  const fetchUserCredits = async () => {
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
      }
    } catch (error) {
      console.error("Fejl ved hentning af credits:", error);
      Alert.alert("Fejl", "Kunne ikke hente dine credits");
    }
  };
  
  // RevenueCat integration fjernet midlertidigt
  
  const handlePackageSelect = (pkg) => {
    setSelectedPackage(pkg);
  };
  
  const handlePurchase = async () => {
    if (!selectedPackage) {
      Alert.alert("Vælg en pakke", "Vælg venligst en credit pakke først");
      return;
    }
    
    try {
      // I en ægte implementation ville vi håndtere betalingen her
      // Dette er bare en simulering uden faktisk betalingsbehandling
      
      // Simulerer et succesfuldt køb
      Alert.alert(
        "Køb simuleret",
        `Du har købt ${selectedPackage.amount} credits!`,
        [{ text: "OK", onPress: () => updateUserCredits(selectedPackage.amount) }]
      );
    } catch (error) {
      console.error("Køb fejlede:", error);
      Alert.alert("Fejl", "Der opstod en fejl ved køb af credits");
    }
  };
  
  const updateUserCredits = async (amount, revenueCatInfo = {}) => {
    try {
      const db = getFirestore();
      const userId = auth.currentUser?.uid;
      const userRef = doc(db, "users", userId);

      // Opdater credits på bruger
      await updateDoc(userRef, {
        credits: credits + amount
      });

      setCredits(credits + amount);
      Alert.alert("Succes", `${amount} credits er tilføjet til din konto!`);

      // Opret log i Firestore for købet
      await addDoc(collection(db, "creditPurchases"), {
        userId,
        creditsBought: amount,
        timestamp: new Date(),
        packageId: selectedPackage?.id || null,
        price: selectedPackage?.price || null,
        // revenueCatInfo fjernet
      });
    } catch (error) {
      console.error("Fejl ved opdatering af credits eller log:", error);
      Alert.alert("Fejl", "Kunne ikke opdatere dine credits eller logge købet");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Køb Credits</Text>
        <View style={styles.creditsContainer}>
          <Text style={styles.creditsTitle}>Dine credits</Text>
          <Text style={styles.creditsValue}>{credits}</Text>
        </View>
        <Text style={styles.sectionTitle}>Vælg en pakke</Text>
        {packages.map((pkg) => (
          <TouchableOpacity
            key={pkg.id}
            style={[
              styles.packageCard,
              selectedPackage?.id === pkg.id && styles.selectedPackageCard,
              pkg.popular && styles.popularPackageCard
            ]}
            onPress={() => handlePackageSelect(pkg)}
            activeOpacity={0.7}
          >
            {pkg.popular && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>Populær</Text>
              </View>
            )}
            <View style={styles.packageHeader}>
              <Text style={styles.packageTitle}>{pkg.amount} credits</Text>
              <Text style={styles.packagePrice}>{pkg.price}</Text>
            </View>
            <Text style={styles.packageDescription}>
              Nok til ca. {Math.floor(pkg.amount / 15)} anbefalinger
            </Text>
            {selectedPackage?.id === pkg.id && (
              <View style={styles.checkmark}>
                <Text style={styles.checkmarkText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.purchaseButton, !selectedPackage && styles.disabledButton]}
          onPress={handlePurchase}
          disabled={!selectedPackage}
          activeOpacity={0.7}
        >
          <Text style={styles.purchaseButtonText}>{selectedPackage ? `Køb ${selectedPackage.amount} credits for ${selectedPackage.price}` : 'Vælg en pakke'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>Tilbage</Text>
        </TouchableOpacity>
        <Text style={styles.disclaimer}>
          Dette er en demo version. I den endelige app vil køb blive behandlet via App Store/Google Play.
        </Text>
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
  creditsContainer: {
    backgroundColor: '#F2E6D8',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
    marginBottom: 24,
    alignItems: 'center',
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
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#888',
  },
  packageCard: {
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
  selectedPackageCard: {
    borderColor: '#8B0000',
    borderWidth: 2,
    backgroundColor: '#FFF8F8',
  },
  popularPackageCard: {
    borderColor: '#D2691E',
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  packageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1C1C',
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8B0000',
  },
  packageDescription: {
    fontSize: 15,
    color: '#555',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 10,
    backgroundColor: '#D2691E',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  popularBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
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
  purchaseButton: {
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
  purchaseButtonText: {
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
  disclaimer: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
});

export default BuyCreditsScreen;
