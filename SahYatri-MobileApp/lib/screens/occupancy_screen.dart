import 'package:flutter/material.dart';
import '../models/bus_occupancy.dart';
import '../services/api_service.dart';
import '../widgets/occupancy_card.dart';

class OccupancyScreen extends StatefulWidget {
  final ThemeMode themeMode;
  final VoidCallback toggleTheme;

  const OccupancyScreen({Key? key, required this.themeMode, required this.toggleTheme}) : super(key: key);

  @override
  _OccupancyScreenState createState() => _OccupancyScreenState();
}

class _OccupancyScreenState extends State<OccupancyScreen> {
  List<BusOccupancy> _busData = [];
  bool _showAll = false;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _fetchBusData();
  }

  Future<void> _fetchBusData() async {
    setState(() => _loading = true);
    try {
      final data = await ApiService.fetchOccupancyData();
      data.sort((a, b) => b.timestamp.compareTo(a.timestamp));
      setState(() {
        _busData = data;
        _loading = false;
      });
    } catch (e) {
      print("Error: $e");
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final visibleData = _showAll ? _busData : _busData.take(1).toList();

    return Scaffold(
      appBar: AppBar(
        title: Text("SahYatri Live Bus Occupancy"),
        actions: [
          IconButton(
            icon: Icon(widget.themeMode == ThemeMode.dark ? Icons.light_mode : Icons.dark_mode),
            onPressed: widget.toggleTheme,
          ),
        ],
      ),
      body: _loading
          ? Center(child: CircularProgressIndicator())
          : Column(
        children: [
          Expanded(
            child: RefreshIndicator(
              onRefresh: _fetchBusData,
              child: ListView.builder(
                padding: EdgeInsets.only(bottom: 70),
                itemCount: visibleData.length,
                itemBuilder: (context, index) => OccupancyCard(record: visibleData[index]),
              ),
            ),
          ),
          Container(
            color: Theme.of(context).cardColor,
            padding: EdgeInsets.symmetric(vertical: 12),
            child: Center(
              child: TextButton.icon(
                onPressed: () {
                  setState(() => _showAll = !_showAll);
                },
                icon: Icon(_showAll ? Icons.expand_less : Icons.expand_more),
                label: Text(_showAll ? "Show Less" : "Show More"),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
