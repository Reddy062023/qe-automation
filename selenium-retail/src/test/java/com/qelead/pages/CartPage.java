package com.qelead.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import java.time.Duration;

public class CartPage {

    private WebDriver driver;
    private WebDriverWait wait;

    private By cartItems = By.cssSelector(".cart_item");
    private By checkoutButton = By.id("checkout");
    private By continueShoppingButton = By.id("continue-shopping");
    private By removeButtons = By.cssSelector("[data-test^='remove']");
    private By cartItemNames = By.cssSelector(".inventory_item_name");

    public CartPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(15));
    }

    public int getCartItemCount() {
        try {
            wait.until(ExpectedConditions.visibilityOfElementLocated(cartItems));
            return driver.findElements(cartItems).size();
        } catch (Exception e) {
            return 0;
        }
    }

    public String getFirstItemName() {
        wait.until(ExpectedConditions.visibilityOfElementLocated(cartItemNames));
        return driver.findElements(cartItemNames).get(0).getText();
    }

    public void clickCheckout() {
        wait.until(ExpectedConditions.visibilityOfElementLocated(checkoutButton));
        wait.until(ExpectedConditions.elementToBeClickable(checkoutButton));
        driver.findElement(checkoutButton).click();
        wait.until(ExpectedConditions.urlContains("checkout"));
    }

    public void clickContinueShopping() {
        wait.until(ExpectedConditions.elementToBeClickable(continueShoppingButton));
        driver.findElement(continueShoppingButton).click();
        wait.until(ExpectedConditions.urlContains("inventory"));
    }

    public void removeFirstItem() {
        wait.until(ExpectedConditions.elementToBeClickable(removeButtons));
        driver.findElement(removeButtons).click();
        try { Thread.sleep(1000); } catch (Exception e) {}
    }

    public boolean isOnCartPage() {
        return driver.getCurrentUrl().contains("cart");
    }
}