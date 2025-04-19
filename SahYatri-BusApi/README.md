# Occupancy API

A Node.js + Express server with PostgreSQL integration for tracking occupancy data.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with your database connection string:
```
DATABASE_URL=postgresql://username:password@your-project-db.neon.tech/dbname?sslmode=require
```

## Running the Server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will run on port 3000.

## API Endpoints

- `GET /` - Health check endpoint
- `POST /api/occupancy` - Create new occupancy record
- `GET /api/occupancy` - Get latest 50 records
- `GET /api/occupancy/:camera_id` - Get latest 50 records for specific camera
- `GET /api/occupancy/summary` - Get occupancy summary
- `DELETE /api/admin/occupancy/:id` - Delete a record by ID

## Example Requests

### Create Occupancy Record
```bash
curl -X POST http://localhost:3000/api/occupancy \
  -H "Content-Type: application/json" \
  -d '{"camera_id": "cam_01", "occupancy": 18, "capacity": 40}'
```

### Get Latest Records
```bash
curl http://localhost:3000/api/occupancy
```

### Get Camera-specific Records
```bash
curl http://localhost:3000/api/occupancy/cam_01
```

### Get Summary
```bash
curl http://localhost:3000/api/occupancy/summary
```

### Delete Record
```bash
curl -X DELETE http://localhost:3000/api/admin/occupancy/1
``` 