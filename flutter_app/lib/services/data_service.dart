import 'package:dio/dio.dart';
import 'api_service.dart';
import '../models/task.dart';
import '../models/project.dart';
import '../models/context_model.dart';

class DemoData {
  final List<Task> tasks;
  final List<Project> projects;
  final List<TaskContext> contexts;
  DemoData({required this.tasks, required this.projects, required this.contexts});
}

class DataService {
  final Dio _dio = ApiService().dio;

  /// Single call to fetch all demo data (no auth required)
  Future<DemoData> fetchDemoData() async {
    final response = await _dio.get('/api/demo/data');
    final data = response.data as Map<String, dynamic>;

    return DemoData(
      tasks: (data['acties'] as List? ?? [])
          .map((j) => Task.fromJson(j as Map<String, dynamic>))
          .toList(),
      projects: (data['projecten'] as List? ?? [])
          .map((j) => Project.fromJson(j as Map<String, dynamic>))
          .toList(),
      contexts: (data['contexten'] as List? ?? [])
          .map((j) => TaskContext.fromJson(j as Map<String, dynamic>))
          .toList(),
    );
  }
}
