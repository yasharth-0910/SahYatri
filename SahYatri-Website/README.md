# Real-Time Bus Occupancy Dashboard

A real-time web dashboard that displays bus occupancy data from multiple cameras, built with Next.js 15 and Tailwind CSS.

## Features

- 🔄 Real-time data updates every 10 seconds
- 📊 Overview of all bus occupancies
- 📈 Detailed historical view for each bus
- 🎨 Responsive design with Tailwind CSS
- 🚀 Built with Next.js 15 App Router

## Prerequisites

- Node.js 18.17 or later
- npm (comes with Node.js)

## Project Structure

```
bus-dashboard/
├── src/
│   └── app/
│       ├── page.js              # Main dashboard
│       └── bus/
│           └── [camera_id]/
│               └── page.js      # Bus details page
├── .env.local                   # Environment variables
└── package.json
```

## API Endpoints

The dashboard uses the following API endpoints:

- `GET /api/occupancy` - Get all occupancy records
- `GET /api/occupancy/:camera_id` - Get records for a specific camera

## Development

To start the development server:

```bash
npm run dev
```

For production build:

```bash
npm run build
npm start
```

## License

MIT
