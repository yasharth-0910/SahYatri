import os
import time
import threading
import requests
import cv2
import numpy as np
import smbus2
from picamera2 import Picamera2
from datetime import datetime
from flask import Flask, Response, render_template_string
from RPLCD.i2c import CharLCD
import geocoder  # For getting location

# ========================
# Configuration
# ========================
API_URL = "http://192.168.137.1:8000/detect"
CAMERA_ID = "bus-1"
IMAGE_DIR = "/home/admin/images"
STREAM_PORT = 8001
I2C_ADDRESS = 0x27  # Common addresses: 0x27 or 0x3F
MAX_RETRIES = 5
CAPTURE_INTERVAL = 5  # seconds
os.makedirs(IMAGE_DIR, exist_ok=True)

# ========================
# System State
# ========================
app = Flask(__name__)
picam2 = None
current_occupancy = 0
current_capacity = 1
last_update = "Not yet updated"
system_status = "Initializing"
camera_ready = False
api_available = False
location_info = "NA/NA"  # Location will be updated later

# ========================
# Initialize Hardware
# ========================
try:
    lcd = CharLCD('PCF8574', I2C_ADDRESS)
    lcd.clear()
    lcd.write_string("System Startup")
except Exception as e:
    print(f"[!] LCD initialization failed: {e}")
    lcd = None

# ========================
# Core Functions
# ========================
def update_system_status(occupancy, capacity):
    global current_occupancy, current_capacity, last_update, system_status
    current_occupancy = occupancy
    current_capacity = capacity
    last_update = datetime.now().strftime("%H:%M:%S")

    if occupancy >= capacity:
        system_status = "FULL!"
    elif occupancy >= capacity * 0.8:
        system_status = "NEAR FULL"
    else:
        system_status = "OK"

    update_lcd()

def update_lcd():
    if not lcd:
        return

    try:
        lcd.clear()
        status = system_status.replace(" ", "")  # Remove spaces for LCD
        lcd.write_string(f"Occ:{current_occupancy}/{current_capacity}\nSt:{status}")
    except Exception as e:
        print(f"[!] LCD update error: {e}")

def initialize_camera():
    global picam2, camera_ready

    for attempt in range(MAX_RETRIES):
        try:
            picam2 = Picamera2()
            video_config = picam2.create_video_configuration(
                main={"size": (640, 480)},
                controls={"FrameRate": 30}
            )
            picam2.configure(video_config)
            picam2.start()
            time.sleep(2)  # Camera warm-up
            camera_ready = True
            print("[+] Camera initialized successfully")
            return picam2
        except Exception as e:
            print(f"[!] Camera init attempt {attempt+1} failed: {e}")
            if attempt == MAX_RETRIES - 1:
                raise
            time.sleep(2)

def capture_and_process_image():
    if not camera_ready:
        return False

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{CAMERA_ID}_{timestamp}.jpg"
    image_path = os.path.join(IMAGE_DIR, filename)

    try:
        # Capture high-quality still image
        still_config = picam2.create_still_configuration()
        picam2.switch_mode_and_capture_file(still_config, image_path)
        print(f"[+] Captured {filename}")

        # Send to API
        with open(image_path, "rb") as img_file:
            files = {"image": (filename, img_file, "image/jpeg")}
            params = {"camera_id": CAMERA_ID}

            try:
                response = requests.post(API_URL, files=files, params=params, timeout=10)
                response.raise_for_status()

                data = response.json()
                print(f"[+] Detection result: {data}")
                update_system_status(data["occupancy"], data["capacity"])
                return True

            except requests.exceptions.RequestException as e:
                print(f"[!] API request failed: {e}")
                return False

    except Exception as e:
        print(f"[!] Image capture/processing error: {e}")
        return False

# ========================
# Video Streaming
# ========================
def generate_frames():
    while True:
        if not camera_ready:
            time.sleep(1)
            continue

        try:
            # Capture frame
            frame = picam2.capture_array()

            # Convert color space (PiCamera uses RGB, OpenCV uses BGR)
            frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)

            # Add information overlay
            overlay = np.zeros((100, frame.shape[1], 3), dtype=np.uint8)
            cv2.rectangle(overlay, (0, 0), (frame.shape[1], 100), (0, 0, 0), -1)

            # Add text to overlay
            info_text = f"Occupancy: {current_occupancy}/{current_capacity}"
            status_text = f"Status: {system_status} | Last Update: {last_update}"
            camera_text = f"Camera: {CAMERA_ID}"

            cv2.putText(frame, info_text, (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            cv2.putText(frame, status_text, (10, 60),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            cv2.putText(frame, camera_text, (10, 90),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.4, (200, 200, 200), 1)

            # Encode frame
            ret, buffer = cv2.imencode('.jpg', frame)
            if not ret:
                raise Exception("Frame encoding failed")

            frame_bytes = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

        except Exception as e:
            print(f"[!] Frame generation error: {e}")
            time.sleep(1)

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(),
                   mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/')
def dashboard():
    """Web dashboard with live video and status"""
    status_class = system_status.lower().replace(" ", "-")
    current_time = datetime.now().strftime('%H:%M:%S')

    return render_template_string('''
    <!DOCTYPE html>
    <html>
    <head>
        <title>Bus Monitoring System</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                padding: 20px;
                background-color: #f5f5f5;
                color: #333;
            }
            .header {
                text-align: center;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 2px solid #ddd;
            }
            .container {
                display: flex;
                flex-wrap: wrap;
                gap: 20px;
                justify-content: center;
            }
            .video-panel {
                flex: 2;
                min-width: 640px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                padding: 15px;
            }
            .status-panel {
                flex: 1;
                min-width: 300px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                padding: 20px;
            }
            .status-item {
                margin-bottom: 15px;
                padding-bottom: 15px;
                border-bottom: 1px solid #eee;
            }
            .status-label {
                font-weight: bold;
                color: #666;
                display: block;
                margin-bottom: 5px;
            }
            .status-value {
                font-size: 1.2em;
            }
            .ok { color: #4CAF50; }
            .near-full { color: #FFC107; }
            .full { color: #F44336; }
            .video-container {
                position: relative;
                padding-top: 56.25%; /* 16:9 Aspect Ratio */
            }
            .video-stream {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
            }
            .buttons {
                margin-top: 20px;
                display: flex;
                gap: 10px;
            }
            button {
                padding: 10px 15px;
                background: #2196F3;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.9em;
            }
            button:hover {
                background: #0b7dda;
            }
            .timestamp {
                font-size: 0.9em;
                color: #888;
                text-align: right;
                margin-top: 10px;
            }
            @media (max-width: 768px) {
                .container {
                    flex-direction: column;
                }
                .video-panel, .status-panel {
                    min-width: 100%;
                }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Bus Occupancy Monitoring System</h1>
        </div>

        <div class="container">
            <div class="video-panel">
                <div class="video-container">
                    <img src="/video_feed" class="video-stream">
                </div>
                <div class="timestamp">
                    System refresh: {{ current_time }}
                </div>
            </div>

            <div class="status-panel">
                <h2>System Status</h2>

                <div class="status-item">
                    <span class="status-label">Camera ID</span>
                    <span class="status-value">{{ camera_id }}</span>
                </div>

                <div class="status-item">
                    <span class="status-label">Occupancy</span>
                    <span class="status-value">{{ occupancy }}/{{ capacity }}</span>
                </div>

                <div class="status-item">
                    <span class="status-label">Status</span>
                    <span class="status-value {{ status_class }}">{{ status }}</span>
                </div>

                <div class="status-item">
                    <span class="status-label">Last Update</span>
                    <span class="status-value">{{ last_update }}</span>
                </div>

                <div class="status-item">
                    <span class="status-label">Location</span>
                    <span class="status-value">{{ location_info }}</span>
                </div>
            </div>
        </div>
    </body>
    </html>
    ''', current_time=current_time, camera_id=CAMERA_ID,
         occupancy=current_occupancy, capacity=current_capacity,
         status=system_status, last_update=last_update, 
         location_info=location_info, status_class=status_class)

def get_ip_location():
    global location_info
    g = geocoder.ip('me')
    if g.ok:
        location_info = f"{g.city}, {g.country}"
    else:
        location_info = "Unable to fetch location"

def periodic_updates():
    while True:
        capture_and_process_image()
        get_ip_location()
        time.sleep(CAPTURE_INTERVAL)

if __name__ == "__main__":
    try:
        picam2 = initialize_camera()
        threading.Thread(target=periodic_updates, daemon=True).start()
        app.run(host="0.0.0.0", port=STREAM_PORT, debug=False)
    except Exception as e:
        print(f"[!] System startup failed: {e}")
