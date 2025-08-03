import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const MainScreen = () => {
  const navigation = useNavigation();
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CreateMeal')}>
        <View style={styles.plusCircle}>
          <View style={styles.plusVertical} />
          <View style={styles.plusHorizontal} />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    zIndex: 10,
  },
  plusCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  plusVertical: {
    position: 'absolute',
    width: 8,
    height: 32,
    backgroundColor: 'white',
    borderRadius: 4,
  },
  plusHorizontal: {
    position: 'absolute',
    width: 32,
    height: 8,
    backgroundColor: 'white',
    borderRadius: 4,
  },
});

export default MainScreen;
