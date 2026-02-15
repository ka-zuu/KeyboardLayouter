
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        try:
            # Navigate to app
            page.goto("http://localhost:3000")

            # Wait for canvas (it has bg-neutral-900)
            # The canvas container is the main area.
            page.wait_for_selector("div.bg-neutral-900", state="visible")

            # Drag selection in the middle of the screen
            # Start: 500, 300
            # End: 800, 500
            page.mouse.move(500, 300)
            page.mouse.down()
            page.mouse.move(800, 500)

            # Take screenshot
            page.screenshot(path="verification/canvas_selection_box.png")

            page.mouse.up()

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
