package com.qelead.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import java.time.Duration;

public class InventoryPage {

    private WebDriver driver;
    private WebDriverWait wait;

    private By pageTitle = By.cssSelector(".title");
    private By inventoryItems = By.cssSelector(".inventory_item");
    private By addToCartButtons = By.cssSelector("[data-test^='add-to-cart']");
    private By cartBadge = By.cssSelector(".shopping_cart_badge");
    private By cartIcon = By.cssSelector(".shopping_cart_link");

    public InventoryPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(15));
    }

    public String getPageTitle() {
        wait.until(ExpectedConditions.visibilityOfElementLocated(pageTitle));
        return driver.findElement(pageTitle).getText();
    }

    public int getInventoryItemCount() {
        wait.until(ExpectedConditions.visibilityOfElementLocated(inventoryItems));
        return driver.findElements(inventoryItems).size();
    }

    public void addFirstItemToCart() {
        wait.until(ExpectedConditions.elementToBeClickable(addToCartButtons));
        WebElement button = driver.findElements(addToCartButtons).get(0);
        ((JavascriptExecutor) driver).executeScript("arguments[0].click();", button);
        // Wait for button text to change to Remove
        try { Thread.sleep(500); } catch (Exception e) {}
    }

    public String getCartBadgeCount() {
        wait.until(ExpectedConditions.visibilityOfElementLocated(cartBadge));
        return driver.findElement(cartBadge).getText();
    }

    public void clickCart() {
        wait.until(ExpectedConditions.elementToBeClickable(cartIcon));
        ((JavascriptExecutor) driver).executeScript(
            "arguments[0].click();", driver.findElement(cartIcon));
        wait.until(ExpectedConditions.urlContains("cart"));
    }

    public boolean isOnInventoryPage() {
        return driver.getCurrentUrl().contains("inventory");
    }
}