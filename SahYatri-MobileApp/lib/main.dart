import 'package:flutter/material.dart';
import 'screens/occupancy_screen.dart';

void main() {
  runApp(SahYatriApp());
}

class SahYatriApp extends StatefulWidget {
  @override
  _SahYatriAppState createState() => _SahYatriAppState();
}

class _SahYatriAppState extends State<SahYatriApp> {
  ThemeMode themeMode = ThemeMode.light;

  void toggleTheme() {
    setState(() {
      themeMode = themeMode == ThemeMode.light ? ThemeMode.dark : ThemeMode.light;
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SahYatri Live Bus Occupancy',
      theme: ThemeData(
        primarySwatch: Colors.deepPurple,
        fontFamily: 'Roboto',
        brightness: Brightness.light,
      ),
      darkTheme: ThemeData.dark().copyWith(
        textTheme: ThemeData.dark().textTheme.apply(fontFamily: 'Roboto'),
      ),
      themeMode: themeMode,
      home: OccupancyScreen(
        toggleTheme: toggleTheme,
        themeMode: themeMode,
      ),
      debugShowCheckedModeBanner: false,
    );
  }
}
