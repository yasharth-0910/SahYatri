import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/bus_occupancy.dart';

class ApiService {
  static const String apiUrl = "https://bus-api-ihcu.onrender.com/api/occupancy";

  static Future<List<BusOccupancy>> fetchOccupancyData() async {
    final response = await http.get(Uri.parse(apiUrl));
    if (response.statusCode == 200) {
      List<dynamic> data = jsonDecode(response.body);
      return data.map((json) => BusOccupancy.fromJson(json)).toList();
    } else {
      throw Exception("Failed to load data");
    }
  }
}
