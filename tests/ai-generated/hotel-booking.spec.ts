import { test, expect, Page } from '@playwright/test';

/**
 * Page Object Model for Hotel Room Booking
 * Encapsulates all selectors and interactions for the booking page
 */
class HotelBookingPage {
  constructor(private page: Page) {}

  // Selectors
  private checkInDateInput = 'input[data-testid="check-in-date"]';
  private checkOutDateInput = 'input[data-testid="check-out-date"]';
  private adultsSelect = 'select[data-testid="num-adults"]';
  private childrenSelect = 'select[data-testid="num-children"]';
  private searchButton = 'button:has-text("Search")';
  private roomTypeFilter = 'div[data-testid="room-type-filter"]';
  private roomCards = 'div[data-testid="room-card"]';
  private bookNowButton = 'button:has-text("Book Now")';
  private noResultsMessage = 'div[data-testid="no-results-message"]';
  private dateErrorMessage = 'div[data-testid="date-error"]';
  private roomPrice = 'span[data-testid="room-price"]';
  private roomName = 'h3[data-testid="room-name"]';
  private roomAmenities = 'ul[data-testid="room-amenities"]';
  private roomFilterStandard = 'input[value="standard"]';
  private roomFilterSuite = 'input[value="suite"]';
  private roomFilterVilla = 'input[value="villa"]';

  /**
   * Navigate to the hotel booking page
   */
  async goto() {
    await this.page.goto('https://www.mgmresorts.com/en/hotel-rooms.html');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Enter check-in date
   * @param date - Date string in format YYYY-MM-DD
   */
  async setCheckInDate(date: string) {
    await this.page.fill(this.checkInDateInput, date);
  }

  /**
   * Enter check-out date
   * @param date - Date string in format YYYY-MM-DD
   */
  async setCheckOutDate(date: string) {
    await this.page.fill(this.checkOutDateInput, date);
  }

  /**
   * Select number of adults
   * @param count - Number of adults
   */
  async selectAdults(count: string) {
    await this.page.selectOption(this.adultsSelect, count);
  }

  /**
   * Select number of children
   * @param count - Number of children
   */
  async selectChildren(count: string) {
    await this.page.selectOption(this.childrenSelect, count);
  }

  /**
   * Click search button to search for available rooms
   */
  async clickSearch() {
    await this.page.click(this.searchButton);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Filter rooms by type
   * @param roomType - Type of room: 'standard', 'suite', or 'villa'
   */
  async filterByRoomType(roomType: 'standard' | 'suite' | 'villa') {
    let selector: string;
    switch (roomType) {
      case 'standard':
        selector = this.roomFilterStandard;
        break;
      case 'suite':
        selector = this.roomFilterSuite;
        break;
      case 'villa':
        selector = this.roomFilterVilla;
        break;
    }
    await this.page.check(selector);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get all room cards from search results
   */
  async getRoomCards() {
    return this.page.locator(this.roomCards);
  }

  /**
   * Get room count from results
   */
  async getRoomCount() {
    return this.page.locator(this.roomCards).count();
  }

  /**
   * Get room details by index
   * @param index - Index of the room card
   */
  async getRoomDetails(index: number) {
    const roomCard = this.page.locator(this.roomCards).nth(index);
    const name = await roomCard.locator(this.roomName).textContent();
    const price = await roomCard.locator(this.roomPrice).textContent();
    const amenitiesElement = roomCard.locator(this.roomAmenities);
    const amenitiesCount = await amenitiesElement.locator('li').count();

    return {
      name: name?.trim(),
      price: price?.trim(),
      amenitiesCount,
    };
  }

  /**
   * Click Book Now button for a specific room
   * @param index - Index of the room card
   */
  async clickBookNow(index: number) {
    const roomCard = this.page.locator(this.roomCards).nth(index);
    await roomCard.locator(this.bookNowButton).click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if no results message is visible
   */
  async isNoResultsMessageVisible() {
    return this.page.locator(this.noResultsMessage).isVisible();
  }

  /**
   * Get no results message text
   */
  async getNoResultsMessage() {
    return this.page.locator(this.noResultsMessage).textContent();
  }

  /**
   * Check if date error is visible
   */
  async isDateErrorVisible() {
    return this.page.locator(this.dateErrorMessage).isVisible();
  }

  /**
   * Get date error message
   */
  async getDateErrorMessage() {
    return this.page.locator(this.dateErrorMessage).textContent();
  }

  /**
   * Verify room card contains all required elements
   * @param index - Index of the room card
   */
  async verifyRoomCardComplete(index: number) {
    const roomCard = this.page.locator(this.roomCards).nth(index);
    
    const hasName = await roomCard.locator(this.roomName).isVisible();
    const hasPrice = await roomCard.locator(this.roomPrice).isVisible();
    const hasAmenities = await roomCard.locator(this.roomAmenities).isVisible();
    const hasBookButton = await roomCard.locator(this.bookNowButton).isVisible();

    return hasName && hasPrice && hasAmenities && hasBookButton;
  }

  /**
   * Get current page URL
   */
  async getCurrentUrl() {
    return this.page.url();
  }
}

// Test Suite
test.describe('Hotel Room Booking - Search and Filter', () => {
  let bookingPage: HotelBookingPage;

  test.beforeEach(async ({ page }) => {
    bookingPage = new HotelBookingPage(page);
    await bookingPage.goto();
  });

  // ============================================================================
  // POSITIVE TEST CASES
  // ============================================================================

  test('AC1: Guest can enter check-in and check-out dates and see available rooms', async () => {
    // GIVEN: Guest is on the hotel booking page
    // WHEN: Guest enters valid check-in and check-out dates
    const futureCheckIn = new Date();
    futureCheckIn.setDate(futureCheckIn.getDate() + 5);
    const checkInDate = futureCheckIn.toISOString().split('T')[0];

    const futureCheckOut = new Date(futureCheckIn);
    futureCheckOut.setDate(futureCheckOut.getDate() + 3);
    const checkOutDate = futureCheckOut.toISOString().split('T')[0];

    await bookingPage.setCheckInDate(checkInDate);
