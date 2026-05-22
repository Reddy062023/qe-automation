package com.qelead.tests;

import com.qelead.base.BaseTest;
import com.qelead.pages.InventoryPage;
import com.qelead.pages.LoginPage;
import io.qameta.allure.Description;
import io.qameta.allure.Feature;
import io.qameta.allure.Severity;
import io.qameta.allure.SeverityLevel;
import org.testng.Assert;
import org.testng.annotations.Test;

@Feature("Login")
public class LoginTest extends BaseTest {

    @Test
    @Description("Valid login redirects to inventory page")
    @Severity(SeverityLevel.CRITICAL)
    public void testValidLogin() {
        LoginPage loginPage = new LoginPage(driver);
        loginPage.navigateTo();
        loginPage.login("standard_user", "secret_sauce");

        InventoryPage inventoryPage = new InventoryPage(driver);
        Assert.assertTrue(inventoryPage.isOnInventoryPage(), "Should be on inventory page");
        Assert.assertEquals(inventoryPage.getPageTitle(), "Products");
    }

    @Test
    @Description("Invalid password shows error message")
    @Severity(SeverityLevel.NORMAL)
    public void testInvalidPassword() {
        LoginPage loginPage = new LoginPage(driver);
        loginPage.navigateTo();
        loginPage.login("standard_user", "wrong_password");

        Assert.assertTrue(loginPage.isErrorDisplayed(), "Error should be displayed");
        Assert.assertTrue(loginPage.getErrorMessage().contains("Username and password do not match"));
    }

    @Test
    @Description("Empty username shows error message")
    @Severity(SeverityLevel.NORMAL)
    public void testEmptyUsername() {
        LoginPage loginPage = new LoginPage(driver);
        loginPage.navigateTo();
        loginPage.login("", "secret_sauce");

        Assert.assertTrue(loginPage.isErrorDisplayed(), "Error should be displayed");
        Assert.assertTrue(loginPage.getErrorMessage().contains("Epic sadface: Username is required"));
    }

    @Test
    @Description("Locked out user shows error message")
    @Severity(SeverityLevel.NORMAL)
    public void testLockedOutUser() {
        LoginPage loginPage = new LoginPage(driver);
        loginPage.navigateTo();
        loginPage.login("locked_out_user", "secret_sauce");

        Assert.assertTrue(loginPage.isErrorDisplayed(), "Error should be displayed");
        Assert.assertTrue(loginPage.getErrorMessage().contains("locked out"));
    }

    @Test
    @Description("Inventory page shows 6 products")
    @Severity(SeverityLevel.NORMAL)
    public void testInventoryItemCount() {
        LoginPage loginPage = new LoginPage(driver);
        loginPage.navigateTo();
        loginPage.login("standard_user", "secret_sauce");

        InventoryPage inventoryPage = new InventoryPage(driver);
        Assert.assertEquals(inventoryPage.getInventoryItemCount(), 6, "Should show 6 products");
    }

    @Test
    @Description("Add item to cart updates cart badge")
    @Severity(SeverityLevel.CRITICAL)
    public void testAddToCart() {
        LoginPage loginPage = new LoginPage(driver);
        loginPage.navigateTo();
        loginPage.login("standard_user", "secret_sauce");

        InventoryPage inventoryPage = new InventoryPage(driver);
        inventoryPage.addFirstItemToCart();
        Assert.assertEquals(inventoryPage.getCartBadgeCount(), "1", "Cart should show 1 item");
    }
}