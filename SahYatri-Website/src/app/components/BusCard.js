'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparklines, SparklinesLine, SparklinesCurve } from 'react-sparklines';

export default function BusCard({ record, index, lastUpdate }) {
  const occupancyRate = Math.round((record.occupancy / record.capacity) * 100);
  const isActive = new Date().getTime() - new Date(record.timestamp).getTime() < 60000; // 1 minute

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.4,
        delay: index * 0.1,
        ease: [0.4, 0, 0.2, 1]
      }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="relative group"
    >
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl blur opacity-20 group-hover:opacity-30 transition duration-300" />
      <Link
        href={`/bus/${record.camera_id}`}
        className="relative block bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300"
      >
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Bus {record.camera_id}</h2>
            <div className="relative">
              <div className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}`} />
              {isActive && (
                <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75" />
              )}
            </div>
          </div>
          <motion.span
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium shadow-sm ${
              occupancyRate > 80
                ? "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200"
                : occupancyRate > 50
                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200"
                : "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200"
            }`}
          >
            {occupancyRate}% Full
          </motion.span>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-gray-600 dark:text-gray-300">Current Occupancy</p>
            <p className="font-medium text-gray-800 dark:text-gray-100">{record.occupancy} passengers</p>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-gray-600 dark:text-gray-300">Total Capacity</p>
            <p className="font-medium text-gray-800 dark:text-gray-100">{record.capacity} passengers</p>
          </div>

          {/* Occupancy Bar */}
          <div className="relative pt-1">
            <div className="w-full h-3 rounded-full bg-gray-200/50 dark:bg-gray-700/50 overflow-hidden backdrop-blur-sm">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${occupancyRate}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full rounded-full transition-all duration-500 shadow-lg"
                style={{
                  background: `linear-gradient(to right, 
                    ${occupancyRate > 80 ? '#ef4444' : 
                      occupancyRate > 50 ? '#f59e0b' : '#22c55e'}
                    , ${occupancyRate > 80 ? '#dc2626' : 
                      occupancyRate > 50 ? '#d97706' : '#16a34a'})`
                }}
              />
            </div>
          </div>

          {/* Sparkline Chart */}
          {lastUpdate && lastUpdate.length > 0 && (
            <div className="h-12 w-full mt-2 bg-white/5 rounded-lg p-1 backdrop-blur-sm">
              <Sparklines data={lastUpdate.map(u => u.occupancy)} min={0} max={record.capacity}>
                <SparklinesCurve 
                  style={{ 
                    strokeWidth: 2,
                    stroke: occupancyRate > 80 ? "#ef4444" : occupancyRate > 50 ? "#f59e0b" : "#22c55e",
                    fill: "none"
                  }} 
                />
                <SparklinesLine 
                  style={{ 
                    strokeWidth: 1,
                    stroke: occupancyRate > 80 ? "#fee2e2" : occupancyRate > 50 ? "#fef3c7" : "#dcfce7",
                    fill: "none"
                  }} 
                />
              </Sparklines>
            </div>
          )}

          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Last updated: {new Date(record.timestamp).toLocaleString()}
          </p>
        </div>

        <motion.div 
          className="mt-4 flex justify-end"
          whileHover={{ x: 5 }}
          transition={{ duration: 0.2 }}
        >
          <span className="text-blue-600 dark:text-blue-400 hover:text-blue-700 text-sm font-medium inline-flex items-center group">
            View Details
            <svg className="w-4 h-4 ml-1 transform transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </motion.div>
      </Link>
    </motion.div>
  );
} 