import os
import time
import threading
import requests
import cv2
import numpy as np
import geocoder
from picamera2 import Picamera2
from datetime import datetime
from flask import Flask, Response, render_template_string
from RPLCD.i2c import CharLCD

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
LOCATION_UPDATE_INTERVAL = 60  # Update location every minute
os.makedirs(IMAGE_DIR, exist_ok=True)

# ========================
# System State
# ========================
app = Flask(_name_)
picam2 = None
current_occupancy = 0
current_capacity = 40
last_update = "Not yet updated"
system_status = "Initializing"
camera_ready = False
api_available = False
location_info = "Locating..."
last_location_update = "Never"

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
# GPS/Location Functions
# ========================
def get_ip_location():
    global location_info, last_location_update
    try:
        g = geocoder.ip('me')
        if g.ok:
            location_info = f"{g.city}, {g.country}"
            last_location_update = datetime.now().strftime("%H:%M:%S")
            print(f"[GPS] Location updated: {location_info}")
        else:
            location_info = "Location unknown"
            print("[!] GPS: Could not get location data")
    except Exception as e:
        print(f"[!] GPS Error: {e}")
        location_info = "GPS Error"

def location_updater():
    while True:
        get_ip_location()
        update_lcd()  # Update LCD with new location info
        time.sleep(LOCATION_UPDATE_INTERVAL)

# ========================
# Camera Functions
# ========================
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
        # First line: Occupancy and status
        lcd.write_string(f"Occ:{current_occupancy}/{current_capacity} {status}")
        # Second line: Location (truncated if too long)
        lcd.cursor_pos = (1, 0)
        location_short = location_info[:16]  # LCD typically has 16 columns
        lcd.write_string(location_short)
    except Exception as e:
        print(f"[!] LCD update error: {e}")

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
            overlay_height = 120  # Increased height for GPS info
            overlay = np.zeros((overlay_height, frame.shape[1], 3), dtype=np.uint8)
            cv2.rectangle(overlay, (0,0), (frame.shape[1], overlay_height), (0,0,0), -1)

            # Add text to overlay
            info_text = f"Occupancy: {current_occupancy}/{current_capacity}"
            status_text = f"Status: {system_status} | Last Update: {last_update}"
            location_text = f"Location: {location_info}"
            update_text = f"GPS Updated: {last_location_update}"
            camera_text = f"Camera: {CAMERA_ID}"

            cv2.putText(frame, info_text, (10, 30),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            cv2.putText(frame, status_text, (10, 60),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            cv2.putText(frame, location_text, (10, 90),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            cv2.putText(frame, update_text, (10, 110),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.4, (200, 200, 200), 1)
            cv2.putText(frame, camera_text, (frame.shape[1]-200, 30),
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

# ========================
# System Monitoring
# ========================
def monitor_system():
    global api_available

    while True:
        try:
            # Check API availability with HEAD request
            try:
                response = requests.head(API_URL, timeout=5)
                api_available = response.status_code < 400
                status = "Connected" if api_available else "Disconnected"
                print(f"[SYSTEM] API Status: {status} (HTTP {response.status_code})")
            except Exception as e:
                api_available = False
                print(f"[!] API check failed: {e}")

            # Check disk space
            stat = os.statvfs(IMAGE_DIR)
            free_gb = (stat.f_bavail * stat.f_frsize) / (1024**3)
            print(f"[SYSTEM] Disk Space: {free_gb:.2f}GB free")

            # Check camera status
            print(f"[SYSTEM] Camera Status: {'Ready' if camera_ready else 'Not ready'}")

        except Exception as e:
            print(f"[!] System monitor error: {e}")

        time.sleep(30)

# ========================
# Web Dashboard
# ========================
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
            .location-item {
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
            .location-map {
                width: 100%;
                height: 200px;
                background-color: #eee;
                margin-top: 10px;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #666;
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

                <div class="location-item">
                    <span class="status-label">Current Location</span>
                    <span class="status-value">{{ location }}</span>
                    <span class="status-label" style="font-size:0.8em">Last Updated: {{ location_update }}</span>
                    <div class="location-map">
                        Map View<br>({{ location }})
                    </div>
                </div>

                <div class="status-item">
                    <span class="status-label">Last Update</span>
                    <span class="status-value">{{ last_update }}</span>
                </div>

                <div class="status-item">
                    <span class="status-label">API Status</span>
                    <span class="status-value">{{ "Connected" if api_available else "Disconnected" }}</span>
                </div>

                <div class="buttons">
                    <button onclick="location.reload()">Refresh</button>
                    <button onclick="window.open('/video_feed', '_blank')">Fullscreen Video</button>
                </div>
            </div>
        </div>

        <script>
            // Auto-refresh every 15 seconds
            setTimeout(function() {
                location.reload();
            }, 15000);
        </script>
    </body>
    </html>
    ''',
    camera_id=CAMERA_ID,
    occupancy=current_occupancy,
    capacity=current_capacity,
    status=system_status,
    status_class=status_class,
    last_update=last_update,
    api_available=api_available,
    current_time=current_time,
    location=location_info,
    location_update=last_location_update)

# ========================
# Main Execution
# ========================
def main():
    global picam2

    try:
        # Initialize hardware
        picam2 = initialize_camera()
        if lcd:
            update_lcd()

        # Initial location update
        get_ip_location()

        # Start system monitor thread
        threading.Thread(target=monitor_system, daemon=True).start()
        
        # Start location updater thread
        threading.Thread(target=location_updater, daemon=True).start()

        # Start periodic capture thread
        def capture_loop():
            while True:
                capture_and_process_image()
                time.sleep(CAPTURE_INTERVAL)

        threading.Thread(target=capture_loop, daemon=True).start()

        # Start web interface
        print(f"[+] Starting web interface on port {STREAM_PORT}")
        app.run(host='0.0.0.0', port=STREAM_PORT, threaded=True)

    except KeyboardInterrupt:
        print("\n[+] Shutting down...")
    except Exception as e:
        print(f"[!] Fatal error: {e}")
    finally:
        if picam2:
            picam2.close()
        if lcd:
            lcd.clear()
            lcd.close()
        print("[+] System shutdown complete")

if _name_ == "_main_":
    main()