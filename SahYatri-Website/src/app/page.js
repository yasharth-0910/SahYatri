'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">🚌 Bus Occupancy System</h1>
        
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <p className="text-xl text-gray-600 mb-6">
            Welcome to the real-time bus occupancy monitoring system. View live occupancy data and historical records for all buses.
          </p>
          
          <Link 
            href="/bus" 
            className="inline-flex items-center justify-center px-6 py-3 text-lg font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            View All Buses
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>

        <div className="mt-8 grid gap-6 grid-cols-1 md:grid-cols-2">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-3">🎯 Features</h2>
            <ul className="space-y-2 text-gray-600">
              <li>• Real-time occupancy updates</li>
              <li>• Historical data tracking</li>
              <li>• Capacity monitoring</li>
              <li>• Auto-refresh every 10 seconds</li>
            </ul>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-3">📊 Statistics</h2>
            <ul className="space-y-2 text-gray-600">
              <li>• Multiple camera feeds</li>
              <li>• Occupancy trends</li>
              <li>• Capacity alerts</li>
              <li>• Historical records</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
} 