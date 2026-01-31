from playwright.sync_api import sync_playwright

def verify_render():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("http://localhost:3000")

        # Wait for canvas to load
        page.wait_for_selector("canvas")

        # Add some keys to ensure we have content to cache
        # Assuming there is a button "Add Keys" or similar in TopBar
        # Adjusting selector based on assumption or previous knowledge
        try:
            # Try to find the Add Key button.
            # If not found, we might need to rely on default keys if any.
            page.get_by_role("button", name="Add Keys").click()
            # Add a few more
            page.get_by_role("button", name="Add Keys").click()
            page.get_by_role("button", name="Add Keys").click()
        except Exception as e:
            print(f"Could not click Add Keys: {e}")

        # Wait a bit for rendering/caching
        page.wait_for_timeout(1000)

        # Take screenshot
        page.screenshot(path="verification/render_check.png")
        print("Screenshot saved to verification/render_check.png")
        browser.close()

if __name__ == "__main__":
    verify_render()
