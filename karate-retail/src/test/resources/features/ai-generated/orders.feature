# orders.feature - FIXED manually after AI generation
# Feature: Orders
# API: https://ecommerce.routemisr.com/api/v1

Feature: RetailShop Orders API

  Background:
    * url 'https://ecommerce.routemisr.com/api/v1'
    * def testEmail = 'qelead.test2026@gmail.com'
    * def testPassword = 'QeTest@2026'
    * def invalidMongoId = '000000000000000000000000'

  # ─────────────────────────────────────────────────────────────────
  # SCENARIO 1: Get user orders - need real userId from login
  # ─────────────────────────────────────────────────────────────────
  Scenario: Get user orders with valid token
    # Login first
    Given path '/auth/signin'
    And request { "email": "#(testEmail)", "password": "#(testPassword)" }
    When method POST
    Then status 200
    * def authToken = response.token
    * def userId = response.user._id

    # Get orders for this user
    Given path '/orders/user/' + userId
    And header token = authToken
    When method GET
    Then status 200

  # ─────────────────────────────────────────────────────────────────
  # SCENARIO 2: Get orders without token returns 401
  # ─────────────────────────────────────────────────────────────────
  Scenario: Get user orders without token returns 401
    Given path '/orders/user/507f1f77bcf86cd799439011'
    When method GET
    Then status 401

  # ─────────────────────────────────────────────────────────────────
  # SCENARIO 3: Get orders with invalid user ID returns 400
  # ─────────────────────────────────────────────────────────────────
  Scenario: Get orders with invalid ID returns 400
    # Login first
    Given path '/auth/signin'
    And request { "email": "#(testEmail)", "password": "#(testPassword)" }
    When method POST
    Then status 200
    * def authToken = response.token

    # Try invalid ID
    Given path '/orders/user/invalid-id'
    And header token = authToken
    When method GET
    Then status 400

  # ─────────────────────────────────────────────────────────────────
  # SCENARIO 4: Checkout session with valid cart
  # ─────────────────────────────────────────────────────────────────
  Scenario: Create checkout session without token returns 401
    Given path '/orders/checkout-session/507f1f77bcf86cd799439011'
    And request { "shippingAddress": { "details": "123 Main Street", "phone": "01234567890", "city": "Cairo" } }
    When method POST
    Then status 401

  # ─────────────────────────────────────────────────────────────────
  # SCENARIO 5: Checkout with non-existent cart returns 404
  # ─────────────────────────────────────────────────────────────────
  Scenario: Checkout with non-existent cart ID returns 404
    # Login first
    Given path '/auth/signin'
    And request { "email": "#(testEmail)", "password": "#(testPassword)" }
    When method POST
    Then status 200
    * def authToken = response.token

    # Try non-existent cart
    Given path '/orders/checkout-session/000000000000000000000000'
    And header token = authToken
    And request { "shippingAddress": { "details": "123 Main Street", "phone": "01234567890", "city": "Cairo" } }
    When method POST
    Then status 404