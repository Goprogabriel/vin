import React, { useEffect, useState, useLayoutEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../AuthContext';
import { View, StyleSheet, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

const MainScreen = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center', marginRight: 8 }}>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={{ padding: 8 }}>
            <Ionicons name="settings-outline" size={28} color="#7B1F2B" />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    if (!user || authLoading) return;
    const fetchRecommendations = async () => {
      try {
        const db = getFirestore();
        const q = query(collection(db, 'recommendations'), where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const recs = [];
        querySnapshot.forEach(doc => {
          const data = doc.data();
          recs.push({ id: doc.id, ...data });
        });
        setRecommendations(recs);
      } catch (err) {
        setRecommendations([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRecommendations();
  }, [user, authLoading]);

  if (authLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#7B1F2B" style={{ marginTop: 40 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Mine anbefalinger</Text>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator size="large" color="#7B1F2B" style={{ marginTop: 40 }} />
        ) : recommendations.length === 0 ? (
          <Text style={styles.emptyText}>Ingen anbefalinger endnu.</Text>
        ) : (
          recommendations.map(rec => (
            <TouchableOpacity
              key={rec.id || Math.random().toString()}
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('RecommendationResult', { recommendationId: rec.id })}
            >
              <Text style={styles.cardTitle}>{rec.mealData?.title || 'Anbefaling'}</Text>
              <Text style={styles.cardDesc} numberOfLines={2}>{rec.overallExplanation || 'Ingen beskrivelse.'}</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F6F3',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    paddingBottom: 0,
  },
  scrollContent: {
    paddingTop: 48,
    paddingBottom: 120,
    paddingHorizontal: 18,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#7B1F2B',
    marginBottom: 18,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  emptyText: {
    color: '#BFAFA3',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  card: {
    backgroundColor: '#FFF9F5',
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#7B1F2B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F2E6D8',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#7B1F2B',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#BFAFA3',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 15,
    color: '#7B1F2B',
    marginBottom: 0,
  },
  topButtonContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: -12,
    zIndex: 10,
  },
  topButton: {
    backgroundColor: '#7B1F2B',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
    shadowColor: '#7B1F2B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  topButtonText: {
    color: '#FFF9F5',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default MainScreen;
