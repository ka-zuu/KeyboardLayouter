
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        try:
            # Navigate to app
            page.goto("http://localhost:3000")

            # Wait for canvas
            page.wait_for_selector("div.bg-neutral-900", state="visible")

            # Find the "1U" preset using class and text
            # The preset div has 'group' class and contains text '1U'
            preset_btn = page.locator(".group").filter(has_text="1U").first

            if preset_btn.is_visible():
                print("Found 1U preset")
                preset_btn.click()
            else:
                print("1U preset not found")

            # Wait a bit for render
            page.wait_for_timeout(1000)

            # Take screenshot
            page.screenshot(path="verification/canvas_key_added.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
