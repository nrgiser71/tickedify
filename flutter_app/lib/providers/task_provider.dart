import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/task.dart';
import '../models/project.dart';
import '../models/context_model.dart';
import '../services/data_service.dart';
import 'filter_provider.dart';

class TaskData {
  final List<Task> tasks;
  final List<Project> projects;
  final List<TaskContext> contexts;
  final bool isLoading;
  final String? error;

  const TaskData({
    this.tasks = const [],
    this.projects = const [],
    this.contexts = const [],
    this.isLoading = false,
    this.error,
  });

  TaskData copyWith({
    List<Task>? tasks,
    List<Project>? projects,
    List<TaskContext>? contexts,
    bool? isLoading,
    String? Function()? error,
  }) {
    return TaskData(
      tasks: tasks ?? this.tasks,
      projects: projects ?? this.projects,
      contexts: contexts ?? this.contexts,
      isLoading: isLoading ?? this.isLoading,
      error: error != null ? error() : this.error,
    );
  }
}

class TaskNotifier extends StateNotifier<TaskData> {
  final DataService _dataService = DataService();

  TaskNotifier() : super(const TaskData());

  Future<void> loadAll() async {
    state = state.copyWith(isLoading: true, error: () => null);
    try {
      final demo = await _dataService.fetchDemoData();
      state = state.copyWith(
        tasks: demo.tasks,
        projects: demo.projects,
        contexts: demo.contexts,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: () => e.toString(),
      );
    }
  }

  String getProjectName(String? projectId) {
    if (projectId == null || projectId.isEmpty) return '';
    final p = state.projects
        .where((p) => p.id == projectId)
        .firstOrNull;
    return p?.naam ?? '';
  }

  String getContextName(String? contextId) {
    if (contextId == null || contextId.isEmpty) return '';
    final c = state.contexts
        .where((c) => c.id == contextId)
        .firstOrNull;
    return c?.naam ?? '';
  }
}

final taskProvider =
    StateNotifierProvider<TaskNotifier, TaskData>((ref) {
  return TaskNotifier();
});

/// Filtered and sorted tasks, ported from app.js filter + sort logic
final filteredTasksProvider = Provider<List<Task>>((ref) {
  final data = ref.watch(taskProvider);
  final filter = ref.watch(filterProvider);

  var tasks = List<Task>.from(data.tasks);

  // Text filter (case-insensitive contains)
  if (filter.textFilter.isNotEmpty) {
    final q = filter.textFilter.toLowerCase();
    tasks = tasks.where((t) => t.tekst.toLowerCase().contains(q)).toList();
  }

  // Project filter
  if (filter.projectFilter != null) {
    tasks = tasks
        .where((t) => t.projectId?.toString() == filter.projectFilter)
        .toList();
  }

  // Context filter
  if (filter.contextFilter != null) {
    tasks = tasks
        .where((t) => t.contextId?.toString() == filter.contextFilter)
        .toList();
  }

  // Date filter
  if (filter.dateFilter != null) {
    tasks = tasks.where((t) {
      if (t.verschijndatum == null) return false;
      return t.normalizedDate == filter.dateFilter;
    }).toList();
  }

  // Priority filter
  if (filter.priorityFilter != null) {
    tasks =
        tasks.where((t) => t.prioriteit == filter.priorityFilter).toList();
  }

  // Future tasks toggle
  if (!filter.showFutureTasks) {
    final today = DateTime.now().toIso8601String().substring(0, 10);
    tasks = tasks.where((t) {
      if (t.verschijndatum == null) return true; // show tasks without date
      return t.normalizedDate.compareTo(today) <= 0;
    }).toList();
  }

  // Sort: tasks without date to bottom, then by date asc, then alphabetically
  tasks.sort((a, b) {
    final aDate = a.normalizedDate;
    final bDate = b.normalizedDate;

    if (aDate.isEmpty && bDate.isEmpty) {
      return a.tekst.toLowerCase().compareTo(b.tekst.toLowerCase());
    }
    if (aDate.isEmpty) return 1;
    if (bDate.isEmpty) return -1;

    final dateCompare = aDate.compareTo(bDate);
    if (dateCompare != 0) return dateCompare;

    return a.tekst.toLowerCase().compareTo(b.tekst.toLowerCase());
  });

  return tasks;
});
