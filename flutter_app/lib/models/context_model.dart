class TaskContext {
  final String id;
  final String naam;

  TaskContext({required this.id, required this.naam});

  factory TaskContext.fromJson(Map<String, dynamic> json) {
    return TaskContext(
      id: json['id']?.toString() ?? '',
      naam: json['naam']?.toString() ?? '',
    );
  }
}
