import requests
import os
import time
from picamera2 import Picamera2
from datetime import datetime

# Configuration
API_URL = "http://192.168.137.1:8000/detect"  # Replace with the IP address of your FastAPI server
CAMERA_ID = "bus-1"
IMAGE_DIR = "/home/admin/images"  # Change if needed
os.makedirs(IMAGE_DIR, exist_ok=True)

def initialize_camera():
    """Initialize the camera and retry if initialization fails."""
    attempts = 5
    for attempt in range(attempts):
        try:
            picam2 = Picamera2()
            picam2.start()
            time.sleep(2)  # Warm-up time
            print("[INFO] Camera initialized successfully.")
            return picam2
        except RuntimeError as e:
            print(f"[ERROR] Failed to initialize camera: {e}")
            if attempt < attempts - 1:
                print("[INFO] Retrying...")
                time.sleep(2)
            else:
                print("[ERROR] Camera initialization failed after multiple attempts.")
                raise

def capture_and_send_image(picam2):
    """Capture an image and send it to the API."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{CAMERA_ID}_{timestamp}.jpg"
    image_path = os.path.join(IMAGE_DIR, filename)
    picam2.capture_file(image_path)
    print(f"[INFO] Captured image: {image_path}")

    try:
        with open(image_path, "rb") as img_file:
            files = {"image": (filename, img_file, "image/jpeg")}  # Correct format for sending the file
            # Pass camera_id as a query parameter
            response = requests.post(f"{API_URL}?camera_id={CAMERA_ID}", files=files)
            print(f"[INFO] Sent image to API. Response: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"[ERROR] Failed to send image: {e}")


def main():
    picam2 = initialize_camera()
    try:
        while True:
            capture_and_send_image(picam2)
            time.sleep(5)  # Delay between captures (adjust as needed)
    except KeyboardInterrupt:
        print("[INFO] Exiting...")
        picam2.close()

if __name__ == "__main__":
    main()