package com.qelead.tests;

import com.qelead.base.BaseTest;
import com.qelead.pages.CartPage;
import com.qelead.pages.CheckoutPage;
import com.qelead.pages.InventoryPage;
import com.qelead.pages.LoginPage;
import io.qameta.allure.Description;
import io.qameta.allure.Feature;
import io.qameta.allure.Severity;
import io.qameta.allure.SeverityLevel;
import org.testng.Assert;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;

@Feature("Checkout")
public class CheckoutTest extends BaseTest {

    private LoginPage loginPage;
    private InventoryPage inventoryPage;

    @BeforeMethod
    public void login() {
        loginPage = new LoginPage(driver);
        loginPage.navigateTo();
        loginPage.login("standard_user", "secret_sauce");
        inventoryPage = new InventoryPage(driver);
    }

    @Test
    @Description("Add item to cart and verify cart page")
    @Severity(SeverityLevel.CRITICAL)
    public void testAddItemAndViewCart() {
        inventoryPage.addFirstItemToCart();
        inventoryPage.clickCart();

        CartPage cartPage = new CartPage(driver);
        Assert.assertTrue(cartPage.isOnCartPage(), "Should be on cart page");
        Assert.assertEquals(cartPage.getCartItemCount(), 1, "Cart should have 1 item");
    }

    @Test
    @Description("Complete full checkout flow")
    @Severity(SeverityLevel.CRITICAL)
    public void testCompleteCheckout() {
        inventoryPage.addFirstItemToCart();
        inventoryPage.clickCart();

        CartPage cartPage = new CartPage(driver);
        cartPage.clickCheckout();

        CheckoutPage checkoutPage = new CheckoutPage(driver);
        Assert.assertTrue(checkoutPage.isOnCheckoutPage(), "Should be on checkout page");

        checkoutPage.enterShippingInfo("John", "Doe", "12345");
        checkoutPage.clickContinue();
        checkoutPage.clickFinish();

        Assert.assertTrue(checkoutPage.isOrderComplete(), "Order should be complete");
        Assert.assertEquals(checkoutPage.getSuccessMessage(), "Thank you for your order!");
    }

    @Test
    @Description("Checkout with missing first name shows error")
    @Severity(SeverityLevel.NORMAL)
    public void testCheckoutMissingFirstName() {
        inventoryPage.addFirstItemToCart();
        inventoryPage.clickCart();

        CartPage cartPage = new CartPage(driver);
        cartPage.clickCheckout();

        CheckoutPage checkoutPage = new CheckoutPage(driver);
        checkoutPage.enterShippingInfo("", "Doe", "12345");
        checkoutPage.clickContinue();

        Assert.assertTrue(checkoutPage.getErrorMessage().contains("First Name is required"));
    }

    @Test
    @Description("Remove item from cart")
    @Severity(SeverityLevel.NORMAL)
    public void testRemoveItemFromCart() {
        inventoryPage.addFirstItemToCart();
        inventoryPage.clickCart();

        CartPage cartPage = new CartPage(driver);
        Assert.assertEquals(cartPage.getCartItemCount(), 1, "Cart should have 1 item");

        cartPage.removeFirstItem();
        Assert.assertEquals(driver.findElements(
            org.openqa.selenium.By.cssSelector(".cart_item")).size(), 0, "Cart should be empty");
    }

    @Test
    @Description("Continue shopping from cart returns to inventory")
    @Severity(SeverityLevel.NORMAL)
    public void testContinueShoppingFromCart() {
        inventoryPage.addFirstItemToCart();
        inventoryPage.clickCart();

        CartPage cartPage = new CartPage(driver);
        cartPage.clickContinueShopping();

        Assert.assertTrue(inventoryPage.isOnInventoryPage(), "Should be back on inventory page");
    }
}