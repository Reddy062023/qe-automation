// karate-generator.ts - AI-Powered Karate Feature File Generator
// Reads retail-api.json → Claude API → .feature files
// HOW TO RUN: cd ai-modules/module1-api && npx tsx karate-generator.ts

import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';

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

function buildKaratePrompt(tag: string, endpoints: Endpoint[]): string {
  const endpointDetails = endpoints.map(ep => {
    const params = ep.parameters.length > 0
      ? ep.parameters.map(p => `    - ${p.name} (${p.in}, ${p.required ? 'REQUIRED' : 'optional'}, type: ${p.type})`).join('\n')
      : '    - none';
    const responses = Object.entries(ep.responses)
      .map(([code, desc]) => `    - ${code}: ${desc}`)
      .join('\n');
    const requiredFields = ep.requiredFields.length > 0 ? ep.requiredFields.join(', ') : 'none';

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

REQUIREMENTS - generate Karate scenarios for ONLY these 5 categories:
1. HAPPY PATH - valid request with real fetched data returns success status
2. NO AUTH TOKEN - omit token header entirely, expect 401
3. INVALID AUTH TOKEN - And header token = 'invalid-token-xyz', expect 401
4. MISSING REQUIRED FIELDS - omit each required field one by one, expect 400
5. NOT FOUND - use valid MongoDB format non-existent ID '000000000000000000000000', expect 404

DO NOT generate any other test types.
DO NOT test invalid ID formats, null, undefined, empty strings, decimal numbers, boundary values.
DO NOT guess what status codes the API returns for edge cases.
DO NOT test page=-1, limit=0, or any parameter boundary values.
ONLY generate tests you are 100% certain will pass based on standard REST API behavior.

CRITICAL KARATE RULES:
- Feature name: Feature: RetailShop ${tag} API
- Background must set URL: * url '${CONFIG.baseUrl}'
- Define credentials in Background:
  * def testEmail = '${CONFIG.testEmail}'
  * def testPassword = '${CONFIG.testPassword}'
- Login in Background for protected endpoints:
  Given path '/auth/signin'
  And request { "email": "#(testEmail)", "password": "#(testPassword)" }
  When method POST
  Then status 200
  * def authToken = response.token
  * def userId = response.user._id
- Token header: And header token = authToken
- Path variable: Given path '/products/' + productId
- Query param: And param page = 1
- Request body: And request { "field": "value" }
- Status: Then status 200
- Array check: And match response.data == '#[]'

CRITICAL ROUTE API RULES:
- NEVER hardcode fake MongoDB IDs for happy path
- To get real product ID:
  Given path '/products'
  And param limit = 1
  When method GET
  Then status 200
  * def productId = response.data[0].id
- To get real category ID:
  Given path '/categories'
  When method GET
  Then status 200
  * def categoryId = response.data[0]._id
- To get real brand ID:
  Given path '/brands'
  When method GET
  Then status 200
  * def brandId = response.data[0]._id
- userId comes from login: * def userId = response.user._id
- Non-existent MongoDB ID '000000000000000000000000' returns 404
- Wishlist add: POST /wishlist with body { "productId": "#(productId)" }
- Wishlist delete: DELETE /wishlist/:productId (NO /items ever)
- Cart add: POST /cart with body { "productId": "#(productId)" }
- Cart update: PUT /cart/:itemId with body { "count": 2 }
- Orders: GET /orders/user/:userId
- Auth header: And header token = authToken (NOT Authorization Bearer)

OUTPUT RULES:
- Return ONLY valid Karate .feature file content
- No markdown, no TypeScript, no JavaScript
- Start directly with: Feature: RetailShop ${tag} API
- Each Scenario must be completely independent
- Add a comment on each Scenario explaining what it tests`;
}

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
You write production-quality Karate .feature files that ALWAYS pass.
Your output is ONLY valid Karate Gherkin syntax — no markdown, no TypeScript.
You ONLY generate: happy path, 401 auth, 400 missing fields, 404 not found.
You NEVER generate boundary value tests or guess API behavior.
You ALWAYS fetch real IDs from the API instead of hardcoding fake MongoDB IDs.
You ALWAYS use header token = authToken (not Authorization header).
You ALWAYS use POST /wishlist and DELETE /wishlist/:productId (never /items).
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

function calculateCoverage(tag: string, endpoints: Endpoint[], code: string): CoverageData {
  const allCodes = [...new Set(endpoints.flatMap(ep => Object.keys(ep.responses)))];
  const coveredCodes = allCodes.filter(c => code.includes(c));
  const authTested = code.includes('401');
  const scenariosGenerated = (code.match(/Scenario:/g) || []).length;
  const coverageScore = Math.min(100, Math.round((scenariosGenerated / (endpoints.length * 4)) * 100));
  return { tag, totalEndpoints: endpoints.length, scenariosGenerated, responseCodesCovered: coveredCodes, authTested, coverageScore };
}

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
  <title>Karate AI Generation Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
    .header { background: #185FA5; color: white; padding: 30px; border-radius: 8px; margin-bottom: 30px; }
    .header h1 { margin: 0; font-size: 26px; }
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
  <table>
    <thead>
      <tr><th>Feature Area</th><th>Endpoints</th><th>Scenarios</th><th>Auth Tested</th><th>Coverage</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;

  const reportPath = path.join(CONFIG.outputDir, 'coverage-report.html');
  fs.writeFileSync(reportPath, html);
  console.log(`\n Coverage report: ${reportPath}`);
}

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