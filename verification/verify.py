from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:3000")

        # Wait for the sidebar to be visible
        # The sidebar has a header "Projects"
        page.wait_for_selector("text=Projects")

        # Take a screenshot
        page.screenshot(path="verification/sidebar.png")

        browser.close()

if __name__ == "__main__":
    run()
