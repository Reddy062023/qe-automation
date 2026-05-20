// ai-test-generator.ts - AI-driven test case generation using Claude API
//
// WHAT IS THIS?
// This script takes a plain English requirement and uses Claude AI
// to automatically generate Playwright test cases.
//
// WHY IS THIS IMPORTANT FOR A QE LEAD?
// Instead of manually writing every test case, AI can:
//   - Generate test cases from user stories in seconds
//   - Suggest edge cases a human might miss
//   - Reduce test authoring time by 60-70%
//   - Help junior QEs write better tests faster
//
// HOW IT WORKS:
// 1. You describe a feature in plain English
// 2. This script sends it to Claude API with a prompt
// 3. Claude returns ready-to-run Playwright test code
// 4. You review, adjust, and commit the tests
//
// WHAT IS PROMPT ENGINEERING?
// The way you write the instruction to the AI matters enormously.
// A vague prompt gives vague tests.
// A specific prompt with context gives production-ready tests.
// This is a key skill for AI-driven QE.

import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';

// Initialize the Anthropic client
// It automatically reads ANTHROPIC_API_KEY from environment variables
const client = new Anthropic();

// The requirement we want to generate tests for
// In a real project this would come from Jira, Confluence, or a CLI argument
const requirement = `
Feature: Hotel Room Booking on MGM Resorts website

User Story:
As a guest, I want to search for available hotel rooms so that I can book a stay.

Acceptance Criteria:
1. Guest can enter check-in and check-out dates
2. Guest can select number of adults and children
3. Search results show available rooms with prices
4. Guest can filter results by room type (Standard, Suite, Villa)
5. Each room shows: name, price per night, amenities, and a Book Now button
6. If no rooms available, show a friendly message
7. Dates cannot be in the past
8. Check-out date must be after check-in date
`;

// The system prompt we send to Claude
// This is prompt engineering - being specific gets better results
const systemPrompt = `You are an expert QA automation engineer specializing in Playwright TypeScript tests.
Your job is to generate comprehensive, production-ready Playwright test cases.

Rules:
- Use TypeScript with proper types
- Follow Page Object Model pattern
- Include positive tests, negative tests, and edge cases
- Add clear comments explaining what each test covers and why
- Use Playwright best practices: getByRole, getByLabel, expect with proper assertions
- Tests should be independent - each test sets up its own state
- Use descriptive test names that explain the business scenario
- The base URL is https://www.mgmresorts.com
- Return ONLY the test code, no explanations outside the code`;

async function generateTests(requirement: string): Promise<void> {
  console.log('Sending requirement to Claude API...');
  console.log('Model: claude-haiku-4-5 (fast and cost-effective)');
  console.log('---');

  try {
    // Call the Claude API
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',  // cheapest and fastest model
      max_tokens: 2000,                      // limit response length
      messages: [
        {
          role: 'user',
          content: `Generate Playwright TypeScript test cases for the following requirement:\n\n${requirement}`
        }
      ],
      system: systemPrompt,
    });

    // Extract the generated test code from the response
    const generatedCode = message.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('\n');

    console.log('Tests generated successfully!');
    console.log('---');
    console.log('GENERATED TEST CODE:');
    console.log('---');
    console.log(generatedCode);

    // Save the generated tests to a file
    const outputPath = path.join('tests', 'ai-generated', 'hotel-booking.spec.ts');

    // Create directory if it does not exist
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, generatedCode);

    console.log('---');
    console.log(`Tests saved to: ${outputPath}`);

    // Show token usage - important for cost management
    console.log('---');
    console.log('API Usage (cost tracking):');
    console.log(`  Input tokens:  ${message.usage.input_tokens}`);
    console.log(`  Output tokens: ${message.usage.output_tokens}`);
    console.log(`  Estimated cost: ~$${((message.usage.input_tokens * 0.00025 + message.usage.output_tokens * 0.00125) / 1000).toFixed(4)}`);

  } catch (error) {
    console.error('Error calling Claude API:', error);
    throw error;
  }
}

// Run the generator
generateTests(requirement);