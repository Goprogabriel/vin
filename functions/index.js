// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Configuration, OpenAIApi } = require('openai');

admin.initializeApp();
const db = admin.firestore();

// Initialize OpenAI
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY, // Set this in Firebase Functions settings
});
const openai = new OpenAIApi(configuration);

/**
 * Analyze wine images and recommend matches for meal courses
 * This function is triggered when a new recommendation request is added to Firestore
 */
exports.processWineRecommendation = functions.firestore
  .document('recommendationRequests/{requestId}')
  .onCreate(async (snapshot, context) => {
    const requestData = snapshot.data();
    const { mealData, imageUrls, userId, recommendationType, credits } = requestData;
    
    try {
      // 1. Process wine images with OpenAI's Vision API
      const detectedWines = await detectWinesFromImages(imageUrls);
      
      // 2. Create a recommendation based on detected wines and meal
      const recommendation = await createWineRecommendation(
        detectedWines, 
        mealData, 
        recommendationType
      );
      
      // 3. Save the recommendation to Firestore
      const recommendationRef = await db.collection('recommendations').add({
        userId,
        mealData,
        wines: recommendation.wines,
        overallExplanation: recommendation.overallExplanation,
        recommendationType,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      // 4. Update the request with the recommendation ID
      await snapshot.ref.update({
        status: 'completed',
        recommendationId: recommendationRef.id,
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      return recommendationRef.id;
    } catch (error) {
      console.error('Error processing recommendation:', error);
      
      // Update the request with error status
      await snapshot.ref.update({
        status: 'error',
        error: error.message,
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      return null;
    }
  });

/**
 * Detect wine bottles from uploaded images
 * @param {Array} imageUrls - Array of image URLs
 * @returns {Array} - Array of detected wine objects
 */
async function detectWinesFromImages(imageUrls) {
  try {
    const detectedWines = [];
    
    // Process each image with OpenAI Vision API
    for (const imageUrl of imageUrls) {
      const response = await openai.createChatCompletion({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: "This is an image of wine bottles. Please identify all wine bottles visible in this image. For each wine, provide the following details if visible: name, producer, year, region, grape varietals, type (red, white, rosé, sparkling). Return the information in JSON format with an array of wine objects. Each wine object should have fields: name, producer, year, type, region, grape."
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
        max_tokens: 800,
      });
      
      const responseText = response.data.choices[0].message.content;
      
      try {
        // Extract JSON from response
        const jsonMatch = responseText.match(/```json([\s\S]*?)```/) || 
                        responseText.match(/{[\s\S]*}/) ||
                        responseText;
                        
        let winesData;
        if (jsonMatch && jsonMatch[1]) {
          winesData = JSON.parse(jsonMatch[1]);
        } else {
          winesData = JSON.parse(responseText);
        }
        
        if (winesData && Array.isArray(winesData.wines)) {
          detectedWines.push(...winesData.wines);
        } else if (winesData && Array.isArray(winesData)) {
          detectedWines.push(...winesData);
        }
      } catch (parseError) {
        console.error('Error parsing wine data:', parseError);
        // Fallback: Try to extract structured data even if not in proper JSON format
        const wines = extractWineDataFromText(responseText);
        if (wines.length > 0) {
          detectedWines.push(...wines);
        }
      }
    }
    
    return detectedWines;
  } catch (error) {
    console.error('Error in detectWinesFromImages:', error);
    throw new Error(`Failed to detect wines: ${error.message}`);
  }
}

/**
 * Fallback method to extract wine data from text response
 */
function extractWineDataFromText(text) {
  const wines = [];
  // Simple extraction logic - can be improved
  const wineMatches = text.match(/name:\s*([^\n,]+)/gi) || [];
  
  wineMatches.forEach((match, index) => {
    const name = (match.split(':')[1] || '').trim();
    if (name) {
      wines.push({ name });
    }
  });
  
  return wines;
}

/**
 * Create wine recommendation based on detected wines and meal data
 */
async function createWineRecommendation(detectedWines, mealData, recommendationType) {
  try {
    // Create a structured meal description
    const courses = [];
    for (const courseId in mealData) {
      if (courseId !== 'images' && courseId !== 'userId' && courseId !== 'createdAt' && courseId !== 'recommendationType' && courseId !== 'credits') {
        const course = mealData[courseId];
        if (course && course.title) {
          courses.push({
            title: course.title,
            description: course.desc || '',
            type: course.type || '',
            portion: course.portion || '',
            taste: course.taste === 'Andet' ? (course.customTaste || 'Andet') : course.taste,
            extra: course.extra || '',
          });
        }
      }
    }

    // Format wines for the prompt
    const winesList = detectedWines.map(wine => {
      return `Name: ${wine.name || 'Unknown'}
Producer: ${wine.producer || 'Unknown'}
Year: ${wine.year || 'Unknown'}
Type: ${wine.type || 'Unknown'}
Region: ${wine.region || 'Unknown'}
Grape: ${wine.grape || 'Unknown'}`;
    }).join('\n\n');
    
    // Create system message based on recommendation type
    let systemMessage;
    switch (recommendationType) {
      case 'simple':
        systemMessage = `You are a wine expert providing simple wine recommendations for a meal. Return a JSON object with an array of wine matches. Each wine should have name, year, type, and the course it pairs with.`;
        break;
      case 'standard':
        systemMessage = `You are a wine expert providing standard wine recommendations for a meal. For each wine, explain why it pairs well with specific courses. Return a JSON object with an array of wine matches. Each wine should have name, year, type, region, grape, the course it pairs with, and a short explanation of why they match.`;
        break;
      case 'detailed':
        systemMessage = `You are a wine expert providing detailed wine recommendations for a meal. Give a thorough analysis of why specific wines pair well with courses, including taste profiles and food pairing principles. Return a JSON object with an 'overallExplanation' field with general pairing theory and an array of wine matches. Each wine should have name, year, type, region, grape, the course it pairs with, and a detailed explanation of why they match.`;
        break;
      default:
        systemMessage = `You are a wine expert providing wine recommendations for a meal.`;
    }
    
    // Make the recommendation request to OpenAI
    const response = await openai.createChatCompletion({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: systemMessage
        },
        {
          role: "user",
          content: `Here are the courses in a meal:\n\n${JSON.stringify(courses, null, 2)}\n\nHere are the available wines:\n\n${winesList}\n\nPlease recommend which wines would pair best with these courses. The recommendation should be returned as JSON with an 'overallExplanation' field (if detailed) and a 'wines' array with matches. Each wine match should include the wine details and which course it pairs with. The recommendation level is: ${recommendationType}`
        }
      ],
      temperature: 0.7,
      max_tokens: 1200,
    });
    
    const responseText = response.data.choices[0].message.content;
    
    try {
      // Extract JSON from response
      const jsonMatch = responseText.match(/```json([\s\S]*?)```/) || 
                      responseText.match(/{[\s\S]*}/) ||
                      responseText;
                      
      let recommendationData;
      if (jsonMatch && jsonMatch[1]) {
        recommendationData = JSON.parse(jsonMatch[1].trim());
      } else {
        recommendationData = JSON.parse(responseText.trim());
      }
      
      return {
        wines: recommendationData.wines || [],
        overallExplanation: recommendationData.overallExplanation || '',
      };
    } catch (parseError) {
      console.error('Error parsing recommendation data:', parseError);
      throw new Error('Failed to parse recommendation data');
    }
  } catch (error) {
    console.error('Error in createWineRecommendation:', error);
    throw new Error(`Failed to create wine recommendation: ${error.message}`);
  }
}
