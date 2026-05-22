// karate-generator.ts - AI-Powered Karate Feature File Generator
// Now using Google Gemini FREE API instead of Claude

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';

const CONFIG = {
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
TEST EMAIL: ${CONFIG.testEmail}
TEST PASSWORD: ${CONFIG.testPassword}

ENDPOINTS TO TEST:
${endpointDetails}

REQUIREMENTS - generate scenarios covering:
1. HAPPY PATH - valid request returns expected success status
2. AUTHENTICATION - protected endpoints: with valid token, without token (expect 401), with invalid token (expect 401)
3. EVERY documented error response code
4. MISSING REQUIRED FIELDS - omit each required field
5. INVALID DATA - send wrong types or malformed data

KARATE SYNTAX RULES:
- Feature name: Feature: RetailShop ${tag} API
- Background: * url '${CONFIG.baseUrl}'
- Login in Background: Given path '/auth/signin' / And request {"email":"${CONFIG.testEmail}","password":"${CONFIG.testPassword}"} / When method POST / Then status 200 / * def authToken = response.token
- Token header: And header token = authToken
- Path with variable: Given path '/products/' + productId
- Query param: And param page = 1
- Request body: And request {"field":"value"}
- Status check: Then status 200
- Array check: And match response.data == '#[]'
- String check: And match response.data[0].title == '#string'

CRITICAL RULES FOR THIS SPECIFIC API:
- NEVER hardcode fake MongoDB IDs for happy path - always fetch real IDs first
- To get real product ID: Given path '/products' / And param limit = 1 / When method GET / Then status 200 / * def productId = response.data[0].id
- To get real category ID: Given path '/categories' / When method GET / Then status 200 / * def categoryId = response.data[0]._id
- To get real brand ID: Given path '/brands' / When method GET / Then status 200 / * def brandId = response.data[0]._id
- Non-existent valid MongoDB ID returns 404 not 400 - use Then status 404
- Invalid ObjectId format returns 500 not 400 - use Then status 500
- page=-1 returns status 500 not 400
- limit=0 returns status 200 not 400
- Wishlist add: POST /wishlist with body {"productId": productId}
- Wishlist delete: DELETE /wishlist/:productId (NO /items in path)
- Cart add: POST /cart with body {"productId": productId}
- Orders: GET /orders/user/:userId where userId comes from login response.user._id
- Auth header is: And header token = authToken (NOT Authorization Bearer)

OUTPUT RULES:
- Return ONLY valid Karate .feature file content
- No markdown, no TypeScript, no JavaScript
- Start directly with: Feature: RetailShop ${tag} API
- Each Scenario must be completely independent`;
}

async function generateKarateFeature(
  genAI: GoogleGenerativeAI,
  tag: string,
  endpoints: Endpoint[]
): Promise<string> {
  console.log(`\n Generating Karate feature: ${tag} (${endpoints.length} endpoints)`);

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash-latest',
    systemInstruction: `You are a senior QA automation engineer expert in Karate Framework 1.4.0.
You write production-quality Karate .feature files.
Your output is ONLY valid Karate Gherkin syntax — no markdown, no TypeScript.
You always cover: happy path, auth scenarios, error codes, missing fields.
CRITICAL: Always fetch real IDs from the API instead of hardcoding fake MongoDB IDs.
CRITICAL: Use header token = authToken (not Authorization header).
Start output directly with: Feature:`
  });

  const result = await model.generateContent(buildKaratePrompt(tag, endpoints));
  const generated = result.response.text();

  console.log(`   Generated ${(generated.match(/Scenario:/g) || []).length} scenarios`);
  return generated;
}

function calculateCoverage(tag: string, endpoints: Endpoint[], code: string): CoverageData {
  const scenariosGenerated = (code.match(/Scenario:/g) || []).length;
  const coverageScore = Math.min(100, Math.round((scenariosGenerated / (endpoints.length * 4)) * 100));
  return { tag, totalEndpoints: endpoints.length, scenariosGenerated, coverageScore };
}

function saveFeatureFile(tag: string, content: string): void {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  const filename = `${tag.toLowerCase().replace(/\s+/g, '-')}.feature`;
  const filePath = path.join(CONFIG.outputDir, filename);
  const fileContent = `# ${filename} - AUTO-GENERATED by karate-generator.ts (Gemini)
# Generated: ${new Date().toISOString()}
# Feature: ${tag}
# API: ${CONFIG.baseUrl}

${content}`;
  fs.writeFileSync(filePath, fileContent);
  console.log(`   Saved: ${filePath}`);
}

function generateReport(coverageData: CoverageData[]): void {
  const totalEndpoints = coverageData.reduce((s, c) => s + c.totalEndpoints, 0);
  const totalScenarios = coverageData.reduce((s, c) => s + c.scenariosGenerated, 0);
  const avgCoverage = Math.round(coverageData.reduce((s, c) => s + c.coverageScore, 0) / coverageData.length);

  const rows = coverageData.map(c => `
    <tr>
      <td><strong>${c.tag}</strong></td>
      <td>${c.totalEndpoints}</td>
      <td>${c.scenariosGenerated}</td>
      <td>${c.coverageScore}%</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Karate Generation Report</title>
<style>body{font-family:Arial;margin:40px;} table{width:100%;border-collapse:collapse;} th{background:#185FA5;color:white;padding:10px;} td{padding:10px;border-bottom:1px solid #eee;}</style>
</head><body>
<h1>Karate AI Test Generation Report (Gemini FREE)</h1>
<p>API: ${CONFIG.baseUrl} | Generated: ${new Date().toLocaleString()}</p>
<p><strong>Total Endpoints: ${totalEndpoints} | Scenarios: ${totalScenarios} | Avg Coverage: ${avgCoverage}% | Cost: $0.00 (FREE)</strong></p>
<table><thead><tr><th>Feature</th><th>Endpoints</th><th>Scenarios</th><th>Coverage</th></tr></thead>
<tbody>${rows}</tbody></table>
</body></html>`;

  const reportPath = path.join(CONFIG.outputDir, 'coverage-report.html');
  fs.writeFileSync(reportPath, html);
  console.log(`\n Coverage report: ${reportPath}`);
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Karate AI Feature File Generator - GEMINI FREE');
  console.log(`  Target API: ${CONFIG.baseUrl}`);
  console.log('═══════════════════════════════════════════════════');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('ERROR: GEMINI_API_KEY environment variable not set');
    console.error('Set it with: set GEMINI_API_KEY=your_key_here');
    process.exit(1);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const coverageResults: CoverageData[] = [];

  const endpoints = parseSpec(CONFIG.specFile);
  const groups = groupByTag(endpoints);

  console.log('\n Generating Karate feature files...');
  console.log('─────────────────────────────────────────────────');

  for (const [tag, featureEndpoints] of groups) {
    const generated = await generateKarateFeature(genAI, tag, featureEndpoints);
    const coverage = calculateCoverage(tag, featureEndpoints, generated);
    coverageResults.push(coverage);
    saveFeatureFile(tag, generated);
    console.log(`   Scenarios: ${coverage.scenariosGenerated} | Coverage: ${coverage.coverageScore}%`);
  }

  generateReport(coverageResults);

  const totalScenarios = coverageResults.reduce((s, c) => s + c.scenariosGenerated, 0);
  const avgCoverage = Math.round(coverageResults.reduce((s, c) => s + c.coverageScore, 0) / coverageResults.length);

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  GENERATION COMPLETE - $0.00 COST (FREE!)');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Feature areas:     ${groups.size}`);
  console.log(`  Total endpoints:   ${endpoints.length}`);
  console.log(`  Scenarios created: ${totalScenarios}`);
  console.log(`  Avg coverage:      ${avgCoverage}%`);
  console.log(`  Cost:              $0.00 (Gemini Free Tier)`);
  console.log('\n  Next step: cd karate-retail && mvn test');
}

main();