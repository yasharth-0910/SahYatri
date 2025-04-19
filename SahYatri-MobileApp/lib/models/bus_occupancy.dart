class BusOccupancy {
  final int id;
  final String cameraId;
  final int occupancy;
  final int capacity;
  final String timestamp;

  BusOccupancy({
    required this.id,
    required this.cameraId,
    required this.occupancy,
    required this.capacity,
    required this.timestamp,
  });

  factory BusOccupancy.fromJson(Map<String, dynamic> json) {
    return BusOccupancy(
      id: json['id'],
      cameraId: json['camera_id'],
      occupancy: json['occupancy'],
      capacity: json['capacity'],
      timestamp: json['timestamp'],
    );
  }
}
