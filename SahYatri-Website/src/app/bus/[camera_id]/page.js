'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeftIcon, UsersIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import DarkModeToggle from '../../components/DarkModeToggle';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function BusDetail() {
  const params = useParams();
  const [busData, setBusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [historicalData, setHistoricalData] = useState([]);
  const [analytics, setAnalytics] = useState({
    averageOccupancy: 0,
    peakOccupancy: 0,
    lowOccupancy: 0,
    overcrowdedCount: 0,
    occupancyTrend: 0,
  });

  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BUS_API_URL || 'https://bus-api-ihcu.onrender.com/api/occupancy'}`
      );
      const data = await res.json();

      // Filter and sort data for this camera
      const cameraData = data
        .filter(record => record.camera_id === params.camera_id)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      if (cameraData.length === 0) {
        setError('No data found for this bus');
        return;
      }

      setBusData(cameraData[0]); // Latest record
      setHistoricalData(cameraData.slice(0, 50)); // Store last 50 records

      // Calculate analytics
      const occupancies = cameraData.map(record => record.occupancy);
      const avgOccupancy = Math.round(occupancies.reduce((a, b) => a + b, 0) / occupancies.length);
      const peakOcc = Math.max(...occupancies);
      const lowOcc = Math.min(...occupancies);
      const overcrowded = cameraData.filter(record => (record.occupancy / record.capacity) > 0.8).length;
      
      // Calculate trend (positive number means increasing, negative means decreasing)
      const recentOccupancies = occupancies.slice(0, 10); // Last 10 records
      const trend = recentOccupancies.reduce((acc, curr, idx) => {
        if (idx === 0) return 0;
        return acc + (curr - recentOccupancies[idx - 1]);
      }, 0);

      setAnalytics({
        averageOccupancy: avgOccupancy,
        peakOccupancy: peakOcc,
        lowOccupancy: lowOcc,
        overcrowdedCount: overcrowded,
        occupancyTrend: trend,
      });

      // Prepare chart data
      const labels = cameraData.map(record => 
        new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      ).reverse();
      const occupancyData = cameraData.map(record => record.occupancy).reverse();
      const capacity = cameraData[0].capacity;

      setChartData({
        labels,
        datasets: [
          {
            label: 'Occupancy',
            data: occupancyData,
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true,
          },
          {
            label: 'Capacity',
            data: Array(labels.length).fill(capacity),
            borderColor: 'rgba(239, 68, 68, 0.5)',
            borderDash: [5, 5],
            tension: 0,
            fill: false,
          },
        ],
      });
    } catch (err) {
      setError('Failed to fetch bus data');
      console.error('Error:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [params.camera_id]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (error) {
    return (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }}
        className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-6"
      >
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-16 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 shadow-glass dark:shadow-glass-dark">
            <ExclamationTriangleIcon className="w-16 h-16 mx-auto text-red-500" />
            <h2 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-white">{error}</h2>
            <Link 
              href="/bus"
              className="mt-6 inline-flex items-center px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors duration-200"
            >
              <ArrowLeftIcon className="w-5 h-5 mr-2" />
              Back to Bus List
            </Link>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-between items-center mb-8"
        >
          <div>
            <Link 
              href="/bus"
              className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 mb-4 group"
            >
              <ArrowLeftIcon className="w-5 h-5 mr-2 transform transition-transform group-hover:-translate-x-1" />
              Back to Bus List
            </Link>
            <h1 className="text-4xl font-bold text-gray-800 dark:text-white">Bus {params.camera_id}</h1>
            {busData && (
              <div className="flex items-center gap-2 mt-2">
                <div className={`w-2 h-2 rounded-full ${isRefreshing ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`} />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {isRefreshing ? 'Updating...' : 'Live data'}
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {loading ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center h-64"
          >
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-gray-600 dark:text-gray-300">Loading bus data...</p>
          </motion.div>
        ) : busData && (
          <>
            <div className="grid gap-6 md:grid-cols-2 mb-8">
              {/* Current Status Card */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6 shadow-glass dark:shadow-glass-dark"
              >
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">Current Status</h2>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-500/10 dark:bg-blue-500/20 rounded-lg">
                        <UsersIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Current Occupancy</p>
                        <p className="text-2xl font-semibold text-gray-900 dark:text-white">{busData.occupancy}</p>
                      </div>
                    </div>
                    <div>
                      <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium ${
                          (busData.occupancy / busData.capacity) > 0.8
                            ? "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200"
                            : (busData.occupancy / busData.capacity) > 0.5
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200"
                            : "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200"
                        }`}
                      >
                        {Math.round((busData.occupancy / busData.capacity) * 100)}% Full
                      </motion.div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-green-500/10 dark:bg-green-500/20 rounded-lg">
                        <UsersIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Total Capacity</p>
                        <p className="text-2xl font-semibold text-gray-900 dark:text-white">{busData.capacity}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-purple-500/10 dark:bg-purple-500/20 rounded-lg">
                        <ClockIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Last Updated</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {new Date(busData.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Occupancy Bar */}
                  <div className="mt-6">
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <span>Occupancy Level</span>
                      <span>{Math.round((busData.occupancy / busData.capacity) * 100)}%</span>
                    </div>
                    <div className="h-3 w-full bg-gray-200/50 dark:bg-gray-700/50 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(busData.occupancy / busData.capacity) * 100}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          background: `linear-gradient(to right, 
                            ${(busData.occupancy / busData.capacity) > 0.8 ? '#ef4444' : 
                              (busData.occupancy / busData.capacity) > 0.5 ? '#f59e0b' : '#22c55e'}
                            , ${(busData.occupancy / busData.capacity) > 0.8 ? '#dc2626' : 
                              (busData.occupancy / busData.capacity) > 0.5 ? '#d97706' : '#16a34a'})`
                        }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Occupancy Chart Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6 shadow-glass dark:shadow-glass-dark"
              >
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">Occupancy History</h2>
                {chartData && (
                  <div className="relative h-[300px]">
                    <Line
                      data={chartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: {
                          intersect: false,
                          mode: 'index',
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            grid: {
                              color: 'rgba(156, 163, 175, 0.1)',
                            },
                            ticks: {
                              color: 'rgb(156, 163, 175)',
                            },
                          },
                          x: {
                            grid: {
                              display: false,
                            },
                            ticks: {
                              color: 'rgb(156, 163, 175)',
                              maxRotation: 45,
                              minRotation: 45,
                            },
                          },
                        },
                        plugins: {
                          legend: {
                            labels: {
                              color: 'rgb(156, 163, 175)',
                            },
                          },
                          tooltip: {
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                            titleColor: '#1f2937',
                            bodyColor: '#1f2937',
                            borderColor: 'rgba(156, 163, 175, 0.2)',
                            borderWidth: 1,
                            padding: 10,
                          },
                        },
                      }}
                    />
                  </div>
                )}
              </motion.div>
            </div>

            {/* Analytics Overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8"
            >
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4 shadow-glass dark:shadow-glass-dark">
                <p className="text-sm text-gray-600 dark:text-gray-400">Average Occupancy</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{analytics.averageOccupancy}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4 shadow-glass dark:shadow-glass-dark">
                <p className="text-sm text-gray-600 dark:text-gray-400">Peak Occupancy</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{analytics.peakOccupancy}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4 shadow-glass dark:shadow-glass-dark">
                <p className="text-sm text-gray-600 dark:text-gray-400">Lowest Occupancy</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{analytics.lowOccupancy}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4 shadow-glass dark:shadow-glass-dark">
                <p className="text-sm text-gray-600 dark:text-gray-400">Times Overcrowded</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{analytics.overcrowdedCount}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4 shadow-glass dark:shadow-glass-dark">
                <p className="text-sm text-gray-600 dark:text-gray-400">Recent Trend</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {Math.abs(analytics.occupancyTrend).toFixed(1)}
                  </p>
                  {analytics.occupancyTrend !== 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={`text-sm ${
                        analytics.occupancyTrend > 0 
                          ? 'text-green-500' 
                          : 'text-red-500'
                      }`}
                    >
                      {analytics.occupancyTrend > 0 ? '↑' : '↓'}
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Historical Data Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl shadow-glass dark:shadow-glass-dark overflow-hidden"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Recent Records</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Last 50 occupancy readings</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50/50 dark:bg-gray-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Occupancy</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Capacity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {historicalData.map((record, index) => (
                      <tr 
                        key={index}
                        className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors duration-150"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                          {new Date(record.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                          {record.occupancy}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                          {record.capacity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              (record.occupancy / record.capacity) > 0.8
                                ? "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200"
                                : (record.occupancy / record.capacity) > 0.5
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200"
                                : "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200"
                            }`}
                          >
                            {Math.round((record.occupancy / record.capacity) * 100)}% Full
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </>
        )}
      </div>

      <DarkModeToggle />
    </main>
  );
}