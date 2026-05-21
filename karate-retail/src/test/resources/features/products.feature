# products.feature - Karate API tests for Products
# Using Route API - real public e-commerce API
# Base URL: https://ecommerce.routemisr.com/api/v1

Feature: RetailShop Products API

  Background:
    * url 'https://ecommerce.routemisr.com/api/v1'
    * def testEmail = 'qelead.test2026@gmail.com'
    * def testPassword = 'QeTest@2026'

  # ─────────────────────────────────────────────────────────────────
  # SCENARIO 1: Get all products
  # ─────────────────────────────────────────────────────────────────
  Scenario: Get all products returns 200 with product list
    Given path '/products'
    When method GET
    Then status 200
    And match response.results == '#number'
    And match response.data == '#[]'
    And assert response.results > 0

  # ─────────────────────────────────────────────────────────────────
  # SCENARIO 2: Get products with pagination
  # ─────────────────────────────────────────────────────────────────
  Scenario: Get products with page and limit parameters
    Given path '/products'
    And param page = 1
    And param limit = 5
    When method GET
    Then status 200
    And match response.data == '#[]'
    And assert response.data.length <= 5

  # ─────────────────────────────────────────────────────────────────
  # SCENARIO 3: Get single product by ID
  # ─────────────────────────────────────────────────────────────────
  Scenario: Get product by valid ID returns product details
    # First get a real product ID from the list
    Given path '/products'
    And param limit = 1
    When method GET
    Then status 200
    * def productId = response.data[0].id

    # Now get that specific product
    Given path '/products/' + productId
    When method GET
    Then status 200
    And match response.data.id == '#(productId)'
    And match response.data.title == '#string'
    And match response.data.price == '#number'

  # ─────────────────────────────────────────────────────────────────
  # SCENARIO 4: Get product with invalid ID returns 404
  # ─────────────────────────────────────────────────────────────────
  Scenario: Get product with non-existent ID returns 404
    Given path '/products/000000000000000000000000'
    When method GET
    Then status 404

  # ─────────────────────────────────────────────────────────────────
  # SCENARIO 5: Get all categories
  # ─────────────────────────────────────────────────────────────────
  Scenario: Get all categories returns list
    Given path '/categories'
    When method GET
    Then status 200
    And match response.data == '#[]'
    And assert response.data.length > 0

  # ─────────────────────────────────────────────────────────────────
  # SCENARIO 6: Get all brands
  # ─────────────────────────────────────────────────────────────────
  Scenario: Get all brands returns list
    Given path '/brands'
    When method GET
    Then status 200
    And match response.data == '#[]'

  # ─────────────────────────────────────────────────────────────────
  # SCENARIO 7: Add product to wishlist requires auth
  # ─────────────────────────────────────────────────────────────────
  Scenario: Add product to wishlist with valid token
    # Login first to get real token
    Given path '/auth/signin'
    And request { "email": "#(testEmail)", "password": "#(testPassword)" }
    When method POST
    Then status 200
    * def authToken = response.token

    # Get a real product ID
    Given path '/products'
    And param limit = 1
    When method GET
    Then status 200
    * def productId = response.data[0].id

    # Add to wishlist
    Given path '/wishlist'
    And header token = authToken
    And request { "productId": "#(productId)" }
    When method POST
    Then status 200
    And match response.message == '#string'

  # ─────────────────────────────────────────────────────────────────
  # SCENARIO 8: Access wishlist without token returns 401
  # ─────────────────────────────────────────────────────────────────
  Scenario: Access wishlist without token returns 401
    Given path '/wishlist'
    When method GET
    Then status 401