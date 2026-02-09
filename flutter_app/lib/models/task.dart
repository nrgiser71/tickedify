enum DateStatus { overdue, today, future, noDate }

class Task {
  final String id;
  final String tekst;
  final int? projectId;
  final int? contextId;
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
      projectId: json['projectId'] is int
          ? json['projectId']
          : int.tryParse(json['projectId']?.toString() ?? ''),
      contextId: json['contextId'] is int
          ? json['contextId']
          : int.tryParse(json['contextId']?.toString() ?? ''),
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

  /// Ported from app.js getTaakDatumStatus
  DateStatus get datumStatus {
    if (verschijndatum == null || verschijndatum!.isEmpty) {
      return DateStatus.noDate;
    }

    final now = DateTime.now();
    final today =
        DateTime(now.year, now.month, now.day).toIso8601String().substring(0, 10);
    final taskDate = verschijndatum!.contains('T')
        ? verschijndatum!.split('T')[0]
        : verschijndatum!;

    if (taskDate.compareTo(today) < 0) return DateStatus.overdue;
    if (taskDate.compareTo(today) > 0) return DateStatus.future;
    return DateStatus.today;
  }

  String get normalizedDate {
    if (verschijndatum == null || verschijndatum!.isEmpty) return '';
    return verschijndatum!.contains('T')
        ? verschijndatum!.split('T')[0]
        : verschijndatum!;
  }
}
