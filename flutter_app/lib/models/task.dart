class Task {
  final String id;
  final String tekst;
  final dynamic projectId;
  final dynamic contextId;
  final String? verschijndatum;
  final int? duur;
  final String prioriteit;
  final bool herhalingActief;
  final int bijlagenCount;
  final String? opmerkingen;

  Task({
    required this.id,
    required this.tekst,
    this.projectId,
    this.contextId,
    this.verschijndatum,
    this.duur,
    this.prioriteit = 'gemiddeld',
    this.herhalingActief = false,
    this.bijlagenCount = 0,
    this.opmerkingen,
  });

  factory Task.fromJson(Map<String, dynamic> json) {
    return Task(
      id: json['id']?.toString() ?? '',
      tekst: json['tekst']?.toString() ?? '',
      projectId: json['projectId'],
      contextId: json['contextId'],
      verschijndatum: json['verschijndatum']?.toString(),
      duur: json['duur'] is int
          ? json['duur']
          : int.tryParse(json['duur']?.toString() ?? ''),
      prioriteit: json['prioriteit']?.toString() ?? 'gemiddeld',
      herhalingActief: json['herhalingActief'] == true,
      bijlagenCount: json['bijlagenCount'] is int
          ? json['bijlagenCount']
          : int.tryParse(json['bijlagenCount']?.toString() ?? '0') ?? 0,
      opmerkingen: json['opmerkingen']?.toString(),
    );
  }

  /// Returns 'overdue', 'today', 'future', or 'no-date'
  /// Ported from app.js getTaakDatumStatus
  String get datumStatus {
    if (verschijndatum == null || verschijndatum!.isEmpty) return 'no-date';

    final now = DateTime.now();
    final today =
        DateTime(now.year, now.month, now.day).toIso8601String().substring(0, 10);
    final taskDate = verschijndatum!.contains('T')
        ? verschijndatum!.split('T')[0]
        : verschijndatum!;

    if (taskDate.compareTo(today) < 0) return 'overdue';
    if (taskDate.compareTo(today) > 0) return 'future';
    return 'today';
  }

  String get normalizedDate {
    if (verschijndatum == null || verschijndatum!.isEmpty) return '';
    return verschijndatum!.contains('T')
        ? verschijndatum!.split('T')[0]
        : verschijndatum!;
  }
}
