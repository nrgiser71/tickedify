class Project {
  final String id;
  final String naam;

  Project({required this.id, required this.naam});

  factory Project.fromJson(Map<String, dynamic> json) {
    return Project(
      id: json['id']?.toString() ?? '',
      naam: json['naam']?.toString() ?? '',
    );
  }
}
