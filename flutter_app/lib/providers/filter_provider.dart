import 'package:flutter_riverpod/flutter_riverpod.dart';

class FilterState {
  final String textFilter;
  final String? projectFilter;
  final String? contextFilter;
  final String? dateFilter;
  final String? priorityFilter;
  final bool showFutureTasks;

  const FilterState({
    this.textFilter = '',
    this.projectFilter,
    this.contextFilter,
    this.dateFilter,
    this.priorityFilter,
    this.showFutureTasks = true,
  });

  FilterState copyWith({
    String? textFilter,
    String? Function()? projectFilter,
    String? Function()? contextFilter,
    String? Function()? dateFilter,
    String? Function()? priorityFilter,
    bool? showFutureTasks,
  }) {
    return FilterState(
      textFilter: textFilter ?? this.textFilter,
      projectFilter: projectFilter != null ? projectFilter() : this.projectFilter,
      contextFilter: contextFilter != null ? contextFilter() : this.contextFilter,
      dateFilter: dateFilter != null ? dateFilter() : this.dateFilter,
      priorityFilter:
          priorityFilter != null ? priorityFilter() : this.priorityFilter,
      showFutureTasks: showFutureTasks ?? this.showFutureTasks,
    );
  }
}

class FilterNotifier extends StateNotifier<FilterState> {
  FilterNotifier() : super(const FilterState());

  void setTextFilter(String value) =>
      state = state.copyWith(textFilter: value);

  void setProjectFilter(String? value) =>
      state = state.copyWith(projectFilter: () => value);

  void setContextFilter(String? value) =>
      state = state.copyWith(contextFilter: () => value);

  void setDateFilter(String? value) =>
      state = state.copyWith(dateFilter: () => value);

  void setPriorityFilter(String? value) =>
      state = state.copyWith(priorityFilter: () => value);

  void toggleFutureTasks() =>
      state = state.copyWith(showFutureTasks: !state.showFutureTasks);

  void clearAll() => state = const FilterState();
}

final filterProvider =
    StateNotifierProvider<FilterNotifier, FilterState>((ref) {
  return FilterNotifier();
});
