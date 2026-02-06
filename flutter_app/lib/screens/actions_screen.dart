import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/theme.dart';
import '../providers/task_provider.dart';
import '../widgets/filter_bar.dart';
import '../widgets/task_list_item.dart';

class ActionsScreen extends ConsumerStatefulWidget {
  const ActionsScreen({super.key});

  @override
  ConsumerState<ActionsScreen> createState() => _ActionsScreenState();
}

class _ActionsScreenState extends ConsumerState<ActionsScreen> {
  @override
  void initState() {
    super.initState();
    // Load data on first open
    Future.microtask(() => ref.read(taskProvider.notifier).loadAll());
  }

  Future<void> _refresh() async {
    await ref.read(taskProvider.notifier).loadAll();
  }

  @override
  Widget build(BuildContext context) {
    final data = ref.watch(taskProvider);
    final filteredTasks = ref.watch(filteredTasksProvider);
    final taskNotifier = ref.read(taskProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Actions'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _refresh,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter bar
          FilterBar(
            projects: data.projects,
            contexts: data.contexts,
          ),

          // Task list
          Expanded(
            child: _buildContent(data, filteredTasks, taskNotifier),
          ),
        ],
      ),
    );
  }

  Widget _buildContent(
      TaskData data, List filteredTasks, TaskNotifier taskNotifier) {
    if (data.isLoading && data.tasks.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (data.error != null && data.tasks.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: AppColors.red),
            const SizedBox(height: 12),
            Text(
              'Failed to load tasks',
              style: TextStyle(fontSize: 16, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 8),
            TextButton(onPressed: _refresh, child: const Text('Retry')),
          ],
        ),
      );
    }

    if (filteredTasks.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.inbox_outlined,
                size: 48, color: AppColors.gray3),
            const SizedBox(height: 12),
            Text(
              data.tasks.isEmpty
                  ? 'No actions yet'
                  : 'No tasks match your filters',
              style: TextStyle(fontSize: 16, color: AppColors.gray1),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _refresh,
      child: ListView.builder(
        padding: const EdgeInsets.only(top: 4, bottom: 16),
        itemCount: filteredTasks.length,
        itemBuilder: (context, index) {
          final task = filteredTasks[index];
          return TaskListItem(
            task: task,
            projectName: taskNotifier.getProjectName(task.projectId),
            contextName: taskNotifier.getContextName(task.contextId),
          );
        },
      ),
    );
  }
}
