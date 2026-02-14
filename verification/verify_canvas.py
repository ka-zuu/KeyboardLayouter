
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Navigate to app
        page.goto("http://localhost:3000")

        # Wait for canvas to be ready
        page.wait_for_selector("div[class*='bg-neutral-900']")

        # Add a key via UI if possible, or just interact with canvas
        # Let's try to drag a selection box
        # Canvas center is roughly 400, 300

        page.mouse.move(100, 100)
        page.mouse.down()
        page.mouse.move(300, 300)

        # Take screenshot while selection box is active (mouse is down)
        page.screenshot(path="verification/canvas_selection.png")

        page.mouse.up()

    except Exception as e:
        print(f"Error: {e}")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
