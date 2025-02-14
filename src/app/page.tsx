'use client';

import { useState, KeyboardEvent } from 'react';
import { FiInfo, FiDownload, FiCopy } from 'react-icons/fi';
import { IoMdClose } from 'react-icons/io';
import { fal } from "@fal-ai/client";

// Add debug logging for FAL configuration
console.log("FAL Key available:", !!process.env.NEXT_PUBLIC_FAL_KEY);

const LoadingAnimation = () => (
  <div className="w-full h-full flex items-center justify-center">
    <div className="relative w-3/4 h-3/4">
      {/* Shimmering background */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-white to-gray-200 animate-shimmer" />
      
      {/* Animated elements */}
      <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <div className="text-sm text-gray-500 animate-pulse">Creating your masterpiece...</div>
      </div>
    </div>
  </div>
);

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasAttemptedGeneration, setHasAttemptedGeneration] = useState(false);
  const [showApiInfo, setShowApiInfo] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    setHasAttemptedGeneration(true);
    
    try {
      console.log("Starting image generation with prompt:", prompt);
      fal.config({
        credentials: process.env.NEXT_PUBLIC_FAL_KEY
      });
      const result = await fal.subscribe("fal-ai/fast-sdxl", {
        input: {
          prompt: prompt,
          num_images: 4  // Generate 4 images in a single request
        },
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === "IN_PROGRESS") {
            update.logs.map((log) => log.message).forEach(console.log);
          }
        },
      });
      
      console.log("Full API response:", result);
      
      if (result.data?.images) {
        const urls = result.data.images.map(img => img.url);
        console.log("Image URLs received:", urls);
        setGeneratedImages(urls);
      } else {
        console.error("No images in response:", result.data);
      }
    } catch (error) {
      console.error('Error generating images:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleGenerate();
    }
  };

  const handleDownload = async (imageUrl: string, index: number) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `generated-image-${index + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  const handleCopy = async (imageUrl: string) => {
    try {
      // Fetch the image
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // Try to copy the image to clipboard
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob
          })
        ]);
        alert('Image copied to clipboard!');
      } catch (clipboardError) {
        // Fallback: If image copy fails, create a temporary canvas
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = imageUrl;
        });

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');
        
        ctx.drawImage(img, 0, 0);
        
        try {
          await new Promise((resolve, reject) => {
            canvas.toBlob(async (blob) => {
              if (blob) {
                try {
                  await navigator.clipboard.write([
                    new ClipboardItem({
                      [blob.type]: blob
                    })
                  ]);
                  resolve(true);
                } catch (err) {
                  reject(err);
                }
              } else {
                reject(new Error('Failed to create blob'));
              }
            });
          });
          alert('Image copied to clipboard!');
        } catch (canvasError) {
          throw new Error('Failed to copy image using canvas method');
        }
      }
    } catch (error) {
      console.error('Error copying image:', error);
      // If all methods fail, fall back to copying URL
      try {
        await navigator.clipboard.writeText(imageUrl);
        alert('Could not copy image directly. Image URL copied to clipboard instead!');
      } catch (urlError) {
        alert('Failed to copy image. Try downloading instead.');
      }
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header - made more compact */}
      <div className="bg-slate-700 text-white p-2 flex justify-between items-center">
        <h1 className="text-xl font-semibold">Home</h1>
        <button
          onClick={() => setShowApiInfo(true)}
          className="p-2 hover:bg-slate-600 rounded-full transition-colors"
          aria-label="API Information"
        >
          <FiInfo className="w-5 h-5" />
        </button>
      </div>

      {/* API Info Dialog */}
      {showApiInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
            <button
              onClick={() => setShowApiInfo(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
              aria-label="Close dialog"
            >
              <IoMdClose className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-semibold mb-4">What is an API?</h2>
            <div className="space-y-4 text-gray-600">
              <p>
                An API (Application Programming Interface) is like a digital waiter in a restaurant:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>You (the client) make a request, like ordering food</li>
                <li>The API takes your request to the kitchen (the server)</li>
                <li>The kitchen processes your order and prepares the response</li>
                <li>The API delivers the result back to you</li>
              </ul>
              <p>
                In this app, when you enter a description, we use an AI API to generate images based on your text.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Image Description Input - reduced top padding */}
      <div className="max-w-4xl mx-auto pt-4 px-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter the description of Image"
            className="flex-1 p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 transition-colors"
          >
            {isLoading ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>

      {/* Generated Images Grid - reduced size and spacing */}
      {hasAttemptedGeneration && (
        <div className="max-w-5xl mx-auto p-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-md p-2 aspect-square flex items-center justify-center overflow-hidden relative group h-[250px]"
              >
                {isLoading ? (
                  <LoadingAnimation />
                ) : generatedImages[index - 1] ? (
                  <>
                    <img 
                      src={generatedImages[index - 1]} 
                      alt={`Generated image ${index}`}
                      className="w-full h-full object-contain"
                    />
                    {/* Action buttons */}
                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleCopy(generatedImages[index - 1])}
                        className="p-1.5 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
                        title="Copy image"
                      >
                        <FiCopy className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => handleDownload(generatedImages[index - 1], index - 1)}
                        className="p-1.5 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
                        title="Download image"
                      >
                        <FiDownload className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500 text-sm">Generated image will appear here</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Initial State - reduced top margin */}
      {!hasAttemptedGeneration && (
        <div className="max-w-4xl mx-auto p-4 mt-8 text-center">
          <p className="text-gray-500 text-lg">
            Enter a description and click Generate to create images
          </p>
        </div>
      )}
    </main>
  );
}
