import { useState, useEffect } from 'react'
import { Loader2, Upload } from 'lucide-react'

export default function Mainpage() {
  const [selectedImage, setSelectedImage] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const BACKEND_URL = process.env.BACKEND_URL;
  const optimizeImage = (file) => {
    return new Promise((resolve) => {
      const MAX_WIDTH = 1024
      const MAX_HEIGHT = 1024
      const QUALITY = 0.95

      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target.result

        img.onload = () => {
          let width = img.width
          let height = img.height

          if (width > MAX_WIDTH || height > MAX_HEIGHT) {
            const aspectRatio = width / height

            if (width > height) {
              if (width > MAX_WIDTH) {
                width = MAX_WIDTH
                height = Math.round(width / aspectRatio)
              }
            } else {
              if (height > MAX_HEIGHT) {
                height = MAX_HEIGHT
                width = Math.round(height * aspectRatio)
              }
            }
          }

          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d', {
            colorSpace: 'srgb',
            willReadFrequently: true
          })

          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(img, 0, 0, width, height)

          canvas.toBlob(
            (blob) => {
              const optimizedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              })
              resolve(optimizedFile)
            },
            'image/jpeg',
            QUALITY
          )
        }
      }
    })
  }

  const handleImageChange = async (event) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0]
      try {
        const optimizedImage = await optimizeImage(file)
        setSelectedImage(optimizedImage)
        setPreviewUrl(URL.createObjectURL(optimizedImage))

        if (previewUrl) {
          URL.revokeObjectURL(previewUrl)
        }
      } catch (error) {
        console.error('Error optimizing image:', error)
        alert('Error processing image. Please try another image.')
      }
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!selectedImage) {
      alert('Please select an image first!')
      return
    }

    setLoading(true)

    const userId = localStorage.getItem('userId')
    if (!userId) {
      throw new Error('No user ID found. Please register first.')
    }

    const formData = new FormData()
    formData.append('image', selectedImage)
    formData.append('userId', userId)

    try {
      const response = await fetch(`https://${BACKEND_URL}/api/analyze-food`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to analyze image')
      }

      const data = await response.json()
      console.log(data)
      setAnalysisResult(data)
    } catch (error) {
      console.error('Error:', error)
      setAnalysisResult({ error: 'An error occurred while analyzing the image.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-start mb-8">
          <div className="flex items-center justify-between w-full">
            <div>
              <h2 className="text-2xl font-bold text-black">NutritionAI</h2>
              <p className="text-lg text-gray-600 mt-2">Your personal AI-powered nutrition assistant</p>
            </div>
            <div className="bg-red-100 bg-opacity-50 text-red-700 p-3 rounded-lg text-sm max-w-xs">
              <p>Processing may take 5-10 minutes (running on Ubuntu t2.large on AWS).</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8 mt-20 mr-10">
          {/* Left side - Image upload */}
          <div className="w-full md:w-1/2">
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="flex items-center justify-center w-full">
                    <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-96 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors duration-300 relative overflow-hidden">
                      {previewUrl ? (
                        <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-contain p-4" />
                      ) : (
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-10 h-10 mb-3 text-gray-400" />
                          <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                          <p className="text-xs text-gray-500">PNG, JPG or GIF (MAX. 800x600px)</p>
                        </div>
                      )}
                      <input id="dropzone-file" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    </label>
                  </div>
                  <button
                    type="submit"
                    className={`w-full py-3 px-4 font-bold text-white rounded-lg focus:outline-none focus:shadow-outline transition duration-150 ease-in-out ${loading ? 'bg-gray-400' : 'bg-black hover:bg-gray-800'}`}
                    disabled={!selectedImage || loading}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center">
                        <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                        Analyzing...
                      </span>
                    ) : (
                      'Analyze Image'
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Right side - Nutrition and Recommendation */}
          <div className="w-full md:w-1/2 space-y-8">
            {analysisResult && !analysisResult.error && (
              <>
                <div className="bg-white shadow rounded-lg overflow-hidden">
                  <div className="bg-gray-50 py-3 px-4">
                    <h3 className="text-lg font-bold text-gray-900">Nutrition Information</h3>
                  </div>
                  <div className="p-4">
                    <h4 className="text-md font-semibold mb-2">{analysisResult.foodAnalysis['Food Item']}</h4>
                    <ul className="space-y-2 text-sm">
                      <li><span className="font-semibold">Calories:</span> {analysisResult.foodAnalysis.Calories}</li>
                      <li><span className="font-semibold">Total Fat:</span> {analysisResult.foodAnalysis['Total Fat']}</li>
                      <li><span className="font-semibold">Cholesterol:</span> {analysisResult.foodAnalysis.Cholesterol}</li>
                      <li><span className="font-semibold">Sodium:</span> {analysisResult.foodAnalysis.Sodium}</li>
                      <li><span className="font-semibold">Carbohydrates:</span> {analysisResult.foodAnalysis.Carbohydrates}</li>
                      <li><span className="font-semibold">Protein:</span> {analysisResult.foodAnalysis.Protein}</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-white shadow rounded-lg overflow-hidden">
                  <div className="bg-gray-50 py-3 px-4">
                    <h3 className="text-lg font-bold text-gray-900">Diet Match: &quot;Tailored to your needs&quot;</h3>
                  </div>
                  <div className="p-4">
                    <div className="whitespace-pre-line text-sm text-gray-700">
                      {analysisResult.recommendation.recommendation}
                    </div>
                  </div>
                </div>
              </>
            )}

            {analysisResult?.error && (
              <div className="mt-6 p-4 bg-red-50 text-red-600 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Error:</h3>
                <p>{analysisResult.error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
