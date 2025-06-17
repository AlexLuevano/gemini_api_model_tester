import React, { useState, useCallback, useMemo } from 'react';

// Main App Component
const App = () => {
    // --- STATE MANAGEMENT ---
    const [apiKey, setApiKey] = useState('');
    const [models, setModels] = useState([]);
    const [selectedModel, setSelectedModel] = useState('');
    const [prompt, setPrompt] = useState('Write a short story about a robot who discovers music.');
    const [result, setResult] = useState('');
    const [error, setError] = useState(null);
    const [isListing, setIsListing] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [isKeySaved, setIsKeySaved] = useState(false);

    // --- GENERIC ERROR HANDLER ---
    const handleApiError = (err) => {
        let errorMessage = err.message;
        // Check for the specific 'Failed to fetch' TypeError, which often indicates a CORS or network issue.
        if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
            errorMessage = 'A network error occurred. This is often due to a CORS policy on the API server. Please check the browser\'s developer console (press F12) for specific errors. Your network, a VPN, or a browser extension (like an ad-blocker) could also be blocking the request.';
        }
        setError(errorMessage);
    };

    // --- API CALLS ---

    /**
     * Fetches the list of available models from the Gemini API.
     * Switched to v1 endpoint for better stability.
     */
    const handleListModels = useCallback(async () => {
        if (!apiKey) {
            setError('Please enter your API Key first.');
            return;
        }

        setIsListing(true);
        setError(null);
        setModels([]);
        setResult('');

        try {
            const response = await fetch('https://generativelanguage.googleapis.com/v1/models', {
                headers: {
                    'x-goog-api-key': apiKey,
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Failed to fetch models. Check your API key and permissions.');
            }

            const data = await response.json();
            // Filter for models that support 'generateContent' and sort them
            const supportedModels = data.models
                .filter(model => model.supportedGenerationMethods.includes('generateContent'))
                .sort((a, b) => a.displayName.localeCompare(b.displayName));

            setModels(supportedModels);
            if (supportedModels.length > 0) {
                setSelectedModel(supportedModels[0].name); // Default to the first model
            } else {
                 setError("No models that support 'generateContent' were found for this API key.");
            }
        } catch (err) {
            handleApiError(err);
            setModels([]);
        } finally {
            setIsListing(false);
        }
    }, [apiKey]);

    /**
     * Sends a test prompt to the selected model.
     * Switched to v1 endpoint for better stability.
     */
    const handleTestModel = useCallback(async () => {
        if (!selectedModel || !prompt) {
            setError('Please select a model and enter a prompt.');
            return;
        }

        setIsTesting(true);
        setError(null);
        setResult('');

        const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${selectedModel.replace('models/', '')}:generateContent`;

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey,
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Failed to get a response from the model.');
            }

            const data = await response.json();
            
            if (data.candidates && data.candidates.length > 0 && data.candidates[0].content?.parts?.length > 0) {
                 const text = data.candidates[0].content.parts[0].text;
                 setResult(text);
            } else {
                 setResult("The model returned a response, but it was empty. This can sometimes happen due to safety settings or certain prompts.");
            }

        } catch (err) {
            handleApiError(err);
            setResult('');
        } finally {
            setIsTesting(false);
        }
    }, [apiKey, selectedModel, prompt]);

    // --- MEMOIZED COMPONENTS for performance ---
    const memoizedModels = useMemo(() => models, [models]);

    // --- RENDER ---
    return (
        <div className="bg-gray-900 text-gray-100 min-h-screen font-sans flex items-center justify-center p-4">
            <div className="w-full max-w-3xl mx-auto bg-gray-800 rounded-2xl shadow-2xl p-6 md:p-10 space-y-8">

                {/* Header */}
                <div className="text-center">
                    <h1 className="text-3xl md:text-4xl font-bold text-cyan-400">Gemini API Model Tester</h1>
                    <p className="text-gray-400 mt-2">Verify your API key, list available models, and test them live.</p>
                </div>

                {/* Step 1: API Key Input */}
                <div className="space-y-4">
                    <label htmlFor="apiKey" className="block text-lg font-medium text-gray-300">
                        Step 1: Enter Your Google AI API Key
                    </label>
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                        <input
                            id="apiKey"
                            type={isKeySaved ? "password" : "text"}
                            value={apiKey}
                            onChange={(e) => {
                                setApiKey(e.target.value);
                                setIsKeySaved(false);
                                setModels([]);
                                setResult('');
                                setError(null);
                            }}
                            placeholder="Enter your API Key here"
                            className="flex-grow bg-gray-700 text-gray-200 border border-gray-600 rounded-lg px-4 py-3 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition duration-200"
                            disabled={isListing || isTesting}
                        />
                        <button
                            onClick={() => {
                                handleListModels();
                                setIsKeySaved(true);
                            }}
                            disabled={!apiKey || isListing}
                            className="px-6 py-3 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition duration-200 flex items-center justify-center"
                        >
                            {isListing ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Listing...
                                </>
                            ) : "List Models"}
                        </button>
                    </div>
                </div>

                {/* Step 2 & 3: Model Selection and Testing */}
                {memoizedModels.length > 0 && (
                    <div className="space-y-6 pt-4 border-t border-gray-700">
                        {/* Model Selection */}
                        <div className="space-y-4">
                            <h2 className="text-lg font-medium text-gray-300">Step 2: Select a Model</h2>
                            <p className="text-sm text-gray-400">The list is filtered to show models supporting text generation.</p>
                            <select
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value)}
                                className="w-full bg-gray-700 text-gray-200 border border-gray-600 rounded-lg px-4 py-3 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                            >
                                {memoizedModels.map((model) => (
                                    <option key={model.name} value={model.name}>
                                        {model.displayName} ({model.name.replace('models/', '')})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Prompt and Test Button */}
                        <div className="space-y-4">
                            <h2 className="text-lg font-medium text-gray-300">Step 3: Test the Model</h2>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                rows="4"
                                placeholder="Enter your test prompt here"
                                className="w-full bg-gray-700 text-gray-200 border border-gray-600 rounded-lg px-4 py-3 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none resize-y"
                            ></textarea>
                            <button
                                onClick={handleTestModel}
                                disabled={isTesting}
                                className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-gray-500 transition duration-200 flex items-center justify-center"
                            >
                                {isTesting ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Testing...
                                    </>
                                ) : "Test Selected Model"}
                            </button>
                        </div>
                    </div>
                )}
                
                {/* Results and Error Display */}
                <div className="pt-6 border-t border-gray-700 min-h-[100px]">
                    {error && (
                        <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg" role="alert">
                            <strong className="font-bold">Error: </strong>
                            <span className="block sm:inline">{error}</span>
                        </div>
                    )}

                    {result && (
                        <div className="space-y-3">
                             <h3 className="text-lg font-medium text-gray-300">Result:</h3>
                             <div className="bg-gray-900/70 p-4 rounded-lg">
                                <pre className="text-gray-200 whitespace-pre-wrap font-sans text-sm">{result}</pre>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default App;
