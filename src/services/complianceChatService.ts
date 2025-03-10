import { v4 as uuidv4 } from 'uuid';
import { ComplianceResult } from './types';
import { FormattedData } from './formatConverterDb';

// Message types for the chat
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

// Issue resolution suggestion type
export interface ResolutionSuggestion {
  issueId: string;
  field: string;
  currentValue: string;
  suggestedValue: string;
  recommendation: string;
  regulatoryReference?: string;
}

/**
 * Service for handling compliance-related chat interactions with enhanced issue resolution
 */
export class ComplianceChatService {
  // NOTE: In production, this should be loaded from environment variables
  private API_KEY = 'your_api_key_here';
  
  // Use the standard model name that is known to be available
  private MODEL_NAME = 'gemini-pro';
  
  // API URL with the standard endpoint path
  private API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${this.MODEL_NAME}:generateContent`;
  
  // Track if we're in offline mode (for debugging and fallbacks)
  private offlineMode = false;
  
  private complianceContext: {
    formattedData?: FormattedData;
    complianceResults?: ComplianceResult[];
  } = {};
  
  private chatHistory: ChatMessage[] = [];
  private resolutionSuggestions: ResolutionSuggestion[] = [];
  
  /**
   * Initialize with compliance data to provide context for the chat
   */
  setComplianceContext(formattedData: FormattedData, complianceResults: ComplianceResult[]) {
    // First check if we should operate in offline mode
    this.checkOfflineMode();
    
    this.complianceContext = {
      formattedData,
      complianceResults
    };
    
    // Add system message with context
    this.chatHistory = [this.createSystemMessage()];
    
    // Generate initial resolution suggestions for non-compliant issues
    this.generateResolutionSuggestions();
  }
  
  /**
   * Check if we should operate in offline mode
   */
  private checkOfflineMode() {
    try {
      this.offlineMode = !this.API_KEY || 
                          this.API_KEY.includes('your_api_key') || 
                          this.API_KEY.includes('api-key');
      
      if (this.offlineMode) {
        console.warn('ComplianceChatService: Operating in offline mode (no valid API key)');
      }
    } catch (e) {
      console.error('Error checking offline mode:', e);
      this.offlineMode = true;
    }
  }
  
  /**
   * Create the system message with enhanced compliance context and issue resolution focus
   */
  private createSystemMessage(): ChatMessage {
    const shipmentData = this.complianceContext.formattedData?.fields || {};
    const results = this.complianceContext.complianceResults || [];
    
    // Get non-compliant and warning items for context
    const nonCompliantIssues = results.filter(r => r.status === 'non-compliant');
    const warningIssues = results.filter(r => r.status === 'warning');
    
    // Extract country-specific information if available
    const destinationCountry = 
      shipmentData.destinationCountry || 
      shipmentData.recipientCountry || 
      shipmentData.destinationcountry || 
      shipmentData.country || 
      'Unknown';
    
    let contextMessage = `
You are an advanced logistics compliance assistant specializing in resolving shipping compliance issues.
You are an expert in international shipping regulations, customs requirements, and compliance standards.

## SHIPMENT DETAILS
The user is working with a shipment with the following details:
${Object.entries(shipmentData).map(([key, value]) => `- ${key}: ${value || 'Not provided'}`).join('\n')}

## COMPLIANCE ISSUES
${nonCompliantIssues.length > 0 ? `The following critical compliance issues have been detected and must be resolved:
${nonCompliantIssues.map((issue, idx) => `${idx + 1}. CRITICAL - ${issue.field}: ${issue.message}`).join('\n')}` : 'No critical compliance issues detected.'}

${warningIssues.length > 0 ? `The following warnings have been detected and should be addressed:
${warningIssues.map((issue, idx) => `${idx + 1}. WARNING - ${issue.field}: ${issue.message}`).join('\n')}` : 'No compliance warnings detected.'}

## YOUR ROLE
Your primary goal is to help the user FIX non-compliant issues by:
1. Explaining precisely what's wrong with each flagged field
2. Providing specific instructions on how to correct each issue
3. Suggesting valid values or formats that would resolve each issue
4. Explaining relevant regulations for the destination country (${destinationCountry})
5. Giving step-by-step guidance to achieve compliance

## CAPABILITIES
You can:
- Analyze shipping compliance issues
- Identify missing or incorrect shipment information
- Explain country-specific requirements and restrictions
- Recommend corrections with proper formats and values 
- Interpret regulatory requirements like harmonized tariff codes
- Explain cross-border shipping requirements
- Suggest alternatives for restricted or prohibited items

## RESPONSE STYLE
- Be direct and action-oriented with specific recommendations
- Use bullet points for multiple steps or requirements
- Include actual examples of compliant values
- Cite regulatory references when relevant
- Be conversational but focused on solving the compliance issues

For critical issues, always include step-by-step correction instructions.
    `;
    
    return {
      id: uuidv4(),
      role: 'system',
      content: contextMessage,
      timestamp: new Date()
    };
  }
  
  /**
   * Generate initial resolution suggestions for non-compliant issues
   */
  private async generateResolutionSuggestions() {
    try {
      const results = this.complianceContext.complianceResults || [];
      const shipmentData = this.complianceContext.formattedData?.fields || {};
      
      // Focus only on non-compliant issues
      const nonCompliantIssues = results.filter(r => r.status === 'non-compliant');
      
      if (nonCompliantIssues.length === 0) {
        this.resolutionSuggestions = [];
        return;
      }
      
      // If we're in offline mode, use fallback suggestions
      if (this.offlineMode) {
        console.log('Generating fallback resolution suggestions (offline mode)');
        this.createFallbackSuggestions(nonCompliantIssues, shipmentData);
        return;
      }
      
      // Prepare prompt for Gemini to generate resolution suggestions
      const prompt = `
I need specific resolution suggestions for these non-compliant shipping issues:

${nonCompliantIssues.map((issue, idx) => 
  `Issue ${idx + 1}: ${issue.field}
  - Current value: ${issue.value || 'Missing'}
  - Problem: ${issue.message}
`).join('\n')}

Current shipment data:
${Object.entries(shipmentData).map(([key, value]) => `- ${key}: ${value || 'Not provided'}`).join('\n')}

For EACH issue, provide:
1. A specific suggested value that would fix the issue
2. Step-by-step instructions for correction
3. Any regulatory references or standards that apply

Format your response as JSON in this exact structure:
[
  {
    "issueId": "issue number",
    "field": "field name",
    "currentValue": "current value or Missing",
    "suggestedValue": "suggested corrected value",
    "recommendation": "step-by-step instructions to fix",
    "regulatoryReference": "relevant regulation if applicable"
  },
  ...
]
`;
      
      try {
        // Test API connection with a simple request before making the full request
        const testResponse = await this.testApiConnection();
        if (!testResponse) {
          console.error('API connection test failed, falling back to offline mode');
          this.offlineMode = true;
          this.createFallbackSuggestions(nonCompliantIssues, shipmentData);
          return;
        }
        
        const response = await fetch(`${this.API_URL}?key=${this.API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: prompt }]
              }
            ],
            generationConfig: {
              temperature: 0.2,
              topP: 0.95,
              topK: 40,
              maxOutputTokens: 2048,
            }
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API error:', response.status, errorText);
          this.offlineMode = true;
          this.createFallbackSuggestions(nonCompliantIssues, shipmentData);
          return;
        }
        
        const data = await response.json();
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
          const text = data.candidates[0].content.parts[0].text;
          
          // Extract the JSON from the response
          try {
            // Try to find JSON array in the response using regex
            const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
            
            if (jsonMatch) {
              const suggestions = JSON.parse(jsonMatch[0]);
              if (Array.isArray(suggestions) && suggestions.length > 0) {
                this.resolutionSuggestions = suggestions;
                console.log('Generated resolution suggestions:', this.resolutionSuggestions);
                return;
              }
            }
            
            // If we couldn't extract valid JSON, fall back to our default suggestions
            console.warn('Could not parse valid JSON from API response, using fallback suggestions');
            this.createFallbackSuggestions(nonCompliantIssues, shipmentData);
          } catch (parseError) {
            console.error('Error parsing resolution suggestions:', parseError);
            this.createFallbackSuggestions(nonCompliantIssues, shipmentData);
          }
        } else {
          console.warn('Invalid API response format, using fallback suggestions');
          this.createFallbackSuggestions(nonCompliantIssues, shipmentData);
        }
      } catch (fetchError) {
        console.error('Error fetching from API:', fetchError);
        this.offlineMode = true;
        this.createFallbackSuggestions(nonCompliantIssues, shipmentData);
      }
    } catch (error) {
      console.error('Error generating resolution suggestions:', error);
      // Create fallback suggestions on error
      const nonCompliantIssues = (this.complianceContext.complianceResults || [])
        .filter(r => r.status === 'non-compliant');
      this.createFallbackSuggestions(nonCompliantIssues, this.complianceContext.formattedData?.fields || {});
    }
  }
  
  /**
   * Test API connection with a minimal request
   * @returns true if connection is successful, false otherwise
   */
  private async testApiConnection(): Promise<boolean> {
    try {
      console.log('Testing API connection with key:', this.API_KEY.substring(0, 6) + '...');
      
      // Use the correct models endpoint for Gemini
      const testUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${this.API_KEY}`;
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        console.log('API connection test successful');
        // Test a simple content generation to verify full access
        return await this.testContentGeneration();
      } else {
        const errorText = await response.text();
        console.error('API connection test failed:', response.status, errorText);
        return false;
      }
    } catch (error) {
      console.error('API connection test error:', error);
      return false;
    }
  }

  /**
   * Test actual content generation with a simple prompt
   */
  private async testContentGeneration(): Promise<boolean> {
    try {
      const testPrompt = "Respond with only the word 'SUCCESS' if you can read this message.";
      
      const response = await fetch(`${this.API_URL}?key=${this.API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: testPrompt }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 100,
          }
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Content generation test failed:', response.status, errorText);
        return false;
      }
      
      const data = await response.json();
      console.log('Content generation test response:', data);
      
      if (data.candidates && 
          data.candidates[0] && 
          data.candidates[0].content && 
          data.candidates[0].content.parts && 
          data.candidates[0].content.parts[0].text) {
        console.log('Content generation successful');
        return true;
      }
      
      console.error('Invalid content generation response format');
      return false;
    } catch (error) {
      console.error('Content generation test error:', error);
      return false;
    }
  }
  
  /**
   * Create fallback resolution suggestions based on common rules
   */
  private createFallbackSuggestions(issues: ComplianceResult[], shipmentData: Record<string, string>) {
    const suggestions: ResolutionSuggestion[] = [];
    
    issues.forEach((issue, index) => {
      const fieldKey = issue.field.toLowerCase();
      let suggestion: ResolutionSuggestion = {
        issueId: `issue-${index + 1}`,
        field: issue.field,
        currentValue: issue.value || 'Missing',
        suggestedValue: '',
        recommendation: 'Please provide a valid value for this field.'
      };
      
      // Common patterns for different field types
      if (fieldKey.includes('track') || fieldKey.includes('shipment')) {
        suggestion.suggestedValue = 'AB123456789XYZ';
        suggestion.recommendation = 'Enter a valid tracking number. It should be alphanumeric and at least 8 characters.';
      } else if (fieldKey.includes('country') || fieldKey.includes('destination')) {
        suggestion.suggestedValue = 'US';
        suggestion.recommendation = 'Enter a valid 2-letter country code (ISO 3166-1 alpha-2).';
        suggestion.regulatoryReference = 'ISO 3166-1';
      } else if (fieldKey.includes('value') || fieldKey.includes('price')) {
        suggestion.suggestedValue = '100.00';
        suggestion.recommendation = 'Enter a numeric value with up to 2 decimal places.';
      } else if (fieldKey.includes('date')) {
        suggestion.suggestedValue = new Date().toISOString().split('T')[0];
        suggestion.recommendation = 'Enter a date in YYYY-MM-DD format.';
      } else if (fieldKey.includes('code') || fieldKey.includes('commodit')) {
        suggestion.suggestedValue = '8471300000';
        suggestion.recommendation = 'Enter a valid 6-10 digit Harmonized System (HS) code.';
        suggestion.regulatoryReference = 'Harmonized Tariff Schedule';
      } else if (fieldKey.includes('weight')) {
        suggestion.suggestedValue = '2.5 kg';
        suggestion.recommendation = 'Enter weight with a numeric value followed by a unit (kg, g, lb, oz).';
      } else if (fieldKey.includes('name')) {
        suggestion.suggestedValue = fieldKey.includes('recipient') ? 'John Smith' : 'ABC Company Ltd.';
        suggestion.recommendation = 'Enter a valid name with at least 2 characters.';
      }
      
      suggestions.push(suggestion);
    });
    
    this.resolutionSuggestions = suggestions;
  }
  
  /**
   * Send a message and get a response with enhanced capabilities
   */
  async sendMessage(userMessage: string): Promise<ChatMessage> {
    if (!userMessage || !userMessage.trim()) {
      return {
        id: uuidv4(),
        role: 'assistant',
        content: 'I don\'t understand your question. Could you please try again?',
        timestamp: new Date()
      };
    }
    
    // Add user message to history
    const userChatMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: userMessage.trim(),
      timestamp: new Date()
    };
    
    this.chatHistory.push(userChatMessage);
    
    // First, check if this is a request for specific help with a compliance issue
    const isAskingForFieldHelp = this.detectFieldSpecificQuestion(userMessage);
    
    // Generate assistant response with appropriate context
    try {
      let response: ChatMessage;
      
      if (isAskingForFieldHelp) {
        // Enhance the response with specific field guidance from resolutions
        response = await this.generateFieldSpecificResponse(userMessage, isAskingForFieldHelp);
      } else {
        // Generate standard response
        response = await this.generateResponse();
      }
      
      this.chatHistory.push(response);
      return response;
    } catch (error) {
      console.error('Error generating chat response:', error);
      const errorMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again or contact support if the issue persists.',
        timestamp: new Date()
      };
      this.chatHistory.push(errorMessage);
      return errorMessage;
    }
  }
  
  /**
   * Detect if a question is about a specific field that has compliance issues
   */
  private detectFieldSpecificQuestion(userMessage: string): string | null {
    if (!userMessage) return null;
    
    const userMessageLower = userMessage.toLowerCase();
    const results = this.complianceContext.complianceResults || [];
    const nonCompliantFields = results
      .filter(r => r.status !== 'compliant')
      .map(r => r.field.toLowerCase());
    
    // Check each non-compliant field to see if it's mentioned in the user's message
    for (const field of nonCompliantFields) {
      // Create variations of the field name (e.g., tracking_number, tracking-number, trackingNumber)
      const variations = [
        field,
        field.replace(/\s+/g, '_'),
        field.replace(/\s+/g, '-'),
        field.replace(/[\s_-]+(.)/g, (_, c) => c.toUpperCase()),
        field.replace(/\s+/g, '')
      ];
      
      // Check if any variation is mentioned in the question
      if (variations.some(v => userMessageLower.includes(v))) {
        return field;
      }
    }
    
    return null;
  }
  
  /**
   * Generate a field-specific response with resolution guidance
   */
  private async generateFieldSpecificResponse(userMessage: string, fieldName: string): Promise<ChatMessage> {
    try {
      const results = this.complianceContext.complianceResults || [];
      const issue = results.find(r => r.field.toLowerCase() === fieldName.toLowerCase());
      
      // Find matching resolution suggestion if available
      const suggestion = this.resolutionSuggestions.find(s => 
        s.field.toLowerCase() === fieldName.toLowerCase()
      );
      
      let fieldContext = '';
      if (issue) {
        fieldContext = `
The user is asking about the field "${issue.field}" which has the following issue:
- Status: ${issue.status.toUpperCase()}
- Current value: ${issue.value || 'Missing'}
- Problem: ${issue.message}
`;

        if (suggestion) {
          fieldContext += `
Here's a specific resolution for this issue:
- Suggested value: ${suggestion.suggestedValue}
- Recommendation: ${suggestion.recommendation}
${suggestion.regulatoryReference ? `- Regulatory reference: ${suggestion.regulatoryReference}` : ''}
`;
        }
        
        fieldContext += `
Provide a detailed, step-by-step explanation of how to resolve this specific issue. Include examples of valid formats or values.
`;
      }
      
      // If we're in offline mode, generate a basic response
      if (this.offlineMode) {
        console.log('Generating offline field response');
        
        if (suggestion) {
          return {
            id: uuidv4(),
            role: 'assistant',
            content: `Here's how to fix the issue with ${issue?.field || fieldName}:

1. Current problem: ${issue?.message || 'Unknown issue'}

2. Recommended fix: 
   ${suggestion.recommendation}

3. Suggested value to use: 
   ${suggestion.suggestedValue}
   
${suggestion.regulatoryReference ? `4. Regulatory reference: ${suggestion.regulatoryReference}` : ''}

Let me know if you need more help with this or any other compliance issues.`,
            timestamp: new Date()
          };
        }
        
        return {
          id: uuidv4(),
          role: 'assistant',
          content: `I found an issue with the field "${issue?.field || fieldName}". 

The problem is: ${issue?.message || 'This field needs to be fixed to meet compliance requirements.'}

To fix it, you should provide a valid value that meets the format requirements.

Would you like more specific guidance on the format required?`,
          timestamp: new Date()
        };
      }
      
      // Get the system message for context
      const systemMessage = this.chatHistory.find(msg => msg.role === 'system');
      const systemContext = systemMessage ? systemMessage.content : '';
      
      // Combine everything into a simple prompt
      const combinedPrompt = `
${systemContext}

ADDITIONAL CONTEXT ABOUT THIS FIELD:
${fieldContext}

User question: ${userMessage}

Please provide a detailed solution for this specific field issue:
`;
      
      // Make a very simple, clean request
      const requestBody = {
        contents: [{
          parts: [{ text: combinedPrompt }]
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024,
        }
      };
      
      console.log('Sending field-specific request to Gemini API');
      const response = await fetch(`${this.API_URL}?key=${this.API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error:', response.status, errorText);
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.candidates && 
          data.candidates[0] && 
          data.candidates[0].content && 
          data.candidates[0].content.parts && 
          data.candidates[0].content.parts[0] && 
          data.candidates[0].content.parts[0].text) {
        const text = data.candidates[0].content.parts[0].text;
        
        return {
          id: uuidv4(),
          role: 'assistant',
          content: text,
          timestamp: new Date()
        };
      }
      
      throw new Error('Invalid response from Gemini API');
    } catch (error) {
      console.error('Error generating field-specific response:', error);
      
      // Fallback to a basic response if API fails
      return {
        id: uuidv4(),
        role: 'assistant',
        content: `I can help you with the ${fieldName} issue. This field needs to be fixed to comply with shipping regulations. Please make sure you're providing a valid value in the correct format.`,
        timestamp: new Date()
      };
    }
  }
  
  /**
   * Generate a standard response using Gemini
   */
  private async generateResponse(): Promise<ChatMessage> {
    try {
      // Return offline response when in offline mode
      if (this.offlineMode) {
        console.log('Generating offline response');
        return this.generateOfflineResponse();
      }
      
      // Extract the last user message
      const lastUserMessage = [...this.chatHistory].reverse().find(msg => msg.role === 'user');
      if (!lastUserMessage) {
        console.error('No user message found in history');
        return this.generateOfflineResponse();
      }
      
      // Get the system message for context
      const systemMessage = this.chatHistory.find(msg => msg.role === 'system');
      const systemContext = systemMessage ? systemMessage.content : '';
      
      // Create a simpler, more reliable request format
      // We'll combine the system context with the user's query directly
      const combinedPrompt = `${systemContext}\n\nUser question: ${lastUserMessage.content}\n\nPlease provide a helpful response:`;
      
      // Make a very simple, clean request
      const requestBody = {
        contents: [{
          parts: [{ text: combinedPrompt }]
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024,
        }
      };
      
      console.log('Sending simple request to Gemini API');
      
      const response = await fetch(`${this.API_URL}?key=${this.API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error:', response.status, errorText);
        
        // On API error, switch to offline mode and return fallback
        this.offlineMode = true;
        return this.generateOfflineResponse();
      }
      
      const data = await response.json();
      console.log('Received API response');
      
      if (data.candidates && 
          data.candidates[0] && 
          data.candidates[0].content && 
          data.candidates[0].content.parts && 
          data.candidates[0].content.parts[0] && 
          data.candidates[0].content.parts[0].text) {
        const text = data.candidates[0].content.parts[0].text;
        
        return {
          id: uuidv4(),
          role: 'assistant',
          content: text,
          timestamp: new Date()
        };
      } else {
        console.error('Invalid response structure:', JSON.stringify(data));
        throw new Error('Invalid response from Gemini API');
      }
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      
      // Return a fallback response
      return this.generateOfflineResponse();
    }
  }
  
  /**
   * Generate an offline response based on the last user message
   */
  private generateOfflineResponse(): ChatMessage {
    const lastUserMessage = [...this.chatHistory].reverse().find(msg => msg.role === 'user');
    
    if (!lastUserMessage) {
      return {
        id: uuidv4(),
        role: 'assistant',
        content: 'I apologize, but I\'m currently operating in offline mode. I can still help you with basic compliance questions.',
        timestamp: new Date()
      };
    }
    
    const userQuery = lastUserMessage.content.toLowerCase();
    let response = '';
    
    // Generate canned responses for common questions
    if (userQuery.includes('fix') && (userQuery.includes('all') || userQuery.includes('issues'))) {
      response = `To fix the compliance issues, you'll need to address each flagged field:

${this.resolutionSuggestions.map((sugg, idx) => 
`${idx + 1}. ${sugg.field}: 
   - Current issue: ${sugg.currentValue || 'Missing'}
   - Fix by: ${sugg.recommendation}
   - Suggested value: ${sugg.suggestedValue}
`).join('\n')}

Would you like detailed help with any specific field?`;
    } else if (userQuery.includes('why') && (userQuery.includes('flag') || userQuery.includes('issue'))) {
      const results = this.complianceContext.complianceResults || [];
      const issues = results.filter(r => r.status !== 'compliant');
      
      response = `Your shipment was flagged because of these compliance issues:
      
${issues.map((issue, idx) => `${idx + 1}. ${issue.field}: ${issue.message}`).join('\n')}

These issues need to be resolved to ensure smooth processing and avoid delays or rejections.`;
    } else if (userQuery.includes('document') || userQuery.includes('need')) {
      response = `The documents you typically need for international shipping include:

1. Commercial Invoice - Shows the value and description of the goods
2. Packing List - Details what's in the shipment
3. Shipping Label - With correct addresses and tracking information
4. Customs Declaration - Form declaring contents for customs authorities
5. Certificate of Origin - For certain countries and product types
6. Dangerous Goods Declaration - If applicable

Based on your specific shipment details, you should ensure all required information is correctly provided in your documentation.`;
    } else {
      response = `I'm here to help with your compliance questions. Currently I'm operating in offline mode.

You can ask me about:
- How to fix specific compliance issues
- Why your shipment was flagged
- Requirements for shipping to specific countries
- Documentation needed for your shipment
- Format requirements for specific fields

What would you like help with?`;
    }
    
    return {
      id: uuidv4(),
      role: 'assistant',
      content: response,
      timestamp: new Date()
    };
  }
  
  /**
   * Get the current chat history
   */
  getChatHistory(): ChatMessage[] {
    // Return all messages except the system message
    return this.chatHistory.filter(msg => msg.role !== 'system');
  }
  
  /**
   * Get resolution suggestions for non-compliant issues
   */
  getResolutionSuggestions(): ResolutionSuggestion[] {
    return this.resolutionSuggestions;
  }
  
  /**
   * Clear the chat history
   */
  clearChatHistory(): void {
    // Keep only the system message
    const systemMessage = this.chatHistory.find(msg => msg.role === 'system');
    this.chatHistory = systemMessage ? [systemMessage] : [];
  }
}

// Export a singleton instance
export const complianceChatService = new ComplianceChatService(); 
