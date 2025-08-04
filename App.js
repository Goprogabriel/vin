import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './AuthContext';
import WelcomeScreen from './screens/WelcomeScreen';
import MainScreen from './screens/MainScreen';
import ProfileScreen from './screens/ProfileScreen';
import CreateMealScreen from './screens/CreateMealScreen';
import LoadingScreen from './screens/LoadingScreen';
import RecommendationOptionsScreen from './screens/RecommendationOptionsScreen';
// ...existing code...
import BuyCreditsScreen from './screens/BuyCreditsScreen';
// Add RecommendationDetail import
import RecommendationResultScreen from './screens/RecommendationResultScreen';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7B1F2B" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen 
              name="Main" 
              component={MainScreen}
              options={{
                headerShown: true,
                title: '',
                headerShadowVisible: false,
                headerStyle: {
                  backgroundColor: '#F8F6F3'
                }
              }}
            />
            <Stack.Screen 
              name="Profile" 
              component={ProfileScreen}
              options={{
                headerShown: true,
                title: 'Profil',
                headerShadowVisible: false,
                headerStyle: {
                  backgroundColor: '#F8F6F3'
                },
                headerTintColor: '#7B1F2B'
              }}
            />
            <Stack.Screen name="CreateMeal" component={CreateMealScreen} />
            <Stack.Screen name="RecommendationOptions" component={RecommendationOptionsScreen} />
            <Stack.Screen name="BuyCredits" component={BuyCreditsScreen} />
            <Stack.Screen name="Loading" component={LoadingScreen} />
            <Stack.Screen name="RecommendationResult" component={RecommendationResultScreen} />
            <Stack.Screen name="RecommendationDetail" component={RecommendationResultScreen} />
          </>
        ) : (
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});
