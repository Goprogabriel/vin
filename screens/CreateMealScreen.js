import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, Image, Alert, SafeAreaView, Pressable, Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth } from '../firebaseConfig';

const PORTION_OPTIONS = ['Lille', 'Mellem', 'Stor'];
const DISH_TYPES = ['Kød', 'Fisk', 'Grøntsager', 'Ost', 'Dessert'];
const TASTE_OPTIONS = ['Surt', 'Sødt', 'Salt', 'Andet'];
const PREDEFINED_COURSES = ['Forret', 'Hovedret', 'Dessert', 'Ost', 'Snack'];

export default function CreateMealScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [courses, setCourses] = useState([
    { id: Date.now(), title: 'Forret' },
  ]);
  const [courseDetails, setCourseDetails] = useState({});
  const [images, setImages] = useState([]);
  const [customTasteInput, setCustomTasteInput] = useState('');
  const [showCustomTasteModal, setShowCustomTasteModal] = useState(false);
  const [currentEditingCourse, setCurrentEditingCourse] = useState(null);

  // Add new course
  const addCourse = () => {
    const newId = Date.now() + Math.random();
    setCourses([...courses, { id: newId, title: '' }]);
  };

  // Remove course
  const removeCourse = (id) => {
    setCourses(courses.filter((c) => c.id !== id));
    setCourseDetails((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  // Move course up/down
  const moveCourse = (index, direction) => {
    const newCourses = [...courses];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= newCourses.length) return;
    [newCourses[index], newCourses[target]] = [newCourses[target], newCourses[index]];
    setCourses(newCourses);
  };

  // Update course title
  const updateCourseTitle = (id, title) => {
    setCourses(courses.map((c) => c.id === id ? { ...c, title } : c));
  };
  
  // Handle predefined course selection
  const selectPredefinedCourse = (id, title) => {
    setCourses(courses.map((c) => c.id === id ? { ...c, title } : c));
  };

  // Step 2: Handle course details
  const updateCourseDetail = (course, field, value) => {
    setCourseDetails((prev) => ({
      ...prev,
      [course]: {
        ...prev[course],
        [field]: value,
      },
    }));
  };
  
  // Handle custom taste
  const openCustomTasteModal = (courseId) => {
    setCurrentEditingCourse(courseId);
    setCustomTasteInput(courseDetails[courseId]?.taste === 'Andet' ? 
                        (courseDetails[courseId]?.customTaste || '') : '');
    setShowCustomTasteModal(true);
  };
  
  const saveCustomTaste = () => {
    if (customTasteInput.trim()) {
      setCourseDetails((prev) => ({
        ...prev,
        [currentEditingCourse]: {
          ...prev[currentEditingCourse],
          taste: 'Andet',
          customTaste: customTasteInput.trim()
        },
      }));
    }
    setShowCustomTasteModal(false);
  };

  // Step 3: Image picker
  const pickImage = async (fromCamera) => {
    let result;
    if (fromCamera) {
      result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });
    }
    if (!result.canceled && result.assets && result.assets.length > 0) {
      if (images.length >= 3) {
        Alert.alert('Maks 3 billeder', 'Du kan kun uploade op til 3 billeder.');
        return;
      }
      setImages([...images, ...result.assets.map((a) => a.uri)].slice(0, 3));
    }
  };

  // Step 4: Submit
  const handleSubmit = async () => {
    // Validate
    for (const course of courses) {
      const details = courseDetails[course.id] || {};
      if (!details.portion || !details.type || !details.taste) {
        Alert.alert('Udfyld mindst portionsstørrelse, type og smag for hver ret');
        return;
      }
    }
    if (images.length === 0) {
      Alert.alert('Upload mindst ét billede af din vinreol');
      return;
    }

    // Check for missing desc or extra
    let missingFields = false;
    for (const course of courses) {
      const details = courseDetails[course.id] || {};
      if (!details.desc || !details.extra) {
        missingFields = true;
        break;
      }
    }

    if (missingFields) {
      Alert.alert(
        'Vil du fortsætte?',
        'Du har ikke udfyldt beskrivelse eller tilbehør for alle retter. Din anbefaling bliver bedre hvis du udfylder alle felter. Vil du fortsætte alligevel?',
        [
          { text: 'Tilbage', style: 'cancel' },
          { text: 'Fortsæt', style: 'destructive', onPress: () => saveMeal() }
        ]
      );
      return;
    }
    // If all fields filled, save directly
    await saveMeal();
  };

  // Helper: create user in Firestore if not exists
  const createUserIfNotExists = async (userId) => {
    try {
      console.log("Checking if user exists in Firestore:", userId);
      const db = getFirestore();
      const userRef = collection(db, 'users');
      const userDoc = await getDocs(
        query(userRef, where('uid', '==', userId))
      );

      if (userDoc.empty) {
        console.log("User does not exist. Creating new user with ID:", userId);
        await addDoc(userRef, {
          uid: userId,
          credits: 30,
          createdAt: Timestamp.now(),
        });
        console.log("User created successfully!");
      } else {
        console.log("User already exists, no need to create.");
      }
    } catch (error) {
      console.error("Error in createUserIfNotExists:", error);
      throw error;
    }
  };

  // Save meal helper
  const saveMeal = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        throw new Error("User is not authenticated. Cannot save meal.");
      }

      console.log("Saving meal for userId:", userId);
      const db = getFirestore();
      const mealData = {
        ...courseDetails,
        images,
        userId,
        createdAt: Timestamp.now(),
      };

      await addDoc(collection(db, 'meals'), mealData);
      console.log("Meal saved successfully!");
      Alert.alert('Succes', 'Måltidet er gemt!');
      navigation.navigate('RecommendationOptions', { mealData: courseDetails, uploadedImageUrls: images });
    } catch (error) {
      console.error("Error saving meal:", error);
      Alert.alert('Fejl', 'Kunne ikke gemme måltidet: ' + error.message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Opret måltid</Text>
        
        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          {[1, 2, 3, 4].map((stepNum) => (
            <View key={stepNum} style={[styles.stepDot, step >= stepNum && styles.activeStepDot]}>
              <Text style={[styles.stepDotText, step >= stepNum && styles.activeStepDotText]}>{stepNum}</Text>
            </View>
          ))}
        </View>
        
        {/* Step 1 */}
        {step === 1 && (
          <View style={styles.stepBox}>
            <Text style={styles.stepTitle}>1. Tilføj og sorter retter</Text>
            {courses.map((course, idx) => (
              <View key={course.id} style={styles.courseSection}>
                <Text style={styles.inputLabel}>Vælg ret</Text>
                <View style={styles.courseTypesRow}>
                  {PREDEFINED_COURSES.map((courseType) => (
                    <Pressable
                      key={courseType}
                      onPress={() => selectPredefinedCourse(course.id, courseType)}
                      style={({pressed}) => [
                        styles.courseTypeButton, 
                        course.title === courseType && styles.courseTypeButtonSelected,
                        pressed && {opacity: 0.7}
                      ]}
                    >
                      <Text style={[
                        styles.courseTypeText,
                        course.title === courseType && styles.courseTypeTextSelected
                      ]}>
                        {courseType}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                
                <Text style={styles.inputLabel}>Eller indtast eget navn</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Indtast navn på ret..."
                  value={course.title}
                  onChangeText={(text) => updateCourseTitle(course.id, text)}
                  placeholderTextColor="#888"
                />
                
                <View style={styles.courseActionsRow}>
                  <TouchableOpacity onPress={() => moveCourse(idx, 'up')} disabled={idx === 0} style={[styles.actionBtn, idx === 0 && styles.actionBtnDisabled]} activeOpacity={0.7}>
                    <Text style={styles.actionBtnText}>↑</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => moveCourse(idx, 'down')} disabled={idx === courses.length - 1} style={[styles.actionBtn, idx === courses.length - 1 && styles.actionBtnDisabled]} activeOpacity={0.7}>
                    <Text style={styles.actionBtnText}>↓</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeCourse(course.id)} style={[styles.actionBtn, styles.deleteBtn]} activeOpacity={0.7}>
                    <Text style={styles.actionBtnText}>Slet</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <TouchableOpacity style={styles.button} onPress={addCourse} activeOpacity={0.7}>
              <Text style={styles.buttonText}>Tilføj ny ret</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={() => setStep(2)} activeOpacity={0.7}>
              <Text style={styles.buttonText}>Næste</Text>
            </TouchableOpacity>
          </View>
        )}
        {/* Step 2 */}
        {step === 2 && (
          <View style={styles.stepBox}>
            <Text style={styles.stepTitle}>2. Beskriv hver ret</Text>
            {courses.map((course, idx) => (
              <View key={course.id} style={styles.courseSection}>
                <Text style={styles.courseLabel}>{course.title || `Ret ${idx + 1}`}</Text>
                
                <Text style={styles.inputLabel}>Portionsstørrelse</Text>
                <View style={styles.optionsRow}>
                  {PORTION_OPTIONS.map((size) => (
                    <TouchableOpacity
                      key={size}
                      style={[styles.radioBtn, courseDetails[course.id]?.portion === size && styles.radioBtnSelected]}
                      onPress={() => updateCourseDetail(course.id, 'portion', size)}
                      activeOpacity={0.7}
                    >
                      <Text style={courseDetails[course.id]?.portion === size ? styles.radioTextSelected : styles.radioText}>{size}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <Text style={styles.inputLabel}>Type af ret</Text>
                <View style={styles.optionsGrid}>
                  {DISH_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.typeCard, courseDetails[course.id]?.type === type && styles.typeCardSelected]}
                      onPress={() => updateCourseDetail(course.id, 'type', type)}
                      activeOpacity={0.7}
                    >
                      <Text style={courseDetails[course.id]?.type === type ? styles.typeCardTextSelected : styles.typeCardText}>{type}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <Text style={styles.inputLabel}>Beskrivelse af retten</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="f.eks. grillet laks med citron smør"
                  value={courseDetails[course.id]?.desc || ''}
                  onChangeText={(text) => updateCourseDetail(course.id, 'desc', text)}
                  placeholderTextColor="#888"
                  multiline={true}
                  numberOfLines={2}
                />
                
                <Text style={styles.inputLabel}>Smag</Text>
                <View style={styles.optionsRow}>
                  {TASTE_OPTIONS.map((taste) => (
                    <TouchableOpacity
                      key={taste}
                      style={[
                        styles.tasteBtn, 
                        courseDetails[course.id]?.taste === taste && styles.tasteBtnSelected,
                        taste === 'Andet' && courseDetails[course.id]?.customTaste && styles.tasteBtnSelected
                      ]}
                      onPress={() => {
                        if (taste === 'Andet') {
                          openCustomTasteModal(course.id);
                        } else {
                          updateCourseDetail(course.id, 'taste', taste);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={
                        (courseDetails[course.id]?.taste === taste || 
                        (taste === 'Andet' && courseDetails[course.id]?.customTaste)) 
                          ? styles.tasteBtnTextSelected 
                          : styles.tasteBtnText
                      }>
                        {taste === 'Andet' && courseDetails[course.id]?.customTaste 
                          ? courseDetails[course.id]?.customTaste 
                          : taste}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <Text style={styles.inputLabel}>Tilbehør til retten</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="f.eks. sauce, salat, brød, osv."
                  value={courseDetails[course.id]?.extra || ''}
                  onChangeText={(text) => updateCourseDetail(course.id, 'extra', text)}
                  placeholderTextColor="#888"
                  multiline={true}
                />
              </View>
            ))}
            
            <View style={styles.navigationButtons}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(1)} activeOpacity={0.7}>
                <Text style={styles.secondaryButtonText}>Tilbage</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, {flex: 1}]} onPress={() => setStep(3)} activeOpacity={0.7}>
                <Text style={styles.buttonText}>Næste</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {/* Step 3 */}
        {step === 3 && (
          <View style={styles.stepBox}>
            <Text style={styles.stepTitle}>3. Upload billede(r) af vinreol</Text>
            
            <View style={styles.imageUploadContainer}>
              <View style={styles.imagePlaceholder}>
                <TouchableOpacity 
                  style={styles.cameraButton} 
                  onPress={() => pickImage(true)} 
                  activeOpacity={0.7}
                >
                  <Text style={styles.cameraButtonIcon}>📷</Text>
                  <Text style={styles.cameraButtonText}>Tag foto</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.imagePlaceholder}>
                <TouchableOpacity 
                  style={styles.cameraButton} 
                  onPress={() => pickImage(false)} 
                  activeOpacity={0.7}
                >
                  <Text style={styles.cameraButtonIcon}>🖼️</Text>
                  <Text style={styles.cameraButtonText}>Vælg fra galleri</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {images.length > 0 && (
              <View style={styles.uploadedImagesContainer}>
                <Text style={styles.uploadedImagesTitle}>Uploadede billeder</Text>
                <View style={styles.imagePreviewGrid}>
                  {images.map((uri, idx) => (
                    <View key={idx} style={styles.imageThumbContainer}>
                      <Image source={{ uri }} style={styles.imageThumb} />
                      <TouchableOpacity 
                        style={styles.removeImageButton}
                        onPress={() => setImages(images.filter((_, i) => i !== idx))}
                      >
                        <Text style={styles.removeImageButtonText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
                <Text style={styles.imageLimit}>
                  {images.length}/3 billeder ({3 - images.length} tilbage)
                </Text>
              </View>
            )}
            
            <View style={styles.navigationButtons}>
              <TouchableOpacity 
                style={styles.secondaryButton} 
                onPress={() => setStep(2)} 
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryButtonText}>Tilbage</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, {flex: 1}]}
                onPress={() => setStep(4)}
                activeOpacity={0.7}
                disabled={images.length === 0}
              >
                <Text style={styles.buttonText}>
                  {images.length === 0 ? 'Upload mindst ét billede' : 'Næste'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {/* Step 4 */}
        {step === 4 && (
          <View style={styles.stepBox}>
            <Text style={styles.stepTitle}>Oversigt</Text>
            
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Retter</Text>
              {courses.map((course, idx) => (
                <View key={course.id} style={styles.summaryCourseCard}>
                  <View style={styles.summaryHeader}>
                    <Text style={styles.summaryCourseName}>{course.title || `Ret ${idx + 1}`}</Text>
                    <View style={styles.summaryPortionBadge}>
                      <Text style={styles.summaryPortionText}>{courseDetails[course.id]?.portion}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.summaryDetail}>
                    <Text style={styles.summaryLabel}>Type:</Text>
                    <Text style={styles.summaryValue}>{courseDetails[course.id]?.type}</Text>
                  </View>
                  
                  <View style={styles.summaryDetail}>
                    <Text style={styles.summaryLabel}>Beskrivelse:</Text>
                    <Text style={styles.summaryValue}>{courseDetails[course.id]?.desc}</Text>
                  </View>
                  
                  <View style={styles.summaryDetail}>
                    <Text style={styles.summaryLabel}>Smag:</Text>
                    <Text style={styles.summaryValue}>
                      {courseDetails[course.id]?.taste === 'Andet' && courseDetails[course.id]?.customTaste
                        ? courseDetails[course.id]?.customTaste
                        : courseDetails[course.id]?.taste}
                    </Text>
                  </View>
                  
                  <View style={styles.summaryDetail}>
                    <Text style={styles.summaryLabel}>Tilbehør:</Text>
                    <Text style={styles.summaryValue}>{courseDetails[course.id]?.extra}</Text>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.editCourseButton}
                    onPress={() => setStep(2)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.editCourseButtonText}>Rediger</Text>
                  </TouchableOpacity>
                </View>
              ))}
              
              <Text style={styles.summaryImagesTitle}>Billeder</Text>
              <View style={styles.summaryImagesContainer}>
                {images.map((uri, idx) => (
                  <Image key={idx} source={{ uri }} style={styles.summaryImage} />
                ))}
                
                <TouchableOpacity 
                  style={styles.editImagesButton}
                  onPress={() => setStep(3)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.editImagesButtonText}>Rediger billeder</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.navigationButtons}>
              <TouchableOpacity 
                style={styles.secondaryButton} 
                onPress={() => setStep(3)} 
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryButtonText}>Tilbage</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.submitBtn, {flex: 1}]} 
                onPress={handleSubmit} 
                activeOpacity={0.7}
              >
                <Text style={styles.submitBtnText}>Gem måltid</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {/* Custom Taste Modal */}
        <Modal
          visible={showCustomTasteModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowCustomTasteModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Angiv smag</Text>
              
              <TextInput
                style={styles.modalInput}
                placeholder="Beskriv smagen..."
                value={customTasteInput}
                onChangeText={setCustomTasteInput}
                placeholderTextColor="#888"
                autoFocus
              />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowCustomTasteModal(false)}
                >
                  <Text style={styles.modalCancelText}>Annuller</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.modalSaveButton}
                  onPress={saveCustomTaste}
                  disabled={!customTasteInput.trim()}
                >
                  <Text style={styles.modalSaveText}>Gem</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    flexGrow: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#1C1C1C',
  },
  // Step Indicator
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  stepDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2E6D8',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: '#CCCCCC',
  },
  activeStepDot: {
    backgroundColor: '#8B0000',
    borderColor: '#8B0000',
  },
  stepDotText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#888',
  },
  activeStepDotText: {
    color: '#FFFFFF',
  },
  // Step Content
  stepBox: {
    marginBottom: 30,
    backgroundColor: '#F2E6D8',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#8B0000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#888',
  },
  // Course Selection (Step 1)
  courseSection: {
    marginBottom: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#8B0000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  courseTypesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 8,
  },
  courseTypeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    marginBottom: 8,
    minWidth: 90,
    alignItems: 'center',
  },
  courseTypeButtonSelected: {
    backgroundColor: '#8B0000',
    borderColor: '#8B0000',
  },
  courseTypeText: {
    color: '#1C1C1C',
    fontWeight: '500',
  },
  courseTypeTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  courseActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    backgroundColor: '#8B0000',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  actionBtnDisabled: {
    backgroundColor: '#CCCCCC',
  },
  deleteBtn: {
    backgroundColor: '#D2691E',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  // Course Details (Step 2)
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 8,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  courseLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1C',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2E6D8',
    paddingBottom: 8,
  },
  inputLabel: {
    fontSize: 16,
    color: '#888',
    marginTop: 8,
    marginBottom: 6,
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#1C1C1C',
    marginBottom: 12,
  },
  radioBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CCCCCC',
  },
  radioBtnSelected: {
    backgroundColor: '#8B0000',
    borderColor: '#8B0000',
  },
  radioText: {
    color: '#1C1C1C',
    fontWeight: '500',
    fontSize: 15,
  },
  radioTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  typeCard: {
    width: '48%',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeCardSelected: {
    backgroundColor: '#8B0000',
    borderColor: '#8B0000',
  },
  typeCardText: {
    color: '#1C1C1C',
    fontWeight: 'bold',
    fontSize: 15,
  },
  typeCardTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  tasteBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    marginBottom: 8,
  },
  tasteBtnSelected: {
    backgroundColor: '#8B0000',
    borderColor: '#8B0000',
  },
  tasteBtnText: {
    color: '#1C1C1C',
    fontWeight: '500',
    fontSize: 15,
  },
  tasteBtnTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  // Images (Step 3)
  imageUploadContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  imagePlaceholder: {
    width: '48%',
    height: 150,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  cameraButton: {
    alignItems: 'center',
    padding: 16,
  },
  cameraButtonIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  cameraButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8B0000',
    textAlign: 'center',
  },
  uploadedImagesContainer: {
    marginTop: 16,
    marginBottom: 24,
  },
  uploadedImagesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C1C1C',
    marginBottom: 12,
  },
  imagePreviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  imageThumbContainer: {
    position: 'relative',
  },
  imageThumb: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    shadowColor: '#8B0000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#D2691E',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  removeImageButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  imageLimit: {
    marginTop: 8,
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
  },
  // Summary (Step 4)
  summaryContainer: {
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1C',
    marginBottom: 12,
  },
  summaryCourseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#8B0000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2E6D8',
    paddingBottom: 8,
  },
  summaryCourseName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1C',
  },
  summaryPortionBadge: {
    backgroundColor: '#F2E6D8',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  summaryPortionText: {
    color: '#8B0000',
    fontWeight: '500',
    fontSize: 14,
  },
  summaryDetail: {
    marginBottom: 8,
    flexDirection: 'row',
  },
  summaryLabel: {
    width: '30%',
    fontSize: 15,
    fontWeight: '500',
    color: '#888',
  },
  summaryValue: {
    flex: 1,
    fontSize: 15,
    color: '#1C1C1C',
  },
  editCourseButton: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8B0000',
    marginTop: 8,
  },
  editCourseButtonText: {
    color: '#8B0000',
    fontWeight: '500',
    fontSize: 14,
  },
  summaryImagesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1C',
    marginTop: 8,
    marginBottom: 12,
  },
  summaryImagesContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#8B0000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 3,
  },
  summaryImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#CCCCCC',
  },
  editImagesButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8B0000',
    marginTop: 8,
  },
  editImagesButtonText: {
    color: '#8B0000',
    fontWeight: '500',
    fontSize: 14,
  },
  // Navigation Buttons
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  button: {
    backgroundColor: '#8B0000',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginVertical: 8,
    width: '100%',
    shadowColor: '#8B0000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginVertical: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#8B0000',
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: '#8B0000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitBtn: {
    backgroundColor: '#D2691E',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginVertical: 8,
    width: '100%',
    shadowColor: '#D2691E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 0.5,
  },
  // Custom Taste Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1C',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancelButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  modalCancelText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '500',
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: '#8B0000',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
