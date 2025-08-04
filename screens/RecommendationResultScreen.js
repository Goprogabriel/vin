import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { auth } from '../firebaseConfig';

export default function RecommendationResultScreen({ navigation, route }) {
  // Remove header title in navigation bar
  React.useLayoutEffect(() => {
    navigation.setOptions({ headerTitle: '', headerLeft: () => null });
  }, [navigation]);
  const { recommendationId } = route.params || {};
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mealData, setMealData] = useState(null);

  useEffect(() => {
    if (!recommendationId) {
      Alert.alert('Fejl', 'Ingen anbefalings-ID fundet');
      navigation.navigate('Main');
      return;
    }
    fetchRecommendation();
  }, []);

  const fetchRecommendation = async () => {
    try {
      const db = getFirestore();
      const recommendationRef = doc(db, 'recommendations', recommendationId);
      const recommendationSnap = await getDoc(recommendationRef);
      if (recommendationSnap.exists()) {
        const recData = recommendationSnap.data();
        setRecommendation(recData);
        // Hent mealData fra meals collection via mealId
        if (recData.mealId) {
          const mealRef = doc(db, 'meals', recData.mealId);
          const mealSnap = await getDoc(mealRef);
          if (mealSnap.exists()) {
            setMealData(mealSnap.data());
          }
        } else if (recData.mealData) {
          setMealData(recData.mealData); // fallback hvis mealId ikke findes
        }
      } else {
        Alert.alert('Fejl', 'Kunne ikke finde anbefalingen');
        navigation.navigate('Main');
      }
    } catch (error) {
      console.error("Fejl ved hentning af anbefaling:", error);
      Alert.alert('Fejl', 'Kunne ikke hente anbefalingen: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderWineMatch = (wine, index) => {
    return (
      <View key={index} style={styles.wineCard}>
        <Text style={styles.wineName}>{wine.name}</Text>
        {wine.year && <Text style={styles.wineDetail}>Årgang: {wine.year}</Text>}
        {wine.type && <Text style={styles.wineDetail}>Type: {wine.type}</Text>}
        {wine.region && <Text style={styles.wineDetail}>Region: {wine.region}</Text>}
        {wine.grape && <Text style={styles.wineDetail}>Druer: {wine.grape}</Text>}
        {/* Vis hvilket måltid vinen anbefales til */}
        {(wine.coursePairing || wine.course || wine.courseType) && (
          <Text style={styles.wineMealBadge}>
            Anbefales til: {wine.coursePairing || wine.course || wine.courseType}
          </Text>
        )}
        {wine.explanation && (
          <View style={styles.explanationBox}>
            <Text style={styles.explanationTitle}>Hvorfor denne vin passer:</Text>
            <Text style={styles.explanationText}>{wine.explanation}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderDetails = () => {
    if (!recommendation) return null;
    const { recommendationType, wines, overallExplanation, courses } = recommendation;
    return (
      <View style={styles.resultContainer}>
        <Text style={styles.resultTitle}>Din Vinanbefaling</Text>
        {recommendationType === 'detailed' && overallExplanation && (
          <View style={styles.overallExplanationBox}>
            <Text style={styles.overallExplanationTitle}>Samlet vurdering</Text>
            <Text style={styles.overallExplanationText}>{overallExplanation}</Text>
          </View>
        )}
        <Text style={styles.sectionTitle}>Anbefalede vine</Text>
        {Array.isArray(wines) && wines.map((wine, index) => renderWineMatch(wine, index))}
        {/* Vis brugerens egne måltidsdata hvis tilgængelig */}
        {mealData && (
          <View style={styles.mealDataBox}>
            <Text style={styles.sectionTitle}>Dine måltidsdetaljer</Text>
            {Object.keys(mealData).map((key, idx) => {
              // Vis kun relevante felter, ikke images/userId/createdAt
              if (["images", "userId", "createdAt"].includes(key)) return null;
              const course = mealData[key];
              if (typeof course === 'object' && course !== null) {
                return (
                  <View key={key} style={styles.mealCourseBox}>
                    <Text style={styles.mealCourseTitle}>{course.title || key}</Text>
                    {course.desc && <Text style={styles.mealCourseDesc}>Beskrivelse: {course.desc}</Text>}
                    {course.type && <Text style={styles.mealCourseDetail}>Type: {course.type}</Text>}
                    {course.portion && <Text style={styles.mealCourseDetail}>Portion: {course.portion}</Text>}
                    {course.taste && <Text style={styles.mealCourseDetail}>Smag: {course.taste === 'Andet' && course.customTaste ? course.customTaste : course.taste}</Text>}
                    {course.extra && <Text style={styles.mealCourseDetail}>Tilbehør: {course.extra}</Text>}
                  </View>
                );
              }
              return null;
            })}
          </View>
        )}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Main')}
        >
          <Text style={styles.backButtonText}>Tilbage til forside</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B0000" />
            <Text style={styles.loadingText}>Henter din anbefaling...</Text>
          </View>
        ) : (
          renderDetails()
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wineMealBadge: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#D2691E',
    marginTop: 8,
    marginBottom: 4
  },
  mealDataBox: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  mealCourseBox: {
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F2E6D8',
  },
  mealCourseTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#8B0000',
    marginBottom: 4,
  },
  mealCourseDesc: {
    fontSize: 15,
    color: '#1C1C1C',
    marginBottom: 2,
  },
  mealCourseDetail: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 2,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8B0000',
  },
  resultContainer: {
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1C',
    marginBottom: 16,
    textAlign: 'center',
  },
  overallExplanationBox: {
    backgroundColor: '#F2E6D8',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  overallExplanationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B0000',
    marginBottom: 8,
  },
  overallExplanationText: {
    fontSize: 16,
    color: '#1C1C1C',
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1C1C',
    marginBottom: 16,
  },
  wineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F2E6D8',
  },
  wineName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B0000',
    marginBottom: 8,
  },
  wineDetail: {
    fontSize: 15,
    color: '#1C1C1C',
    marginBottom: 4,
  },
  wineMatchCourse: {
    fontSize: 15,
    fontWeight: '500',
    color: '#8B0000',
    marginTop: 8,
  },
  explanationBox: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  explanationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1C',
    marginBottom: 6,
  },
  explanationText: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
  },
  backButton: {
    backgroundColor: '#8B0000',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
