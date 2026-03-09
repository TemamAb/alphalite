const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIServiceFactory {
    constructor() {
        this.clients = {
            openai: null,
            gemini: null,
            'gemini-studio': null
        };
        this.config = {};
    }

    /**
     * Initialize the factory with API keys
     * @param {object} config - Configuration object containing API keys
     */
    initialize(config) {
        this.config = config;
        
        // Initialize OpenAI if key is present
        if (config.openaiApiKey) {
            this.clients.openai = new OpenAI({
                apiKey: config.openaiApiKey
            });
        }

        // Initialize Gemini if key is present
        if (config.geminiApiKey) {
            this.clients.gemini = new GoogleGenerativeAI(config.geminiApiKey);
            // Gemini Studio might use the same SDK but different models or endpoints
            this.clients['gemini-studio'] = new GoogleGenerativeAI(config.geminiApiKey); 
        }
    }

    /**
     * Get an AI client instance based on the provider name
     * @param {string} provider - 'openai', 'gemini', or 'gemini-studio'
     * @returns {object} The AI client wrapper
     */
    getService(provider = 'openai') {
        const client = this.clients[provider];
        if (!client) {
            throw new Error(`AI Provider '${provider}' not configured or initialized.`);
        }

        return {
            provider,
            client,
            generateResponse: async (prompt, context = {}) => {
                return this._generateResponse(provider, client, prompt, context);
            }
        };
    }

    /**
     * Internal method to normalize responses across providers
     */
    async _generateResponse(provider, client, prompt, context) {
        try {
            if (provider === 'openai') {
                const completion = await client.chat.completions.create({
                    messages: [{ role: "system", content: context.systemPrompt || "You are a helpful assistant." }, { role: "user", content: prompt }],
                    model: "gpt-4-turbo-preview",
                });
                return completion.choices[0].message.content;
            } 
            
            if (provider === 'gemini' || provider === 'gemini-studio') {
                // For Gemini, we use the generative model
                const modelName = provider === 'gemini-studio' ? "gemini-1.5-pro-latest" : "gemini-pro";
                const model = client.getGenerativeModel({ model: modelName });
                
                const result = await model.generateContent([context.systemPrompt || "", prompt]);
                const response = await result.response;
                return response.text();
            }

            throw new Error(`Unsupported provider logic for ${provider}`);
        } catch (error) {
            console.error(`[AI-FACTORY] Error generating response with ${provider}:`, error);
            throw error;
        }
    }
}

module.exports = new AIServiceFactory();