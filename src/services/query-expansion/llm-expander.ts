/**
 * LLM-based Query Expander
 * Uses AI to generate context-aware derived queries
 */

import OpenAI from 'openai';
import type {
  QueryExpansionInput,
  DerivedQuery,
  LLMExpansionResponse,
  QueryExpansionType,
} from './types';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * System prompt for query expansion
 */
const SYSTEM_PROMPT = `You are an SEO/AEO (Answer Engine Optimization) expert specializing in Korean market.
Your task is to generate derived queries that will help test a brand's visibility across AI assistants.

You must generate queries in KOREAN language.

For each query, categorize it into one of these types:
- intent_variation: Same intent, different phrasing
- specificity: More specific use case (e.g., "for startups")
- price_focus: Price/value oriented
- alternative: Looking for alternatives to a brand
- comparison: Comparing brands directly
- review: Seeking reviews/experiences
- ranking: Looking for rankings/best lists
- feature_specific: Specific feature focused

Always return valid JSON with the exact schema requested.`;

/**
 * Generate the user prompt for query expansion
 */
function generateUserPrompt(input: QueryExpansionInput, numQueries: number): string {
  return `Generate ${numQueries} derived queries for brand visibility testing.

Original Query: "${input.originalQuery}"
Brand Name: ${input.brandName}
Industry: ${input.industry}
Keywords: ${input.keywords.join(', ') || 'None'}
Competitors: ${input.competitors.join(', ') || 'None'}

Requirements:
1. Generate diverse query types (recommendation, comparison, review, ranking, alternative, etc.)
2. All queries must be in Korean
3. Include queries that:
   - Directly ask for recommendations
   - Compare the brand with competitors
   - Ask for rankings/top lists
   - Seek reviews/experiences
   - Look for alternatives
   - Focus on pricing/value
   - Target specific use cases
4. Prioritize queries where the brand is likely to be mentioned

Return JSON in this exact format:
{
  "queries": [
    {
      "query": "Generated query in Korean",
      "type": "query_type",
      "intent": "Brief description of search intent in Korean",
      "expectedBrandMentionLikelihood": "high" | "medium" | "low"
    }
  ]
}`;
}

/**
 * Parse and validate LLM response
 */
function parseExpansionResponse(response: string): LLMExpansionResponse | null {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    
    const parsed = JSON.parse(jsonMatch[0]) as LLMExpansionResponse;
    
    // Validate structure
    if (!parsed.queries || !Array.isArray(parsed.queries)) {
      return null;
    }
    
    return parsed;
  } catch {
    console.error('Failed to parse LLM expansion response');
    return null;
  }
}

/**
 * Map string type to QueryExpansionType enum
 */
function mapQueryType(type: string): QueryExpansionType {
  const typeMap: Record<string, QueryExpansionType> = {
    intent_variation: 'intent_variation',
    specificity: 'specificity',
    price_focus: 'price_focus',
    alternative: 'alternative',
    comparison: 'comparison',
    review: 'review',
    ranking: 'ranking',
    feature_specific: 'feature_specific',
    // Handle alternative spellings
    intent: 'intent_variation',
    specific: 'specificity',
    price: 'price_focus',
    alternatives: 'alternative',
    compare: 'comparison',
    reviews: 'review',
    rankings: 'ranking',
    feature: 'feature_specific',
  };
  
  return typeMap[type.toLowerCase()] || 'intent_variation';
}

/**
 * Expand queries using LLM
 */
export async function expandWithLLM(
  input: QueryExpansionInput
): Promise<DerivedQuery[]> {
  // Determine number of queries based on expansion level
  const queryCount = {
    minimal: 4,
    standard: 8,
    comprehensive: 12,
  }[input.expansionLevel || 'standard'];
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: generateUserPrompt(input, queryCount) },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error('No content in LLM response');
      return [];
    }
    
    const parsed = parseExpansionResponse(content);
    if (!parsed) {
      console.error('Failed to parse LLM response');
      return [];
    }
    
    // Convert to DerivedQuery format
    return parsed.queries.map((q, index) => ({
      query: q.query,
      type: mapQueryType(q.type),
      intent: q.intent,
      relevanceScore: calculateRelevanceFromPosition(index, queryCount),
      expectedBrandMentionLikelihood: q.expectedBrandMentionLikelihood || 'medium',
    }));
  } catch (error) {
    console.error('LLM expansion failed:', error);
    return [];
  }
}

/**
 * Calculate relevance score based on position in LLM response
 * Assumes LLM returns queries in order of relevance
 */
function calculateRelevanceFromPosition(index: number, total: number): number {
  // Linear decay from 1.0 to 0.5
  return Math.max(0.5, 1.0 - (index / total) * 0.5);
}

/**
 * Expand queries with fallback to templates
 */
export async function expandWithLLMAndFallback(
  input: QueryExpansionInput,
  templateExpander: (input: QueryExpansionInput) => DerivedQuery[]
): Promise<DerivedQuery[]> {
  try {
    const llmQueries = await expandWithLLM(input);
    
    if (llmQueries.length > 0) {
      return llmQueries;
    }
    
    // Fallback to template-based expansion
    console.log('LLM expansion failed, falling back to templates');
    return templateExpander(input);
  } catch (error) {
    console.error('LLM expansion error:', error);
    return templateExpander(input);
  }
}
