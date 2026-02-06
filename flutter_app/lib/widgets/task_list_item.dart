import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../models/task.dart';
import 'package:intl/intl.dart';

class TaskListItem extends StatelessWidget {
  final Task task;
  final String projectName;
  final String contextName;

  const TaskListItem({
    super.key,
    required this.task,
    required this.projectName,
    required this.contextName,
  });

  Color get _borderColor {
    switch (task.datumStatus) {
      case 'overdue':
        return AppColors.red;
      case 'today':
        return AppColors.blue;
      case 'future':
        return AppColors.gray2;
      default:
        return Colors.transparent;
    }
  }

  Color? get _bgColor {
    switch (task.datumStatus) {
      case 'overdue':
        return AppColors.red.withValues(alpha: 0.05);
      case 'today':
        return AppColors.blue.withValues(alpha: 0.05);
      default:
        return null;
    }
  }

  Color get _priorityColor {
    switch (task.prioriteit) {
      case 'hoog':
        return AppColors.priorityHigh;
      case 'gemiddeld':
        return AppColors.priorityMedium;
      case 'laag':
        return AppColors.priorityLow;
      default:
        return AppColors.priorityMedium;
    }
  }

  String _formatDate(String dateStr) {
    try {
      final date = DateTime.parse(dateStr);
      return DateFormat('dd-MM-yyyy').format(date);
    } catch (_) {
      return dateStr;
    }
  }

  @override
  Widget build(BuildContext context) {
    // Build extra info chips
    final extraInfo = <Widget>[];

    if (projectName.isNotEmpty) {
      extraInfo.add(_InfoChip(
        icon: Icons.folder_outlined,
        text: projectName,
      ));
    }
    if (contextName.isNotEmpty) {
      extraInfo.add(_InfoChip(
        icon: Icons.label_outlined,
        text: contextName,
      ));
    }
    if (task.verschijndatum != null && task.verschijndatum!.isNotEmpty) {
      IconData dateIcon;
      if (task.datumStatus == 'overdue') {
        dateIcon = Icons.warning_amber_rounded;
      } else if (task.datumStatus == 'today') {
        dateIcon = Icons.calendar_today;
      } else {
        dateIcon = Icons.event;
      }
      extraInfo.add(_InfoChip(
        icon: dateIcon,
        text: _formatDate(task.normalizedDate),
      ));
    }
    if (task.duur != null && task.duur! > 0) {
      extraInfo.add(_InfoChip(
        icon: Icons.timer_outlined,
        text: '${task.duur} min',
      ));
    }
    if (task.bijlagenCount > 0) {
      extraInfo.add(_InfoChip(
        icon: Icons.attach_file,
        text: '${task.bijlagenCount}',
      ));
    }

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 3),
      decoration: BoxDecoration(
        color: _bgColor ?? AppColors.bgPrimary,
        borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
        border: Border(
          left: BorderSide(
            color: _borderColor,
            width: _borderColor == Colors.transparent ? 0 : 3,
          ),
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0A000000),
            blurRadius: 3,
            offset: Offset(0, 1),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Task title row
            Row(
              children: [
                // Priority indicator
                Container(
                  width: 8,
                  height: 8,
                  margin: const EdgeInsets.only(right: 8),
                  decoration: BoxDecoration(
                    color: _priorityColor,
                    shape: BoxShape.circle,
                  ),
                ),
                // Task text
                Expanded(
                  child: Text(
                    task.tekst,
                    style: const TextStyle(
                      fontSize: 15,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                // Recurring icon
                if (task.herhalingActief)
                  const Padding(
                    padding: EdgeInsets.only(left: 6),
                    child: Icon(Icons.repeat, size: 16, color: AppColors.gray1),
                  ),
              ],
            ),
            // Extra info row
            if (extraInfo.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 6, left: 16),
                child: Wrap(
                  spacing: 12,
                  runSpacing: 4,
                  children: extraInfo,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String text;

  const _InfoChip({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 13, color: AppColors.gray1),
        const SizedBox(width: 3),
        Text(
          text,
          style: const TextStyle(fontSize: 12, color: AppColors.gray1),
        ),
      ],
    );
  }
}
