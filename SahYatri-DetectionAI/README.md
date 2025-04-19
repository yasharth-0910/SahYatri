# YOLO Occupancy Detection API

A FastAPI-based service that uses YOLOv5x to detect and count people in images, with occupancy data forwarding to remote APIs.

## Features

- People detection using YOLOv5x
- Real-time occupancy counting
- Automatic data forwarding to bus API
- Warning system for overcapacity
- CORS support
- Health check endpoint
- Image size validation

## Setup

### Option 1: Local Setup
1. Install dependencies:
bash
pip install -r requirements.txt


2. Run the API:
bash
python main.py


### Option 2: Docker Setup
1. Build the Docker image:
bash
docker build -t yolo-occupancy-api .


2. Run the container:
bash
docker run -p 8000:8000 yolo-occupancy-api


The API will start on http://localhost:8000

## API Endpoints

### POST /detect
Detect and count people in an image.

*Request:*
- Method: POST
- Content-Type: multipart/form-data
- Parameters:
  - image: Image file
  - camera_id: Camera identifier (query parameter)

*Response:*
json
{
    "camera_id": "bus-1",
    "occupancy": 28,
    "capacity": 40,
    "status": "success"
}


### GET /health
Check if the service is running.

*Response:*
json
{
    "status": "healthy"
}


## Environment Variables

No environment variables are required for basic operation.

## Notes

- Maximum image size: 5MB
- Maximum capacity: 40 people
- Warning is sent when occupancy exceeds capacity
- Data is automatically forwarded to:
  - Bus API: https://bus-api-ihcu.onrender.com/api/occupancy
  - Warning API: https://warning-api.onrender.com/api/alert