import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { Ollama } from 'ollama';
import pkg from 'pg';
const { Pool } = pkg;

const app = express();
const port = 3000;
const pool = new Pool({
  user: process.env.USER,
  host: process.env.HOST,
  database: process.env.DATABASE,
  password: process.env.PASSWORD,
  port: process.env.PORT,
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());

const ollama = new Ollama();

function parseEmbedding(embeddingData) {
  if (Array.isArray(embeddingData)) {
    return embeddingData;
  }

  if (typeof embeddingData === 'string') {
    // Handle string format like "[1,2,3]"
    try {
      return JSON.parse(embeddingData);
    } catch (e) {
      console.error('Error parsing embedding string:', e);
    }
  }

  if (typeof embeddingData === 'object' && Object.prototype.hasOwnProperty.call(embeddingData, 'vector')) {
    return embeddingData.vector;
  }

  console.error('Unknown embedding format:', embeddingData);
  return null;
}

function cosineSimilarity(embedding1, embedding2) {
  console.log("Embedding 1 type:", typeof embedding1, "value:", embedding1);
  console.log("Embedding 2 type:", typeof embedding2, "value:", embedding2);

  // Parse embeddings if needed
  const vec1 = parseEmbedding(embedding1);
  const vec2 = parseEmbedding(embedding2);

  console.log("Parsed vec1:", vec1);
  console.log("Parsed vec2:", vec2);

  if (!vec1 || !vec2 || !Array.isArray(vec1) || !Array.isArray(vec2)) {
    console.error("Invalid embedding format after parsing");
    return 0; // Return 0 instead of NaN for graceful fallback
  }

  if (vec1.length !== vec2.length) {
    console.error(`Embedding length mismatch: ${vec1.length} vs ${vec2.length}`);
    return 0;
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    const v1 = Number(vec1[i]);
    const v2 = Number(vec2[i]);

    if (isNaN(v1) || isNaN(v2)) {
      console.error(`Invalid number at index ${i}: ${vec1[i]} or ${vec2[i]}`);
      continue;
    }

    dotProduct += v1 * v2;
    norm1 += v1 * v1;
    norm2 += v2 * v2;
  }

  const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  console.log("Calculated similarity:", similarity);

  return isNaN(similarity) ? 0 : similarity;
}

app.post('/api/recommend-food', async (req, res) => {
  try {
    const { userId, foodItemId } = req.body;

    if (!userId || !foodItemId) {
      return res.status(400).json({ error: 'Missing userId or foodItemId' });
    }

    // Get user data and embedding
    const userQuery = 'SELECT * FROM users WHERE id = $1';
    const userResult = await pool.query(userQuery, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get food item data and embedding
    const foodQuery = 'SELECT * FROM food_items WHERE id = $1';
    const foodResult = await pool.query(foodQuery, [foodItemId]);

    if (foodResult.rows.length === 0) {
      return res.status(404).json({ error: 'Food item not found' });
    }

    const user = userResult.rows[0];
    const foodItem = foodResult.rows[0];
    console.log("User data:", user);
    console.log("Food item data:", foodItem);

    // Direct access the first item in the nutrition_info array
    const nutritionInfo = Array.isArray(foodItem.nutrition_info)
      ? foodItem.nutrition_info[0]
      : foodItem.nutrition_info;

    // Ensure dietary preferences and complications are arrays
    const userDietaryPreferences = Array.isArray(user.dietary_preferences)
      ? user.dietary_preferences
      : (user.dietary_preferences || '').split(',').filter(Boolean);

    const userComplications = Array.isArray(user.complications)
      ? user.complications
      : (user.complications || '').split(',').filter(Boolean);

    // Calculate similarity score
    const similarityScore = cosineSimilarity(
      user.embedding,
      foodItem.embedding
    );
    console.log("Similarity score:", similarityScore);

    // Extract numeric values from ranges for clearer recommendations
    const extractNumericValue = (range) => {
      if (!range) return '0';
      const matches = range.match(/\d+/g);
      if (matches && matches.length > 0) {
        // Take the average if it's a range, or the single value if it's not
        return matches.length > 1
          ? ((parseInt(matches[0]) + parseInt(matches[1])) / 2).toFixed(0)
          : matches[0];
      }
      return '0';
    };

    console.log("Building prompt with nutrition info:", nutritionInfo);

    const contextPrompt = `Analyze if this food item is suitable for the user based on their profile:

User Profile:
- Age: ${user.age || 'Not specified'}
- Caloric Target: ${user.caloric_target || 'Not specified'} calories
- Protein Target: ${user.protein_target || 'Not specified'}g
- Dietary Preferences: ${userDietaryPreferences.length ? userDietaryPreferences.join(', ') : 'None specified'}
- Health Complications: ${userComplications.length ? userComplications.join(', ') : 'None specified'}

Food Item (${foodItem.name || 'Unknown'}):
- Calories: ${extractNumericValue(nutritionInfo.calories)} calories
- Protein: ${extractNumericValue(nutritionInfo.protein)}g
- Total Fat: ${extractNumericValue(nutritionInfo.totalFat)}g
- Carbohydrates: ${extractNumericValue(nutritionInfo.carbohydrates)}g
- Sodium: ${extractNumericValue(nutritionInfo.sodium)}mg
- Cholesterol: ${extractNumericValue(nutritionInfo.cholesterol)}mg

Embedding Similarity Score: ${(similarityScore * 100).toFixed(2)}%

Provide a concise analysis of how well this food aligns with the user's 
dietary needs and preferences. Include the alignment percentage, explain 
any mismatches with their dietary requirements or health complications, 
and suggest 2-3 alternative dishes that would better match their preferences. 
Keep the response to a single, focused paragraph and instead of using "user" word in the paragrapgh use "your" keyword.`;

    console.log("Sending prompt to Mistral:", contextPrompt);

    // Get recommendation from Mistral
    const mistralResponse = await ollama.generate({
      model: 'mistral',
      prompt: contextPrompt
    });

    console.log("Received Mistral response:", mistralResponse);

    // Send combined response
    res.json({
      userId,
      foodItemId,
      foodName: foodItem.name,
      similarityScore: similarityScore,
      recommendation: mistralResponse.response,
      nutritionInfo
    });

  } catch (error) {
    console.error('Error generating food recommendation:', error);
    res.status(500).json({
      error: 'Error generating food recommendation',
      details: error.message
    });
  }
});



async function getUserEmbedding(userInfo) {
  try {
    const inputText = JSON.stringify(userInfo);
    console.log('Sending to Ollama for embedding:', inputText);

    const response = await ollama.embed({
      model: "mistral",
      input: inputText,
    });

    console.log("Embeding from ollama:", response.embeddings);
    return response.embeddings;

  } catch (error) {
    console.error("Failed to get Embeddings Detailed error in getUserEmbedding:", error.message);
    throw error;
  }
}

async function getFoodEmbedding(foodItemsData) {
  try {
    console.log(foodItemsData);
    const inputText = JSON.stringify(foodItemsData);

    const response = await ollama.embed({
      model: "mistral",
      input: inputText,
    });

    console.log("Food item embedding from Ollama:", response.embeddings);
    return response.embeddings;
  } catch (error) {
    console.error("Failed to get Fooditem embedding from Ollama:", error.message);
    throw error;
  }
}


app.post("/api/users", async (req, res) => {
  const { age, height, weight, caloric_target, protein_target, dietary_preferences, complications } = req.body;

  const userInfo = {
    age,
    height,
    weight,
    caloric_target,
    protein_target,
    dietary_preferences,
    complications,
  };

  try {
    console.log("Getting embedding for user info:", userInfo);

    const embeddingArray = await getUserEmbedding(userInfo);


    const embeddingString = `[${embeddingArray.join(",")}]`;

    console.log("Preparing to execute database query");


    const query = `
      INSERT INTO users (age, height, weight, caloric_target, protein_target, dietary_preferences, complications, embedding)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector)
      RETURNING id;
    `;
    const result = await pool.query(query, [
      age,
      height,
      weight,
      caloric_target,
      protein_target,
      dietary_preferences.join(','),
      complications.join(','),
      embeddingString
    ]);
    const userId = result.rows[0].id;
    console.log("User Data successfully Stored");
    res.status(201).json({
      message: "User information stored successfully",
      userId: userId,

    });
  } catch (err) {
    console.error("Error storing user information:", err);

    res.status(500).json({ error: "Error storing user information" });
  }
});





app.post('/api/analyze-food', upload.single('image'), async (req, res) => {
  try {

    const userId = req.body.userId || req.query.userId || req.headers['user-id'];
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const imageBase64 = req.file.buffer.toString('base64');

    // Send the image to Ollama's llava model
    console.log('Sending image to llava model...');
    const response = await ollama.generate({
      model: 'llava:7b',
      prompt: 'Please analyze this image and describe the food dish present. Include:The name of the dish,Main ingredients visible,Type of cuisine, Whether it appears to be a complete dish or part of a larger meal,Be as specific and short as possible about the dish identity and characteristics you can observe.',
      images: [imageBase64],
    });

    console.log('Received response from llava model:', response);

    if (!response || !response.response) {
      throw new Error('No valid response from llava model');
    }

    const fullNutritionInfo = `
       Food Item: Cheesecake
       Calories: 370-400
       Total Fat: 26-30g
       Cholesterol: 125mg
       Sodium: 300-350mg
       Carbohydrates: 30-35g (Sugars: 24-28g)
       Protein: 7-8g
    `;

    // Now send the result to the mistral model for nutritional analysis
    console.log('Sending response to mistral model...');
    const mistralResponse = await ollama.generate({
      model: 'mistral',
      prompt: `Provide only the nutrition stats for ${response.response} in the following format: ${fullNutritionInfo}. No additional information is needed. Follow this rule Stricitly`,
    });

    console.log('Received response from mistral model:', mistralResponse);

    if (!mistralResponse || !mistralResponse.response) {
      throw new Error('No valid response from mistral model');
    }

    // Split by newlines and process nutrition data
    const foodItemsData = mistralResponse.response.split('\n').reduce((acc, line) => {
      const match = line.match(/^(.*?):\s*(.*?)$/);
      if (match) {
        acc[match[1].trim()] = match[2].trim();
      }
      return acc;
    }, {});

    console.log('Structured Nutrition Data:', foodItemsData);

    // Get food item name and log it
    const foodItemName = foodItemsData['Food Item'];

    console.log("Sending data to embed function");

    // Get embeddings for food items data
    const embeddingArray = await getFoodEmbedding(foodItemsData);

    if (!embeddingArray || !Array.isArray(embeddingArray)) {
      throw new Error("Invalid embedding format received from Mistral");
    }

    const embeddingString = `[${embeddingArray.join(",")}]`;

    // Prepare query for database insertion
    const query = `
      INSERT INTO food_items (name, embedding, nutrition_info)
      VALUES ($1, $2::vector, $3)
      RETURNING id;
    `;

    const nutritionInfo = JSON.stringify([{
      calories: foodItemsData.Calories,
      totalFat: foodItemsData['Total Fat'],
      cholesterol: foodItemsData.Cholesterol,
      sodium: foodItemsData.Sodium,
      carbohydrates: foodItemsData.Carbohydrates,
      protein: foodItemsData.Protein,
    }]);

    // Insert into database
    const result = await pool.query(query, [foodItemName, embeddingString, nutritionInfo]);

    console.log(`Food item stored successfully with ID: ${result.rows[0].id}`);


    const foodItemId = result.rows[0].id;

    // Get recommendation using the new endpoint logic
    const recommendationResponse = await fetch(`http://localhost:${port}/api/recommend-food`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        foodItemId,
      }),
    });

    const recommendation = await recommendationResponse.json();
    console.log("Recieved the whole data");
    console.log(recommendation);
    res.json({
      message: "Food item analyzed and stored successfully.",
      foodItemId,
      foodAnalysis: foodItemsData,
      recommendation,
    });




  } catch (error) {
    console.error('Error analyzing image:', error);

    res.status(500).json({ error: 'Error analyzing image' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
