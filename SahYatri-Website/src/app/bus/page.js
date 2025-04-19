'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { UsersIcon, ArrowTrendingUpIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import BusCard from '../components/BusCard';
import DarkModeToggle from '../components/DarkModeToggle';

const FILTERS = {
  ALL: 'All',
  LOW: 'Low Occupancy',
  MEDIUM: 'Medium Occupancy',
  HIGH: 'High Occupancy',
};

export default function BusListing() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(FILTERS.ALL);
  const [totalPassengers, setTotalPassengers] = useState(0);
  const [averageOccupancy, setAverageOccupancy] = useState(0);
  const [overcrowdedBuses, setOvercrowdedBuses] = useState(0);
  const [updateTimestamp, setUpdateTimestamp] = useState(null);
  const [lastUpdates, setLastUpdates] = useState({});

  const fetchData = async () => {
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_BUS_API_URL || 'https://bus-api-ihcu.onrender.com/api/occupancy');
      const data = await res.json();

      // Group by camera_id and keep last 5 updates for each
      const updates = data.reduce((acc, curr) => {
        if (!acc[curr.camera_id]) {
          acc[curr.camera_id] = [];
        }
        acc[curr.camera_id].push(curr);
        acc[curr.camera_id].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        acc[curr.camera_id] = acc[curr.camera_id].slice(0, 5);
        return acc;
      }, {});

      // Get latest record for each camera
      const latestByCamera = Object.values(updates).map(records => records[0]);

      // Calculate statistics
      const total = latestByCamera.reduce((sum, record) => sum + record.occupancy, 0);
      const avg = Math.round(total / latestByCamera.length);
      const overcrowded = latestByCamera.filter(
        record => (record.occupancy / record.capacity) > 0.8
      ).length;

      setRecords(latestByCamera);
      setLastUpdates(updates);
      setTotalPassengers(total);
      setAverageOccupancy(avg);
      setOvercrowdedBuses(overcrowded);
      setUpdateTimestamp(new Date());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const filteredRecords = records.filter(record => {
    const occupancyRate = record.occupancy / record.capacity;
    switch (filter) {
      case FILTERS.LOW:
        return occupancyRate <= 0.5;
      case FILTERS.MEDIUM:
        return occupancyRate > 0.5 && occupancyRate <= 0.8;
      case FILTERS.HIGH:
        return occupancyRate > 0.8;
      default:
        return true;
    }
  });

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">🚌 Available Buses</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">Real-time monitoring of all active buses</p>
            {updateTimestamp && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Last updated: {updateTimestamp.toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 rounded-lg bg-white/30 backdrop-blur-md border border-white/10 text-gray-700 dark:text-gray-200"
            >
              {Object.values(FILTERS).map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <Link href="/" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
              </svg>
              Back to Home
            </Link>
          </div>
        </div>

        {/* Statistics Overview */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <div className="bg-white/30 backdrop-blur-md border border-white/10 rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/50 rounded-lg">
                <UsersIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Passengers</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{totalPassengers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/30 backdrop-blur-md border border-white/10 rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-50 dark:bg-green-900/50 rounded-lg">
                <ArrowTrendingUpIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Average Occupancy</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{averageOccupancy}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/30 backdrop-blur-md border border-white/10 rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <div className="p-3 bg-red-50 dark:bg-red-900/50 rounded-lg">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Overcrowded Buses</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{overcrowdedBuses}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredRecords.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <svg className="w-24 h-24 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No buses found</h3>
            <p className="mt-1 text-gray-500 dark:text-gray-400">Try changing the filter or check back later.</p>
          </motion.div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRecords.map((record, index) => (
              <BusCard 
                key={record.id} 
                record={record} 
                index={index}
                lastUpdate={lastUpdates[record.camera_id]}
              />
            ))}
          </div>
        )}
      </div>

      <DarkModeToggle />
    </main>
  );
} 