from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from ultralytics import YOLO
import requests
import io
from PIL import Image
import logging
from datetime import datetime
import os
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(_name_)

# Constants
MAX_CAPACITY = 40
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB
BUS_API_URL = "https://bus-api-ihcu.onrender.com/api/occupancy"
WARNING_API_URL = "https://warning-api.onrender.com/api/alert"

# Initialize FastAPI app
app = FastAPI(
    title="YOLO Occupancy Detection API",
    description="API for detecting and counting people in images using YOLOv5x",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize YOLO model
try:
    model = YOLO('yolov5xu.pt')
    logger.info("YOLOv5xu model loaded successfully")
except Exception as e:
    logger.error(f"Failed to load YOLOv5x model: {str(e)}")
    raise

def validate_image_size(image_data: bytes) -> None:
    """Validate image size before processing."""
    if len(image_data) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Image size exceeds {MAX_IMAGE_SIZE/1024/1024}MB limit"
        )

def process_image(image_data: bytes) -> Image.Image:
    """Process image data and return PIL Image object."""
    try:
        return Image.open(io.BytesIO(image_data))
    except Exception as e:
        logger.error(f"Failed to process image: {str(e)}")
        raise HTTPException(status_code=400, detail="Invalid image format")

def count_people(image: Image.Image) -> int:
    """Run YOLO inference and count people."""
    try:
        results = model(image)
        return sum(1 for box in results[0].boxes if box.cls == 0)
    except Exception as e:
        logger.error(f"YOLO inference failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to process image with YOLO")

def send_to_apis(camera_id: str, occupancy: int) -> None:
    """Send occupancy data to remote APIs."""
    data = {
        "camera_id": camera_id,
        "occupancy": occupancy,
        "capacity": MAX_CAPACITY
    }
    
    # Send to bus API
    try:
        response = requests.post(BUS_API_URL, json=data, timeout=5)
        response.raise_for_status()
        logger.info(f"Successfully sent data to bus API for camera {camera_id}")
    except Exception as e:
        logger.error(f"Failed to send data to bus API: {str(e)}")

    # Send warning if occupancy exceeds capacity
    if occupancy > MAX_CAPACITY:
        try:
            response = requests.post(WARNING_API_URL, json=data, timeout=5)
            response.raise_for_status()
            logger.warning(f"Warning sent for camera {camera_id}: occupancy {occupancy} > capacity {MAX_CAPACITY}")
        except Exception as e:
            logger.error(f"Failed to send warning: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}

@app.post("/detect")
async def detect_occupancy(
    image: UploadFile = File(...),
    camera_id: str = Query(..., description="Camera identifier")
):
    """
    Process image to detect and count people using YOLOv5x.
    """
    try:
        # Read and validate image
        image_data = await image.read()
        validate_image_size(image_data)
        
        # Process image
        img = process_image(image_data)
        
        # Run YOLO inference
        person_count = count_people(img)
        
        # Prepare response
        response_data = {
            "camera_id": camera_id,
            "occupancy": person_count,
            "capacity": MAX_CAPACITY,
            "status": "success"
        }

        # Log detection
        logger.info(f"Camera: {camera_id}, Occupancy: {person_count}")

        # Send data to APIs
        send_to_apis(camera_id, person_count)

        return JSONResponse(content=response_data)

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if _name_ == "_main_":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)