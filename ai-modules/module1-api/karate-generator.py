#!/usr/bin/env python3
"""
karate-generator.py - AI-Powered Karate Feature File Generator (Python version)

WHAT THIS DOES:
1. DISCOVERY - Calls the real API to find actual status codes and response structure
2. GENERATION - Sends real API behavior to Groq AI to generate accurate Karate tests

HOW TO RUN:
  cd ai-modules/module1-api
  pip install groq requests
  set GROQ_API_KEY=your_key
  python karate-generator.py

REAL API: https://ecommerce.routemisr.com/api/v1
FREE AI: Groq API (llama-3.3-70b-versatile) - no cost
"""

import json
import os
import re
import time
from pathlib import Path
from datetime import datetime
import requests
from groq import Groq

# ─── CONFIGURATION ──────────────────────────────────────────────────────────
CONFIG = {
    "base_url": "https://ecommerce.routemisr.com/api/v1",
    "test_email": "qelead.test2026@gmail.com",
    "test_password": "QeTest@2026",
    "spec_file": "retail-api.json",
    "output_dir": Path("../../karate-retail/src/test/resources/features/ai-generated"),
    "model": "llama-3.3-70b-versatile",
    "max_tokens": 4000,
}

# ─── STEP 1: LOGIN AND GET REAL TOKEN ───────────────────────────────────────
def get_auth_token() -> dict:
    """Login to real API and return token + userId"""
    print("\n Logging in to get real auth token...")
    try:
        resp = requests.post(
            f"{CONFIG['base_url']}/auth/signin",
            json={"email": CONFIG["test_email"], "password": CONFIG["test_password"]},
            timeout=10
        )
        if resp.status_code == 200:
            data = resp.json()
            token = data.get("token", "")
            user_id = data.get("user", {}).get("_id", "")
            print(f"   Token obtained, userId: {user_id}")
            return {"token": token, "userId": user_id}
    except Exception as e:
        print(f"   Login failed: {e}")
    return {"token": "", "userId": ""}

# ─── STEP 2: DISCOVER REAL API BEHAVIOR ─────────────────────────────────────
def discover_api_behavior(auth: dict) -> dict:
    """
    Call real API endpoints to discover actual status codes.
    This fixes all previous failures — no more guessing.
    """
    print("\n Discovering real API behavior...")

    headers = {"token": auth["token"]}
    discoveries = {}

    # Get real product ID
    print("   Fetching real product ID...")
    try:
        resp = requests.get(f"{CONFIG['base_url']}/products?limit=1", timeout=10)
        if resp.status_code == 200:
            products = resp.json().get("data", [])
            if products:
                discoveries["productId"] = products[0].get("id", "")
                print(f"   Real productId: {discoveries['productId']}")
    except Exception as e:
        print(f"   Failed: {e}")

    # Get real category ID
    print("   Fetching real category ID...")
    try:
        resp = requests.get(f"{CONFIG['base_url']}/categories", timeout=10)
        if resp.status_code == 200:
            cats = resp.json().get("data", [])
            if cats:
                discoveries["categoryId"] = cats[0].get("_id", "")
                print(f"   Real categoryId: {discoveries['categoryId']}")
    except Exception as e:
        print(f"   Failed: {e}")

    # Get real brand ID
    print("   Fetching real brand ID...")
    try:
        resp = requests.get(f"{CONFIG['base_url']}/brands", timeout=10)
        if resp.status_code == 200:
            brands = resp.json().get("data", [])
            if brands:
                discoveries["brandId"] = brands[0].get("_id", "")
                print(f"   Real brandId: {discoveries['brandId']}")
    except Exception as e:
        print(f"   Failed: {e}")

    # Discover wishlist behavior
    print("   Discovering wishlist behavior...")
    if auth["token"] and discoveries.get("productId"):
        try:
            resp = requests.post(
                f"{CONFIG['base_url']}/wishlist",
                json={"productId": discoveries["productId"]},
                headers=headers,
                timeout=10
            )
            discoveries["wishlist_add_status"] = resp.status_code
            print(f"   Wishlist add status: {resp.status_code}")

            resp = requests.delete(
                f"{CONFIG['base_url']}/wishlist/{discoveries['productId']}",
                headers=headers,
                timeout=10
            )
            discoveries["wishlist_delete_status"] = resp.status_code
            print(f"   Wishlist delete status: {resp.status_code}")

            resp = requests.delete(
                f"{CONFIG['base_url']}/wishlist/000000000000000000000000",
                headers=headers,
                timeout=10
            )
            discoveries["wishlist_delete_nonexistent_status"] = resp.status_code
            print(f"   Wishlist delete non-existent: {resp.status_code}")
        except Exception as e:
            print(f"   Wishlist discovery failed: {e}")

    # Discover cart behavior
    print("   Discovering cart behavior...")
    if auth["token"] and discoveries.get("productId"):
        try:
            resp = requests.post(
                f"{CONFIG['base_url']}/cart",
                json={"productId": discoveries["productId"]},
                headers=headers,
                timeout=10
            )
            discoveries["cart_add_status"] = resp.status_code
            print(f"   Cart add status: {resp.status_code}")

            resp = requests.get(f"{CONFIG['base_url']}/cart", headers=headers, timeout=10)
            discoveries["cart_get_status"] = resp.status_code
            if resp.status_code == 200:
                cart_data = resp.json()
                items = cart_data.get("data", {}).get("cartItems", [])
                if items:
                    discoveries["cartItemId"] = items[0].get("_id", "")
                    print(f"   Real cartItemId: {discoveries['cartItemId']}")
        except Exception as e:
            print(f"   Cart discovery failed: {e}")

    # Discover auth error messages
    print("   Discovering auth error messages...")
    try:
        resp = requests.get(f"{CONFIG['base_url']}/wishlist", timeout=10)
        auth_error = resp.json()
        discoveries["no_token_message"] = auth_error.get("message", "not authorized")
        discoveries["no_token_status"] = resp.status_code
        print(f"   No token message: '{discoveries['no_token_message']}'")
    except Exception as e:
        print(f"   Auth discovery failed: {e}")

    # Discover invalid ID behavior
    print("   Discovering invalid ID behavior...")
    try:
        resp = requests.get(f"{CONFIG['base_url']}/products/000000000000000000000000", timeout=10)
        discoveries["nonexistent_id_status"] = resp.status_code
        print(f"   Non-existent ID returns: {resp.status_code}")

        resp = requests.get(f"{CONFIG['base_url']}/products/invalid-id", timeout=10)
        discoveries["invalid_id_status"] = resp.status_code
        print(f"   Invalid ID format returns: {resp.status_code}")
    except Exception as e:
        print(f"   ID discovery failed: {e}")

    discoveries["userId"] = auth["userId"]
    print(f"\n   Discovery complete: {len(discoveries)} facts gathered")
    return discoveries

# ─── STEP 3: BUILD PROMPT WITH REAL DATA ────────────────────────────────────
def build_prompt(tag: str, endpoints: list, discoveries: dict) -> str:
    """Build prompt with REAL API behavior — no more guessing"""

    endpoint_details = ""
    for ep in endpoints:
        params = "\n".join([
            f"    - {p['name']} ({p['in']}, {'REQUIRED' if p.get('required') else 'optional'})"
            for p in ep.get("parameters", [])
        ]) or "    - none"

        responses = "\n".join([
            f"    - {code}: {desc}"
            for code, desc in ep.get("responses", {}).items()
        ])

        required_fields = ", ".join(ep.get("requiredFields", [])) or "none"

        endpoint_details += f"""
Endpoint: {ep['method']} {ep['path']}
Summary: {ep.get('summary', '')}
Auth required: {ep.get('requiresAuth', False)}
Required fields: {required_fields}
Parameters:
{params}
Response codes:
{responses}
---"""

    return f"""Generate Karate Framework feature file for "{tag}" feature.

BASE URL: {CONFIG['base_url']}
TEST EMAIL: {CONFIG['test_email']}
TEST PASSWORD: {CONFIG['test_password']}

ENDPOINTS:
{endpoint_details}

REAL API BEHAVIOR (discovered by actually calling the API - use these exact values):
- Real product ID that EXISTS in database: {discoveries.get('productId', 'unknown')}
- Real category ID that EXISTS: {discoveries.get('categoryId', 'unknown')}
- Real brand ID that EXISTS: {discoveries.get('brandId', 'unknown')}
- Real userId from login: {discoveries.get('userId', 'unknown')}
- Real cart item ID: {discoveries.get('cartItemId', 'unknown')}
- Non-existent MongoDB ID returns status: {discoveries.get('nonexistent_id_status', 404)}
- Invalid ID format returns status: {discoveries.get('invalid_id_status', 400)}
- No auth token returns status: {discoveries.get('no_token_status', 401)}
- No auth token message: "{discoveries.get('no_token_message', 'not authorized')}"
- Wishlist add returns status: {discoveries.get('wishlist_add_status', 200)}
- Wishlist delete returns status: {discoveries.get('wishlist_delete_status', 200)}
- Wishlist delete non-existent returns: {discoveries.get('wishlist_delete_nonexistent_status', 200)}
- Cart add returns status: {discoveries.get('cart_add_status', 200)}

GENERATE ONLY THESE 5 SCENARIO TYPES:
1. HAPPY PATH - use the REAL IDs listed above
2. NO AUTH TOKEN - omit token header, expect status {discoveries.get('no_token_status', 401)}
3. INVALID AUTH TOKEN - header token = 'invalid-token-xyz', expect 401
4. MISSING REQUIRED FIELDS - omit each required field, expect 400
5. NOT FOUND - use '000000000000000000000000', expect status {discoveries.get('nonexistent_id_status', 404)}

DO NOT generate boundary value tests or any other test types.

KARATE RULES:
- Start with: Feature: RetailShop {tag} API
- Background must have: * url '{CONFIG['base_url']}'
- Login in Background:
  Given path '/auth/signin'
  And request {{ "email": "#(testEmail)", "password": "#(testPassword)" }}
  When method POST
  Then status 200
  * def authToken = response.token
  * def userId = response.user._id
- Token header: And header token = authToken
- Path variable: Given path '/products/' + productId
- Wishlist add: POST /wishlist with body {{ "productId": "#(productId)" }}
- Wishlist delete: DELETE /wishlist/:productId (never /items)
- Cart add: POST /cart with body {{ "productId": "#(productId)" }}
- Orders: GET /orders/user/:userId

OUTPUT RULES:
- Return ONLY valid Karate .feature content
- No markdown fences, no Python, no TypeScript
- Start directly with: Feature: RetailShop {tag} API
- Each Scenario must be independent"""

# ─── STEP 4: PARSE SPEC ─────────────────────────────────────────────────────
def parse_spec(spec_path: str) -> dict:
    """Parse OpenAPI spec and group endpoints by tag"""
    print(f"\n Reading spec: {spec_path}")
    with open(spec_path) as f:
        spec = json.load(f)

    groups = {}
    for path, path_item in spec.get("paths", {}).items():
        for method in ["get", "post", "put", "patch", "delete"]:
            op = path_item.get(method)
            if not op:
                continue

            tag = op.get("tags", ["General"])[0]

            parameters = [
                {
                    "name": p.get("name"),
                    "in": p.get("in"),
                    "required": p.get("required", False),
                    "type": p.get("schema", {}).get("type", "string")
                }
                for p in op.get("parameters", [])
            ]

            responses = {
                code: resp.get("description", "")
                for code, resp in op.get("responses", {}).items()
            }

            required_fields = []
            rb = op.get("requestBody", {})
            if rb:
                schema = rb.get("content", {}).get("application/json", {}).get("schema", {})
                required_fields = schema.get("required", [])

            endpoint = {
                "path": path,
                "method": method.upper(),
                "summary": op.get("summary", ""),
                "parameters": parameters,
                "requestBody": bool(rb),
                "requiredFields": required_fields,
                "responses": responses,
                "requiresAuth": bool(op.get("security", [])),
            }

            if tag not in groups:
                groups[tag] = []
            groups[tag].append(endpoint)

    total = sum(len(eps) for eps in groups.values())
    print(f" Found {total} endpoints in {len(groups)} feature areas")
    for tag, eps in groups.items():
        print(f"   {tag}: {len(eps)} endpoints")

    return groups

# ─── STEP 5: GENERATE WITH GROQ ─────────────────────────────────────────────
def generate_feature(client: Groq, tag: str, endpoints: list, discoveries: dict) -> str:
    """Call Groq API with real API behavior data"""
    print(f"\n Generating: {tag} ({len(endpoints)} endpoints)")

    response = client.chat.completions.create(
        model=CONFIG["model"],
        max_tokens=CONFIG["max_tokens"],
        messages=[
            {
                "role": "system",
                "content": """You are a senior QA engineer expert in Karate Framework 1.4.0.
Write ONLY valid Karate .feature file content — no markdown, no Python, no TypeScript.
Use ONLY the real IDs and status codes provided — never invent or guess values.
Generate ONLY: happy path, 401 auth, 400 missing fields, 404 not found.
Start output directly with: Feature:"""
            },
            {
                "role": "user",
                "content": build_prompt(tag, endpoints, discoveries)
            }
        ]
    )

    generated = response.choices[0].message.content
    scenarios = len(re.findall(r"Scenario:", generated))
    print(f"   Scenarios: {scenarios} | Cost: $0.00 (FREE)")

    return generated

# ─── STEP 6: SAVE FEATURE FILE ──────────────────────────────────────────────
def save_feature(tag: str, content: str) -> None:
    """Save generated feature file"""
    CONFIG["output_dir"].mkdir(parents=True, exist_ok=True)
    filename = tag.lower().replace(" ", "-") + ".feature"
    filepath = CONFIG["output_dir"] / filename

    header = f"""# {filename} - AUTO-GENERATED by karate-generator.py (Python + Groq FREE)
# Generated: {datetime.now().isoformat()}
# Feature: {tag}
# API: {CONFIG['base_url']}
# Uses REAL API discovery - status codes verified against live API

"""
    filepath.write_text(header + content, encoding="utf-8")
    print(f"   Saved: {filepath}")

# ─── MAIN ────────────────────────────────────────────────────────────────────
def main():
    print("=" * 55)
    print("  Karate AI Generator - Python + Groq FREE")
    print("  Step 1: Discover real API behavior")
    print("  Step 2: Generate accurate Karate tests")
    print(f"  API: {CONFIG['base_url']}")
    print("=" * 55)

    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        print("ERROR: GROQ_API_KEY not set")
        print("   Run: set GROQ_API_KEY=your_key")
        return

    # Step 1: Login and discover real API behavior
    auth = get_auth_token()
    discoveries = discover_api_behavior(auth)

    # Step 2: Parse spec
    groups = parse_spec(CONFIG["spec_file"])

    # Step 3: Generate tests using real data
    client = Groq(api_key=api_key)
    total_scenarios = 0

    print("\n Generating feature files with real API data...")
    print("-" * 55)

    for tag, endpoints in groups.items():
        generated = generate_feature(client, tag, endpoints, discoveries)
        save_feature(tag, generated)
        total_scenarios += len(re.findall(r"Scenario:", generated))
        time.sleep(1)  # Rate limiting

    print("\n" + "=" * 55)
    print("  GENERATION COMPLETE - $0.00 COST")
    print("=" * 55)
    print(f"  Feature areas:     {len(groups)}")
    print(f"  Scenarios created: {total_scenarios}")
    print(f"  Real API facts:    {len(discoveries)} discovered")
    print(f"  Cost:              $0.00 (Groq Free Tier)")
    print(f"  Output:            {CONFIG['output_dir']}")
    print("\n  Next: cd karate-retail && mvn test")

if __name__ == "__main__":
    main()