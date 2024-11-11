# NutritionAI
### This is a submission for the Open Source AI Challenge with pgai and Ollama

NutritionAI is an innovative application designed to help users achieve their dietary goals by providing personalized nutritional insights. By allowing users to upload pictures of their daily meals, the app analyzes the nutritional content and offers tailored recommendations based on individual dietary needs.

NutritionAI simplifies the journey to healthier eating by enabling users to sign up easily, upload meal images, and receive detailed nutritional statistics that align with their diet goals.


![Toppage](https://github.com/Ritesh2351235/nutrition-ai/blob/main/Logo.png)


## Key Features
- **Sign Up Form**: Create a personalized account to track your dietary journey.
- **Meal Upload**: Easily upload pictures of your meals for analysis.
- **Nutritional Insights**: Receive detailed nutritional information for each meal.
- **Personalized Recommendations**: Get tailored dietary suggestions based on your profile and preferences.
- **Daily Tracking**: Track your nutritional intake and progress towards goals.
- **Health Considerations**: Recommendations take into account your specified health complications.


## Tech Stack
- **Vite**: A fast build tool for rapid development.
- **React**: Framework for building dynamic user interfaces.
- **Tailwind CSS**: Utility-first CSS framework for styling.
- **Node.js**: JavaScript runtime for backend development.
- **Express**: Framework for handling API requests and routing.
- **Multer**: Middleware for processing file uploads.
- **Ollama Models**:
   - **Llava Model**: Analyzes meal images to identify dishes.
   - **Mistral Model**: Generates nutritional content and embeddings.
- **TimescaleDB (PostgreSQL)**: Database for storing user and nutritional data.
- **Amazon EC2 (Ubuntu t2.large)**: Hosts the Node.js application.
- **Vercel**: Deploys the frontend application efficiently.

## Architecture
![Architecture](https://github.com/Ritesh2351235/nutrition-ai/blob/main/NutritionAi.png)

## Demo 
![Demo](https://github.com/Ritesh2351235/nutrition-ai/blob/main/demo.png)
