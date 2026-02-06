import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/theme.dart';
import '../models/project.dart';
import '../models/context_model.dart';
import '../providers/filter_provider.dart';

class FilterBar extends ConsumerStatefulWidget {
  final List<Project> projects;
  final List<TaskContext> contexts;

  const FilterBar({
    super.key,
    required this.projects,
    required this.contexts,
  });

  @override
  ConsumerState<FilterBar> createState() => _FilterBarState();
}

class _FilterBarState extends ConsumerState<FilterBar> {
  final _searchController = TextEditingController();
  Timer? _debounce;
  bool _expanded = false;

  @override
  void dispose() {
    _searchController.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  void _onSearchChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () {
      ref.read(filterProvider.notifier).setTextFilter(value);
    });
  }

  @override
  Widget build(BuildContext context) {
    final filter = ref.watch(filterProvider);
    final hasActiveFilters = filter.textFilter.isNotEmpty ||
        filter.projectFilter != null ||
        filter.contextFilter != null ||
        filter.dateFilter != null ||
        filter.priorityFilter != null ||
        !filter.showFutureTasks;

    return Container(
      color: AppColors.bgPrimary,
      child: Column(
        children: [
          // Search bar + expand toggle
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
            child: Row(
              children: [
                Expanded(
                  child: SizedBox(
                    height: 38,
                    child: TextField(
                      controller: _searchController,
                      onChanged: _onSearchChanged,
                      decoration: InputDecoration(
                        hintText: 'Search tasks...',
                        hintStyle: const TextStyle(
                            fontSize: 14, color: AppColors.gray2),
                        prefixIcon: const Icon(Icons.search, size: 20),
                        suffixIcon: _searchController.text.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.clear, size: 18),
                                onPressed: () {
                                  _searchController.clear();
                                  ref
                                      .read(filterProvider.notifier)
                                      .setTextFilter('');
                                },
                              )
                            : null,
                        isDense: true,
                        contentPadding:
                            const EdgeInsets.symmetric(vertical: 8),
                        filled: true,
                        fillColor: AppColors.bgSecondary,
                        border: OutlineInputBorder(
                          borderRadius:
                              BorderRadius.circular(AppTheme.radiusSmall),
                          borderSide: BorderSide.none,
                        ),
                      ),
                      style: const TextStyle(fontSize: 14),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                InkWell(
                  onTap: () => setState(() => _expanded = !_expanded),
                  borderRadius:
                      BorderRadius.circular(AppTheme.radiusSmall),
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: hasActiveFilters
                          ? AppColors.blue.withValues(alpha: 0.1)
                          : AppColors.bgSecondary,
                      borderRadius:
                          BorderRadius.circular(AppTheme.radiusSmall),
                    ),
                    child: Icon(
                      Icons.tune,
                      size: 20,
                      color: hasActiveFilters
                          ? AppColors.blue
                          : AppColors.gray1,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Expanded filters
          if (_expanded)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 4, 12, 8),
              child: Column(
                children: [
                  Row(
                    children: [
                      // Project dropdown
                      Expanded(
                        child: _FilterDropdown<String?>(
                          label: 'Project',
                          value: filter.projectFilter,
                          items: [
                            const DropdownMenuItem(
                                value: null, child: Text('All projects')),
                            ...widget.projects.map((p) => DropdownMenuItem(
                                value: p.id, child: Text(p.naam))),
                          ],
                          onChanged: (v) => ref
                              .read(filterProvider.notifier)
                              .setProjectFilter(v),
                        ),
                      ),
                      const SizedBox(width: 8),
                      // Context dropdown
                      Expanded(
                        child: _FilterDropdown<String?>(
                          label: 'Context',
                          value: filter.contextFilter,
                          items: [
                            const DropdownMenuItem(
                                value: null, child: Text('All contexts')),
                            ...widget.contexts.map((c) => DropdownMenuItem(
                                value: c.id, child: Text(c.naam))),
                          ],
                          onChanged: (v) => ref
                              .read(filterProvider.notifier)
                              .setContextFilter(v),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      // Priority dropdown
                      Expanded(
                        child: _FilterDropdown<String?>(
                          label: 'Priority',
                          value: filter.priorityFilter,
                          items: const [
                            DropdownMenuItem(
                                value: null, child: Text('All')),
                            DropdownMenuItem(
                                value: 'hoog', child: Text('High')),
                            DropdownMenuItem(
                                value: 'gemiddeld', child: Text('Medium')),
                            DropdownMenuItem(
                                value: 'laag', child: Text('Low')),
                          ],
                          onChanged: (v) => ref
                              .read(filterProvider.notifier)
                              .setPriorityFilter(v),
                        ),
                      ),
                      const SizedBox(width: 8),
                      // Date picker
                      Expanded(
                        child: InkWell(
                          onTap: () async {
                            final date = await showDatePicker(
                              context: context,
                              initialDate: DateTime.now(),
                              firstDate: DateTime(2020),
                              lastDate: DateTime(2030),
                            );
                            if (date != null) {
                              ref
                                  .read(filterProvider.notifier)
                                  .setDateFilter(date
                                      .toIso8601String()
                                      .substring(0, 10));
                            }
                          },
                          child: Container(
                            height: 38,
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10),
                            decoration: BoxDecoration(
                              color: AppColors.bgSecondary,
                              borderRadius: BorderRadius.circular(
                                  AppTheme.radiusSmall),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.calendar_today,
                                    size: 16, color: AppColors.gray1),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    filter.dateFilter ?? 'Date',
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: filter.dateFilter != null
                                          ? AppColors.textPrimary
                                          : AppColors.gray2,
                                    ),
                                  ),
                                ),
                                if (filter.dateFilter != null)
                                  GestureDetector(
                                    onTap: () => ref
                                        .read(filterProvider.notifier)
                                        .setDateFilter(null),
                                    child: const Icon(Icons.clear,
                                        size: 16, color: AppColors.gray1),
                                  ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  // Future tasks toggle + clear
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          SizedBox(
                            height: 24,
                            width: 40,
                            child: Switch(
                              value: filter.showFutureTasks,
                              onChanged: (_) => ref
                                  .read(filterProvider.notifier)
                                  .toggleFutureTasks(),
                              materialTapTargetSize:
                                  MaterialTapTargetSize.shrinkWrap,
                            ),
                          ),
                          const SizedBox(width: 6),
                          const Text('Show future tasks',
                              style: TextStyle(fontSize: 13)),
                        ],
                      ),
                      if (hasActiveFilters)
                        TextButton(
                          onPressed: () {
                            _searchController.clear();
                            ref.read(filterProvider.notifier).clearAll();
                          },
                          child: const Text('Clear filters',
                              style: TextStyle(fontSize: 13)),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          const Divider(height: 1),
        ],
      ),
    );
  }
}

class _FilterDropdown<T> extends StatelessWidget {
  final String label;
  final T value;
  final List<DropdownMenuItem<T>> items;
  final ValueChanged<T?> onChanged;

  const _FilterDropdown({
    required this.label,
    required this.value,
    required this.items,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 38,
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(
        color: AppColors.bgSecondary,
        borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<T>(
          value: value,
          items: items,
          onChanged: onChanged,
          isExpanded: true,
          isDense: true,
          style: const TextStyle(
              fontSize: 13, color: AppColors.textPrimary),
          hint: Text(label,
              style: const TextStyle(
                  fontSize: 13, color: AppColors.gray2)),
        ),
      ),
    );
  }
}
