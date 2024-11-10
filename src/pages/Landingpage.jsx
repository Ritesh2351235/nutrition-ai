import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [caloricTarget, setCaloricTarget] = useState('');
  const [proteinTarget, setProteinTarget] = useState('');
  const [dietaryPreferences, setDietaryPreferences] = useState('');
  const [healthConditions, setHealthConditions] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const BACKEND_URL = process.env.BACKEND_URL;
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = {
      age: parseInt(age),
      height: parseFloat(height),
      weight: parseFloat(weight),
      caloric_target: parseInt(caloricTarget),
      protein_target: parseInt(proteinTarget),
      dietary_preferences: dietaryPreferences.split(',').map(item => item.trim()),
      complications: healthConditions.split(',').map(item => item.trim())
    };

    console.log('Form submitted:', formData);
    
    try {
      const response = await fetch(`https://${BACKEND_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to send the Data: ${errorText}`);
      }
      
      const result = await response.json();

      if (result.userId) {
        localStorage.setItem('userId', result.userId);
      }
      console.log('Response from server:', result);

      navigate('/main');
    } catch (e) {
      console.log(`Error while sending the data: ${e}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col relative">
      {/* Logo */}
      <div className="absolute top-4 left-4 z-10">
        <h2 className="text-xl font-bold text-black">NutritionAI</h2>
      </div>

      {/* Main Content */}
      <div className="flex-grow flex flex-col md:flex-row">
        {/* Left Half - Form */}
        <div className="w-full md:w-1/2 flex flex-col justify-center items-center p-8 mt-20">
          <div className="w-full max-w-md border-2 border-black rounded-lg p-6">
            <h2 className="text-2xl font-bold text-black mb-6">User Details</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="age" className="block text-sm font-medium text-gray-700">Age</label>
                <input type="number" id="age" value={age} onChange={(e) => setAge(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring focus:ring-black focus:ring-opacity-50" required />
              </div>
              <div>
                <label htmlFor="height" className="block text-sm font-medium text-gray-700">Height (cm)</label>
                <input type="number" id="height" value={height} onChange={(e) => setHeight(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring focus:ring-black focus:ring-opacity-50" required />
              </div>
              <div>
                <label htmlFor="weight" className="block text-sm font-medium text-gray-700">Weight (kg)</label>
                <input type="number" id="weight" value={weight} onChange={(e) => setWeight(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring focus:ring-black focus:ring-opacity-50" required />
              </div>
              <div>
                <label htmlFor="caloricTarget" className="block text-sm font-medium text-gray-700">Caloric Target</label>
                <input type="number" id="caloricTarget" value={caloricTarget} onChange={(e) => setCaloricTarget(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring focus:ring-black focus:ring-opacity-50" required />
              </div>
              <div>
                <label htmlFor="proteinTarget" className="block text-sm font-medium text-gray-700">Protein Target (g)</label>
                <input type="number" id="proteinTarget" value={proteinTarget} onChange={(e) => setProteinTarget(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring focus:ring-black focus:ring-opacity-50" required />
              </div>
              <div>
                <label htmlFor="dietaryPreferences" className="block text-sm font-medium text-gray-700">Dietary Preferences (comma-separated)</label>
                <input type="text" id="dietaryPreferences" value={dietaryPreferences} onChange={(e) => setDietaryPreferences(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring focus:ring-black focus:ring-opacity-50" />
              </div>
              <div>
                <label htmlFor="healthConditions" className="block text-sm font-medium text-gray-700">Health Conditions (comma-separated)</label>
                <input type="text" id="healthConditions" value={healthConditions} onChange={(e) => setHealthConditions(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring focus:ring-black focus:ring-opacity-50" />
              </div>
              <div>
                <button 
                  type="submit" 
                  className="w-full bg-black text-white py-2 px-4 rounded-md text-sm font-semibold hover:bg-gray-800 transition duration-300 flex items-center justify-center"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    'Submit'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Half - Content */}
        <div className="w-full md:w-1/2 flex flex-col justify-center p-8 bg-gray-50">
          <div className="max-w-md mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              NutritionAI
            </h1>
            <p className="text-base text-gray-600 mb-6">
            Your personal AI nutritionist that analyzes eating habits, suggests balanced meal plans, and provides real-time guidance for healthier lifestyle choices.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full text-center text-gray-500 p-4">
        <p>&copy; {new Date().getFullYear()} NutritionAI. All rights reserved.</p>
      </footer>
    </div>
  );
}
