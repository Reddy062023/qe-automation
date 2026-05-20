# auth.feature - Karate API tests for Authentication endpoints
#
# WHAT IS A FEATURE FILE?
# A feature file contains tests written in Gherkin syntax.
# Gherkin uses plain English keywords: Feature, Background, Scenario, Given, When, Then, And
# Anyone can read these tests - developers, testers, business analysts, clients
#
# WHAT IS GHERKIN?
# Gherkin is a language designed to describe software behaviour
# without detailing how that behaviour is implemented.
# It bridges the gap between business requirements and technical tests.
#
# KARATE SPECIFIC:
# Unlike regular Cucumber, Karate has HTTP built in.
# You do not need step definitions (no glue code).
# Karate interprets Given/When/Then directly as HTTP operations.

Feature: RetailShop Authentication API
  # Feature = the name of what we are testing
  # One feature file = one business feature area

  Background:
    # Background runs before EVERY Scenario in this file
    # Like beforeEach in Playwright or @Before in JUnit
    # Perfect for setting up common config like base URL
    * url 'https://jsonplaceholder.typicode.com'
    # NOTE: We use jsonplaceholder.typicode.com because it is free and always available
    # In a real project this would be: https://api.retailshop.com/v1

  # ─────────────────────────────────────────────────────────────────
  # SCENARIO 1: Happy Path - Valid login
  # ─────────────────────────────────────────────────────────────────
  Scenario: Valid credentials return 200 with user data
    # GIVEN = setup - what endpoint we are hitting
    Given path '/users/1'

    # WHEN = action - what HTTP method to use
    When method GET

    # THEN = assertion - what we expect back
    Then status 200

    # AND = more assertions
    And match response.id == 1
    And match response.name != null
    And match response.email != null

    # WHAT IS match?
    # match is Karate's assertion keyword
    # match response.id == 1       checks exact value
    # match response.name != null  checks field exists and is not null
    # match response contains { id: 1 }  checks partial match

  # ─────────────────────────────────────────────────────────────────
  # SCENARIO 2: Get all users - List endpoint
  # ─────────────────────────────────────────────────────────────────
  Scenario: Get all users returns array with 10 users
    Given path '/users'
    When method GET
    Then status 200

    # match each means every item in the array must match this schema
    # '#number' means the field must be a number
    # '#string' means the field must be a string
    # '#notnull' means the field must not be null
    And match each response == { id: '#number', name: '#string', username: '#string', email: '#string', address: '#object', phone: '#string', website: '#string', company: '#object' }

    # Check array has items
    And assert response.length == 10

  # ─────────────────────────────────────────────────────────────────
  # SCENARIO 3: Create a new user - POST request
  # ─────────────────────────────────────────────────────────────────
  Scenario: Create new user returns 201 with created user data
    # Define request body as JSON
    Given path '/users'
    And request
    """
    {
      "name": "QE Lead Automation",
      "username": "qelead",
      "email": "qelead@retailshop.com",
      "phone": "1-800-QE-LEAD"
    }
    """
    # WHAT IS """ """ ?
    # Triple quotes in Karate = multi-line JSON body
    # This is how you send request body in POST/PUT requests
    # Much cleaner than putting it all on one line

    When method POST
    Then status 201

    # Verify the response contains what we sent
    And match response.name == 'QE Lead Automation'
    And match response.email == 'qelead@retailshop.com'

    # jsonplaceholder returns a fake id for new resources
    And match response.id != null

  # ─────────────────────────────────────────────────────────────────
  # SCENARIO 4: Update a user - PUT request
  # ─────────────────────────────────────────────────────────────────
  Scenario: Update user returns 200 with updated data
    Given path '/users/1'
    And request
    """
    {
      "name": "Updated QE Lead",
      "email": "updated@retailshop.com"
    }
    """
    When method PUT
    Then status 200
    And match response.name == 'Updated QE Lead'

  # ─────────────────────────────────────────────────────────────────
  # SCENARIO 5: Delete a user - DELETE request
  # ─────────────────────────────────────────────────────────────────
  Scenario: Delete user returns 200
    Given path '/users/1'
    When method DELETE
    Then status 200

  # ─────────────────────────────────────────────────────────────────
  # SCENARIO 6: User not found - 404 error scenario
  # ─────────────────────────────────────────────────────────────────
  Scenario: Get non-existent user returns 404
    Given path '/users/999'
    When method GET
    # jsonplaceholder returns 404 for non-existent resources
    Then status 404

  # ─────────────────────────────────────────────────────────────────
  # SCENARIO 7: Using variables in Karate
  # ─────────────────────────────────────────────────────────────────
  Scenario: Demonstrate Karate variables
    # WHAT ARE KARATE VARIABLES?
    # * def = define a variable
    # Variables can be used anywhere with #(variableName) syntax

    * def userId = 2
    * def expectedEmail = 'Shanna@melissa.tv'

    Given path '/users/' + userId
    When method GET
    Then status 200
    And match response.id == '#(userId)'
    And match response.email == '#(expectedEmail)'