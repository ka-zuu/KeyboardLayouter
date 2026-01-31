from playwright.sync_api import sync_playwright

def verify_canvas():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        print("Navigating to localhost:3000")
        page.goto("http://localhost:3000")

        # Wait for canvas to load - might take a moment for Konva to render
        print("Waiting for canvas")
        page.wait_for_selector("canvas", timeout=10000)

        # Take screenshot
        print("Taking screenshot")
        page.screenshot(path="verification/canvas.png")
        browser.close()

if __name__ == "__main__":
    verify_canvas()
