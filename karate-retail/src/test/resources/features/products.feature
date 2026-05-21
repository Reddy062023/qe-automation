# products.feature - Karate API tests for Products endpoints
#
# NEW CONCEPTS IN THIS FILE:
# 1. Headers - how to send authentication token
# 2. Query parameters - how to filter results
# 3. Path parameters - how to pass ID in URL
# 4. Storing response values in variables
#
# We use jsonplaceholder.typicode.com/posts as our "products"
# In real project this would be: https://api.retailshop.com/v1/products

Feature: RetailShop Products API

  Background:
    # Base URL set once - applies to all Scenarios
    * url 'https://jsonplaceholder.typicode.com'

    # NEW CONCEPT 1: Define variables in Background
    # These are available in ALL Scenarios in this file
    # In real project this token comes from login response
    * def authToken = 'Bearer test-token-12345'
    * def adminToken = 'Bearer admin-token-99999'

  # ─────────────────────────────────────────────────────────────────
  # SCENARIO 1: Get all products (no auth needed for public endpoint)
  # ─────────────────────────────────────────────────────────────────
  Scenario: Get all products returns 200 with list
    Given path '/posts'
    When method GET
    Then status 200

    # Check response is an array with items
    And assert response.length > 0

    # NEW CONCEPT 2: match each
    # Validates EVERY item in array matches this schema
    # '#number' = must be a number
    # '#string' = must be a string
    # '#notnull' = must not be null
    And match each response contains { id: '#number', title: '#string' }

  # ─────────────────────────────────────────────────────────────────
  # SCENARIO 2: Get product by ID - path parameter
  # ─────────────────────────────────────────────────────────────────
  Scenario: Get product by valid ID returns 200
    # NEW CONCEPT 3: Path parameters
    # Use variable in path with + concatenation
    * def productId = 1

    Given path '/posts/' + productId
    When method GET
    Then status 200

    # Verify the correct product returned
    And match response.id == 1
    And match response.title != null
    And match response.body != null

  # ─────────────────────────────────────────────────────────────────
  # SCENARIO 3: Get non-existent product - 404 error scenario
  # ─────────────────────────────────────────────────────────────────
  Scenario: Get product with invalid ID returns 404
    Given path '/posts/999999'
    When method GET
    # 404 = product does not exist
    Then status 404

  # ─────────────────────────────────────────────────────────────────
  # SCENARIO 4: Get products with query parameter - filter
  # ─────────────────────────────────────────────────────────────────
  Scenario: Filter products by userId returns filtered list
    Given path '/posts'

    # NEW CONCEPT 4: Query parameters
    # This adds ?userId=1 to the URL
    # In real project: ?category=electronics&minPrice=100
    And param userId = 1

    When method GET
    Then status 200

    # All returned products should belong to userId 1
    And match each response contains { userId: 1 }

  # ─────────────────────────────────────────────────────────────────
  # SCENARIO 5: Create product with authentication header
  # ─────────────────────────────────────────────────────────────────
  Scenario: Create product with valid auth returns 201
    Given path '/posts'

    # NEW CONCEPT 5: Request headers
    # Send authentication token in Authorization header
    # In real project this is required for POST/PUT/DELETE
    And header Authorization = authToken
    And header Content-Type = 'application/json'

    # Request body - the new product data
    And request
    """
    {
      "title": "Laptop Pro 15 inch",
      "body": "High performance laptop for professionals",
      "userId": 1,
      "price": 1299.99,
      "category": "electronics"
    }
    """
    When method POST
    Then status 201

    # Verify response contains created product data
    And match response.title == 'Laptop Pro 15 inch'
    And match response.id != null

  # ─────────────────────────────────────────────────────────────────
  # SCENARIO 6: Update product - PUT request with auth
  # ─────────────────────────────────────────────────────────────────
  Scenario: Update product with valid auth returns 200
    Given path '/posts/1'
    And header Authorization = authToken

    And request
    """
    {
      "title": "Updated Laptop Pro 15 inch",
      "price": 999.99
    }
    """
    When method PUT
    Then status 200
    And match response.title == 'Updated Laptop Pro 15 inch'

  # ─────────────────────────────────────────────────────────────────
  # SCENARIO 7: Delete product with auth
  # ─────────────────────────────────────────────────────────────────
  Scenario: Delete product with valid auth returns 200
    Given path '/posts/1'
    And header Authorization = authToken
    When method DELETE
    Then status 200

  # ─────────────────────────────────────────────────────────────────
  # SCENARIO 8: Store response value and use in next step
  # ─────────────────────────────────────────────────────────────────
  Scenario: Get product and verify specific field value
    Given path '/posts/1'
    When method GET
    Then status 200

    # NEW CONCEPT 6: Store response value in variable
    # def variableName = response.fieldName
    * def productTitle = response.title

    # Use stored value in assertion
    And match productTitle == 'sunt aut facere repellat provident occaecati excepturi optio reprehenderit'

    # Print to console for debugging
    * print 'Product title is: ' + productTitle