// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Configuration, OpenAIApi } = require('openai');

admin.initializeApp();
const db = admin.firestore();

// Initialize OpenAI
const configuration = new Configuration({
  apiKey: functions.config().openai.key,
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
        model: "gpt-4o",
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
    console.log("Received mealData:", JSON.stringify(mealData, null, 2));
    
    // Create a structured meal description
    const courses = [];
    
    // Handle different mealData structures
    if (Array.isArray(mealData)) {
      // If mealData is an array, use it directly
      courses.push(...mealData.map(course => ({
        title: course.title || 'Unnamed Course',
        description: course.desc || '',
        type: course.type || '',
        portion: course.portion || '',
        taste: course.taste === 'Andet' ? (course.customTaste || 'Andet') : (course.taste || ''),
        extra: course.extra || ''
      })));
    } else {
      // If mealData is an object with nested course objects
      for (const courseId in mealData) {
        // Skip non-course properties
        if (['images', 'userId', 'createdAt', 'recommendationType', 'credits'].includes(courseId)) {
          continue;
        }
        
        const course = mealData[courseId];
        if (typeof course === 'object' && course !== null) {
          courses.push({
            title: course.title || courseId,
            description: course.desc || '',
            type: course.type || '',
            portion: course.portion || '',
            taste: course.taste === 'Andet' ? (course.customTaste || 'Andet') : (course.taste || ''),
            extra: course.extra || ''
          });
        }
      }
    }
    
    // Fallback if no courses were found
    if (courses.length === 0) {
      console.warn("No courses found in mealData, using generic course");
      courses.push({
        title: "General Meal",
        description: "No specific course details provided",
        type: "Mixed",
        portion: "Medium",
        taste: "Varied",
        extra: ""
      });
    }
    
    console.log("Extracted courses:", JSON.stringify(courses, null, 2));

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
        systemMessage = `You are a top-tier wine expert providing wine recommendations for a meal. You are thorough, precise, and confident in your recommendations. ALWAYS provide a pairing for EVERY wine and course combination, even if the pairing data is limited.

IMPORTANT: NEVER respond that you cannot make a recommendation or that you lack information. If specific details are missing, use your expert knowledge to make reasonable assumptions based on wine types, known characteristics, and general pairing principles.

You MUST return a valid JSON object with an array of wine matches. Each wine match MUST include: name, year, type, and the specific course it pairs best with.`;
        break;
      case 'standard':
        systemMessage = `You are a top-tier wine expert providing wine recommendations for a meal. You are thorough, precise, and confident in your recommendations. ALWAYS provide a pairing for EVERY wine and course combination, even if the pairing data is limited.

IMPORTANT: NEVER respond that you cannot make a recommendation or that you lack information. If specific details are missing, use your expert knowledge to make reasonable assumptions based on wine types, known characteristics, and general pairing principles.

You MUST return a valid JSON object with an 'overallExplanation' field and a 'wines' array with matches. Each wine match MUST include: name, year, type, region, grape, the specific course it pairs best with, and a persuasive explanation of why they match well together.`;
        break;
      case 'detailed':
        systemMessage = `You are a top-tier wine sommelier providing detailed wine recommendations for a meal. You are thorough, precise, and confident in your recommendations. ALWAYS provide a pairing for EVERY wine and course combination, even if the pairing data is limited.

IMPORTANT: NEVER respond that you cannot make a recommendation or that you lack information. If specific details are missing, use your expert knowledge to make reasonable assumptions based on wine types, known characteristics, and general pairing principles.

You MUST return a valid JSON object with:
1. An 'overallExplanation' field that provides comprehensive pairing theory and thoughtful conclusions
2. A 'wines' array with matches where each entry includes: name, year, type, region, grape, the specific course it pairs best with, and a detailed, persuasive explanation of why they match well together, including flavor profiles and food pairing principles.

Ensure your response reads like a professional sommelier's analysis with a confident, authoritative tone throughout.`;
        break;
      default:
        systemMessage = `You are a top-tier wine expert providing recommendations. ALWAYS provide a pairing for EVERY wine and course, even with limited data. NEVER say you cannot make a recommendation. Return valid JSON with wine matches.`;
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
          content: `Here are the courses in a meal:\n\n${JSON.stringify(courses, null, 2)}\n\nHere are the available wines:\n\n${winesList}\n\nPlease recommend which wines would pair best with these courses. I need you to match every wine with a course that it would pair well with. The recommendation should be returned as JSON with an 'overallExplanation' field and a 'wines' array with matches. Each wine match should include all wine details and which course it pairs with. The recommendation level is: ${recommendationType}.

IMPORTANT: 
1. Make definitive recommendations even if you have to make reasonable assumptions
2. Match each wine to a specific course
3. Provide a complete explanation for each pairing
4. Always format your response as valid JSON that can be parsed`
        }
      ],
      temperature: 0.5,
      max_tokens: 1500,
    });
    
    const responseText = response.data.choices[0].message.content;
    console.log("OpenAI recommendation response:", responseText);
    
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
      
      // Ensure we have a valid wines array
      if (!recommendationData.wines || !Array.isArray(recommendationData.wines) || recommendationData.wines.length === 0) {
        console.warn("No wines array in response, creating fallback recommendation");
        // Create a fallback recommendation using detected wines
        recommendationData = {
          wines: detectedWines.map((wine, index) => ({
            ...wine,
            coursePairing: courses[index % courses.length]?.title || "General Meal",
            explanation: "This wine would complement the flavors of this course well."
          })),
          overallExplanation: "Here are some wine recommendations for your meal based on the available wines."
        };
      }
      
      // Make sure each wine has a course pairing
      recommendationData.wines = recommendationData.wines.map((wine, index) => {
        return {
          ...wine,
          coursePairing: wine.coursePairing || wine.course || courses[index % courses.length]?.title || "General Meal"
        };
      });
      
      // Ensure there's always an overall explanation
      if (!recommendationData.overallExplanation) {
        recommendationData.overallExplanation = "These wines were selected to complement the flavors and characteristics of your meal courses.";
      }
      
      return {
        wines: recommendationData.wines,
        overallExplanation: recommendationData.overallExplanation,
      };
    } catch (parseError) {
      console.error('Error parsing recommendation data:', parseError);
      
      // Instead of throwing error, create a fallback recommendation
      const fallbackRecommendation = {
        wines: detectedWines.map((wine, index) => ({
          ...wine,
          coursePairing: courses[index % courses.length]?.title || "General Meal",
          explanation: "This wine would complement the flavors of this course well."
        })),
        overallExplanation: "Based on the wines detected, here are some recommendations that should pair well with your meal."
      };
      
      console.log("Using fallback recommendation:", fallbackRecommendation);
      return fallbackRecommendation;
    }
  } catch (error) {
    console.error('Error in createWineRecommendation:', error);
    throw new Error(`Failed to create wine recommendation: ${error.message}`);
  }
}
