import 'package:flutter/material.dart';
import 'package:intl/intl.dart'; // <-- Add this
import '../models/bus_occupancy.dart';

class OccupancyCard extends StatelessWidget {
  final BusOccupancy record;

  const OccupancyCard({Key? key, required this.record}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    double percent = record.occupancy / record.capacity;

    // Parse and format timestamp
    DateTime parsedTime = DateTime.parse(record.timestamp).toLocal(); // Convert to local time
    String formattedTime = DateFormat('yyyy-MM-dd – hh:mm a').format(parsedTime);

    return Card(
      elevation: 3,
      margin: EdgeInsets.symmetric(vertical: 10, horizontal: 15),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("Bus: ${record.cameraId}", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            SizedBox(height: 10),
            Text("Occupancy: ${record.occupancy}/${record.capacity}", style: TextStyle(fontSize: 16)),
            SizedBox(height: 10),
            LinearProgressIndicator(
              value: percent,
              minHeight: 12,
              backgroundColor: Colors.grey[300],
              valueColor: AlwaysStoppedAnimation<Color>(
                percent >= 1.0 ? Colors.red : Colors.green,
              ),
            ),
            SizedBox(height: 10),
            Text(
              "Last updated: $formattedTime",
              style: TextStyle(fontSize: 13, color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }
}
