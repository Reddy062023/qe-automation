// karate-generator.ts - AI-Powered Karate Feature File Generator
//
// WHAT THIS DOES:
// Reads retail-api.json (36 endpoints)
// Groups endpoints by feature area
// Sends each group to Claude API
// Claude writes Karate .feature files
// Saves to karate-retail/src/test/resources/features/ai-generated/
// Generates HTML coverage report
//
// HOW TO RUN:
// cd ai-modules/module1-api
// npx tsx karate-generator.ts
//
// REAL API: https://ecommerce.routemisr.com/api/v1
// Test account: qelead.test2026@gmail.com / QeTest@2026
// MongoDB IDs are hex strings like: 507f1f77bcf86cd799439011

import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';

// ─── CONFIGURATION ─────────────────────────────────────────────────────────
const CONFIG = {
  model: 'claude-haiku-4-5-20251001',
  maxTokens: 4000,
  specFile: 'retail-api.json',
  outputDir: path.join('..', '..', 'karate-retail', 'src', 'test', 'resources', 'features', 'ai-generated'),
  coverageThreshold: 80,
  baseUrl: 'https://ecommerce.routemisr.com/api/v1',
  testEmail: 'qelead.test2026@gmail.com',
  testPassword: 'QeTest@2026',
};

// ─── TYPES ──────────────────────────────────────────────────────────────────
interface Endpoint {
  path: string;
  method: string;
  tag: string;
  summary: string;
  parameters: Parameter[];
  requestBody: boolean;
  requiredFields: string[];
  responses: Record<string, string>;
  requiresAuth: boolean;
}

interface Parameter {
  name: string;
  in: string;
  required: boolean;
  type: string;
}

interface CoverageData {
  tag: string;
  totalEndpoints: number;
  scenariosGenerated: number;
  responseCodesCovered: string[];
  authTested: boolean;
  coverageScore: number;
}

// ─── STEP 1: PARSE SWAGGER SPEC ────────────────────────────────────────────
function parseSpec(specPath: string): Endpoint[] {
  console.log(`\n Reading spec: ${specPath}`);
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));
  const endpoints: Endpoint[] = [];

  for (const [endpointPath, pathItem] of Object.entries(spec.paths)) {
    for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
      const op = (pathItem as Record<string, unknown>)[method] as Record<string, unknown>;
      if (!op) continue;

      const parameters: Parameter[] = [];
      if (Array.isArray(op.parameters)) {
        for (const param of op.parameters) {
          parameters.push({
            name: (param as Record<string, unknown>).name as string,
            in: (param as Record<string, unknown>).in as string,
            required: (param as Record<string, unknown>).required as boolean || false,
            type: ((param as Record<string, unknown>).schema as Record<string, unknown>)?.type as string || 'string',
          });
        }
      }

      const responses: Record<string, string> = {};
      if (op.responses) {
        for (const [code, response] of Object.entries(op.responses)) {
          responses[code] = (response as Record<string, unknown>).description as string || '';
        }
      }

      const requiredFields: string[] = [];
      const rb = op.requestBody as Record<string, unknown>;
      if (rb?.content) {
        const content = rb.content as Record<string, unknown>;
        const jsonContent = content['application/json'] as Record<string, unknown>;
        if (jsonContent?.schema) {
          const schema = jsonContent.schema as Record<string, unknown>;
          if (Array.isArray(schema.required)) {
            requiredFields.push(...schema.required as string[]);
          }
        }
      }

      endpoints.push({
        path: endpointPath,
        method: method.toUpperCase(),
        tag: Array.isArray(op.tags) ? op.tags[0] as string : 'General',
        summary: op.summary as string || '',
        parameters,
        requestBody: !!op.requestBody,
        requiredFields,
        responses,
        requiresAuth: Array.isArray(op.security) && op.security.length > 0,
      });
    }
  }

  console.log(` Found ${endpoints.length} endpoints`);
  return endpoints;
}

// ─── STEP 2: GROUP BY FEATURE AREA ─────────────────────────────────────────
function groupByTag(endpoints: Endpoint[]): Map<string, Endpoint[]> {
  const groups = new Map<string, Endpoint[]>();
  for (const ep of endpoints) {
    if (!groups.has(ep.tag)) groups.set(ep.tag, []);
    groups.get(ep.tag)!.push(ep);
  }
  console.log('\n Feature areas:');
  for (const [tag, eps] of groups) {
    console.log(`   ${tag}: ${eps.length} endpoints`);
  }
  return groups;
}

// ─── STEP 3: BUILD KARATE PROMPT ───────────────────────────────────────────
function buildKaratePrompt(tag: string, endpoints: Endpoint[]): string {
  const endpointDetails = endpoints.map(ep => {
    const params = ep.parameters.length > 0
      ? ep.parameters.map(p => `    - ${p.name} (${p.in}, ${p.required ? 'REQUIRED' : 'optional'}, type: ${p.type})`).join('\n')
      : '    - none';

    const responses = Object.entries(ep.responses)
      .map(([code, desc]) => `    - ${code}: ${desc}`)
      .join('\n');

    const requiredFields = ep.requiredFields.length > 0
      ? ep.requiredFields.join(', ')
      : 'none';

    return `
Endpoint: ${ep.method} ${ep.path}
Summary: ${ep.summary}
Auth required: ${ep.requiresAuth}
Has request body: ${ep.requestBody}
Required fields: ${requiredFields}
Parameters:
${params}
Response codes:
${responses}`;
  }).join('\n---');

  return `Generate Karate Framework feature file for the "${tag}" feature of a retail e-commerce API.

BASE URL: ${CONFIG.baseUrl}
TEST ACCOUNT EMAIL: ${CONFIG.testEmail}
TEST ACCOUNT PASSWORD: ${CONFIG.testPassword}

ENDPOINTS TO TEST:
${endpointDetails}

REQUIREMENTS - generate Karate scenarios covering ALL of:
1. HAPPY PATH - valid request returns expected success status
2. AUTHENTICATION - for protected endpoints:
   - With valid token: And header token = authToken
   - Without token: omit header, expect 401
   - With invalid token: And header token = 'invalid-token', expect 401
3. EVERY documented error response code
4. MISSING REQUIRED FIELDS - omit each required field, expect 400
5. INVALID DATA TYPES - send wrong types, expect 400 or 422
6. BOUNDARY VALUES - empty strings, very long strings, negative numbers

CRITICAL KARATE RULES - follow exactly:
- Feature name: Feature: RetailShop ${tag} API
- Background must set URL: * url '${CONFIG.baseUrl}'
- Define test credentials in Background:
  * def testEmail = '${CONFIG.testEmail}'
  * def testPassword = '${CONFIG.testPassword}'
- For auth token - login first then store token:
  * def loginResponse = call read('classpath:features/auth.feature@login')
  OR do inline login in Background:
  Given path '/auth/signin'
  And request { "email": "#(testEmail)", "password": "#(testPassword)" }
  When method POST
  * def authToken = response.token
- Use token in header: And header token = authToken
- Path with variable: Given path '/products/' + productId
- Query param: And param page = 1
- Request body: And request { "field": "value" }
- Method: When method POST
- Status check: Then status 200
- Field match: And match response.data != null
- Array check: And match response.data == '#[]'
- Number check: And match response.data == '#number'

MONGODB ID RULES - THIS IS CRITICAL:
- This API uses MongoDB - ALL IDs are 24-character hex strings
- ALWAYS wrap IDs in single quotes: * def productId = '507f1f77bcf86cd799439011'
- For invalid ID use: '000000000000000000000000' (24 zeros)
- For non-existent ID use: '507f1f77bcf86cd799439099'
- NEVER use plain integers as IDs like 1, 999, 999999
- NEVER write: * def productId = 507f1f77bcf86cd799439011 (missing quotes = syntax error)

IMPORTANT:
- Return ONLY valid Karate .feature file content
- No markdown code blocks, no TypeScript, no JavaScript
- Start directly with: Feature: RetailShop ${tag} API
- Use realistic retail test data
- Each Scenario must be completely independent
- Add comments explaining why each test exists`;
}

// ─── STEP 4: CALL CLAUDE API ────────────────────────────────────────────────
async function generateKarateFeature(
  client: Anthropic,
  tag: string,
  endpoints: Endpoint[]
): Promise<string> {
  console.log(`\n Generating Karate feature: ${tag} (${endpoints.length} endpoints)`);

  const message = await client.messages.create({
    model: CONFIG.model,
    max_tokens: CONFIG.maxTokens,
    system: `You are a senior QA automation engineer expert in Karate Framework 1.4.0.
You write production-quality Karate .feature files.
Your output is ONLY valid Karate Gherkin syntax — no markdown, no TypeScript.
You always cover: happy path, auth scenarios, every error code, missing fields, boundary values.
CRITICAL: All MongoDB IDs must be in single quotes. NEVER write a bare hex string without quotes.
CRITICAL: Use header token = authToken (not Authorization header) for this API.
Start output directly with: Feature:`,
    messages: [
      { role: 'user', content: buildKaratePrompt(tag, endpoints) }
    ],
  });

  const generated = message.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('\n');

  console.log(`   Tokens: ${message.usage.input_tokens} in, ${message.usage.output_tokens} out`);
  console.log(`   Cost: ~$${((message.usage.input_tokens * 0.00025 + message.usage.output_tokens * 0.00125) / 1000).toFixed(4)}`);

  return generated;
}

// ─── STEP 5: CALCULATE COVERAGE ────────────────────────────────────────────
function calculateCoverage(tag: string, endpoints: Endpoint[], code: string): CoverageData {
  const allCodes = [...new Set(endpoints.flatMap(ep => Object.keys(ep.responses)))];
  const coveredCodes = allCodes.filter(c => code.includes(c));
  const authRequired = endpoints.some(ep => ep.requiresAuth);
  const authTested = code.includes('401');
  const scenariosGenerated = (code.match(/Scenario:/g) || []).length;
  const coverageScore = Math.min(100, Math.round((scenariosGenerated / (endpoints.length * 4)) * 100));

  return { tag, totalEndpoints: endpoints.length, scenariosGenerated, responseCodesCovered: coveredCodes, authTested, coverageScore };
}

// ─── STEP 6: SAVE FEATURE FILE ──────────────────────────────────────────────
function saveFeatureFile(tag: string, content: string): void {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  const filename = `${tag.toLowerCase().replace(/\s+/g, '-')}.feature`;
  const filePath = path.join(CONFIG.outputDir, filename);

  const fileContent = `# ${filename} - AUTO-GENERATED by karate-generator.ts
# Generated: ${new Date().toISOString()}
# Feature: ${tag}
# API: ${CONFIG.baseUrl}
# DO NOT EDIT - regenerate using: npx tsx ai-modules/module1-api/karate-generator.ts

${content}`;

  fs.writeFileSync(filePath, fileContent);
  console.log(`   Saved: ${filePath}`);
}

// ─── STEP 7: GENERATE HTML COVERAGE REPORT ─────────────────────────────────
function generateReport(coverageData: CoverageData[], totalCost: number): void {
  const totalEndpoints = coverageData.reduce((s, c) => s + c.totalEndpoints, 0);
  const totalScenarios = coverageData.reduce((s, c) => s + c.scenariosGenerated, 0);
  const avgCoverage = Math.round(coverageData.reduce((s, c) => s + c.coverageScore, 0) / coverageData.length);

  const rows = coverageData.map(c => `
    <tr class="${c.coverageScore >= CONFIG.coverageThreshold ? 'pass' : 'fail'}">
      <td><strong>${c.tag}</strong></td>
      <td>${c.totalEndpoints}</td>
      <td>${c.scenariosGenerated}</td>
      <td>${c.authTested ? '✓' : '✗'}</td>
      <td class="score">${c.coverageScore}%</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Karate AI Generation Report - RetailShop API</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
    .header { background: #185FA5; color: white; padding: 30px; border-radius: 8px; margin-bottom: 30px; }
    .header h1 { margin: 0; font-size: 26px; }
    .header p { margin: 5px 0 0; opacity: 0.8; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
    .card { background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .card .number { font-size: 36px; font-weight: bold; color: #185FA5; }
    .card .label { color: #666; font-size: 14px; margin-top: 5px; }
    table { width: 100%; background: white; border-collapse: collapse; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    th { background: #185FA5; color: white; padding: 12px 16px; text-align: left; }
    td { padding: 12px 16px; border-bottom: 1px solid #eee; }
    tr.pass { border-left: 4px solid #0F6E56; }
    tr.fail { border-left: 4px solid #dc3545; }
    .score { font-weight: bold; font-size: 16px; }
    tr.pass .score { color: #0F6E56; }
    tr.fail .score { color: #dc3545; }
    .info { background: #e8f4fd; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #185FA5; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Karate AI Test Generation Report</h1>
    <p>RetailShop API — ${CONFIG.baseUrl}</p>
    <p>Generated: ${new Date().toLocaleString()}</p>
  </div>
  <div class="summary">
    <div class="card"><div class="number">${totalEndpoints}</div><div class="label">Total Endpoints</div></div>
    <div class="card"><div class="number">${totalScenarios}</div><div class="label">Scenarios Generated</div></div>
    <div class="card"><div class="number">${avgCoverage}%</div><div class="label">Avg Coverage</div></div>
    <div class="card"><div class="number">$${totalCost.toFixed(4)}</div><div class="label">Total AI Cost</div></div>
  </div>
  <div class="info">
    Framework: <strong>Karate 1.4.0</strong> |
    Run tests: <strong>cd karate-retail && mvn test</strong> |
    View Allure: <strong>mvn allure:serve</strong>
  </div>
  <table>
    <thead>
      <tr>
        <th>Feature Area</th>
        <th>Endpoints</th>
        <th>Scenarios Generated</th>
        <th>Auth Tested</th>
        <th>Coverage Score</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;

  const reportPath = path.join(CONFIG.outputDir, 'coverage-report.html');
  fs.writeFileSync(reportPath, html);
  console.log(`\n Coverage report: ${reportPath}`);
}

// ─── MAIN ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Karate AI Feature File Generator');
  console.log('  Reads retail-api.json → Claude API → .feature files');
  console.log(`  Target API: ${CONFIG.baseUrl}`);
  console.log('═══════════════════════════════════════════════════');

  const client = new Anthropic();
  let totalCost = 0;
  const coverageResults: CoverageData[] = [];

  const endpoints = parseSpec(CONFIG.specFile);
  const groups = groupByTag(endpoints);

  console.log('\n Generating Karate feature files...');
  console.log('─────────────────────────────────────────────────');

  for (const [tag, featureEndpoints] of groups) {
    const generated = await generateKarateFeature(client, tag, featureEndpoints);
    const coverage = calculateCoverage(tag, featureEndpoints, generated);
    coverageResults.push(coverage);
    totalCost += parseFloat(((featureEndpoints.length * 325 * 0.00025 + 4000 * 0.00125) / 1000).toFixed(4));
    saveFeatureFile(tag, generated);
    console.log(`   Scenarios: ${coverage.scenariosGenerated} | Coverage: ${coverage.coverageScore}%`);
  }

  generateReport(coverageResults, totalCost);

  const totalScenarios = coverageResults.reduce((s, c) => s + c.scenariosGenerated, 0);
  const avgCoverage = Math.round(coverageResults.reduce((s, c) => s + c.coverageScore, 0) / coverageResults.length);

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  GENERATION COMPLETE');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Feature areas:     ${groups.size}`);
  console.log(`  Total endpoints:   ${endpoints.length}`);
  console.log(`  Scenarios created: ${totalScenarios}`);
  console.log(`  Avg coverage:      ${avgCoverage}%`);
  console.log(`  Total cost:        $${totalCost.toFixed(4)}`);
  console.log(`  Output:            ${CONFIG.outputDir}`);
  console.log('\n  Next step: cd karate-retail && mvn test');
}

main();