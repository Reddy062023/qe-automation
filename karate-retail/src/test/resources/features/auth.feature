# auth.feature - Karate API tests for Authentication
# Using Route API - real public e-commerce API
# Base URL: https://ecommerce.routemisr.com/api/v1
# Test account: qelead.test2026@gmail.com / QeTest@2026

Feature: RetailShop Authentication API

  Background:
    * url 'https://ecommerce.routemisr.com/api/v1'
    * def testEmail = 'qelead.test2026@gmail.com'
    * def testPassword = 'QeTest@2026'

  # ─────────────────────────────────────────────────────────────────
  # SCENARIO 1: Valid login returns JWT token
  # ─────────────────────────────────────────────────────────────────
  Scenario: Valid credentials return 200 with JWT token
    Given path '/auth/signin'
    And request { "email": "#(testEmail)", "password": "#(testPassword)" }
    When method POST
    Then status 200
    And match response.message == 'success'
    And match response.token != null
    And match response.token == '#string'
    And match response.user.email == '#(testEmail)'

  # ─────────────────────────────────────────────────────────────────
  # SCENARIO 2: Wrong password returns 401
  # ─────────────────────────────────────────────────────────────────
  Scenario: Wrong password returns error message
    Given path '/auth/signin'
    And request { "email": "#(testEmail)", "password": "WrongPassword123" }
    When method POST
    Then status 401
    And match response.message == 'Incorrect email or password'

  # ─────────────────────────────────────────────────────────────────
  # SCENARIO 3: Missing password returns 400
  # ─────────────────────────────────────────────────────────────────
  Scenario: Missing password returns 400
    Given path '/auth/signin'
    And request { "email": "#(testEmail)" }
    When method POST
    Then status 400

  # ─────────────────────────────────────────────────────────────────
  # SCENARIO 4: Missing email returns 400
  # ─────────────────────────────────────────────────────────────────
  Scenario: Missing email returns 400
    Given path '/auth/signin'
    And request { "password": "#(testPassword)" }
    When method POST
    Then status 400

  # ─────────────────────────────────────────────────────────────────
  # SCENARIO 5: Non-existent email returns 401
  # ─────────────────────────────────────────────────────────────────
  Scenario: Non-existent email returns error
    Given path '/auth/signin'
    And request { "email": "nobody@nowhere.com", "password": "Test@1234" }
    When method POST
    Then status 401
    And match response.message == 'Incorrect email or password'

  # ─────────────────────────────────────────────────────────────────
  # SCENARIO 6: Store token and use in authenticated request
  # ─────────────────────────────────────────────────────────────────
  Scenario: Login then use token to access protected endpoint
    # Step 1 - Login and get token
    Given path '/auth/signin'
    And request { "email": "#(testEmail)", "password": "#(testPassword)" }
    When method POST
    Then status 200
    * def authToken = response.token

    # Step 2 - Use token to access cart (protected endpoint)
    Given path '/cart'
    And header token = authToken
    When method GET
    Then status 200

  # ─────────────────────────────────────────────────────────────────
  # SCENARIO 7: Access protected endpoint without token returns 401
  # ─────────────────────────────────────────────────────────────────
  Scenario: Access protected endpoint without token returns 401
    Given path '/cart'
    When method GET
    Then status 401