import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';
import '../models/download_models.dart';

abstract class DownloadStore {
  Future<List<DownloadRecord>> getAll();
  Future<void> upsert(DownloadRecord record);
  Future<void> delete(String id);
  Future<void> close();
}

class SqliteDownloadStore implements DownloadStore {
  static const String _dbName = 'lupin_downloads.db';
  static const String _table = 'downloads';
  Database? _db;

  Future<Database> _getDb() async {
    if (_db != null && _db!.isOpen) return _db!;
    final dbDir = await getDatabasesPath();
    final dbPath = p.join(dbDir, _dbName);
    _db = await openDatabase(
      dbPath,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE $_table (
            id TEXT PRIMARY KEY,
            dedupe_key TEXT NOT NULL,
            title TEXT NOT NULL,
            subtitle TEXT,
            poster_url TEXT,
            provider TEXT NOT NULL,
            content_id TEXT NOT NULL,
            slug TEXT NOT NULL,
            media_type TEXT NOT NULL,
            season INTEGER NOT NULL DEFAULT 0,
            episode INTEGER NOT NULL DEFAULT 0,
            quality TEXT NOT NULL,
            source_url TEXT NOT NULL,
            headers_json TEXT NOT NULL,
            mime_type TEXT,
            local_file_path TEXT,
            platform_download_id INTEGER,
            status TEXT NOT NULL,
            downloaded_bytes INTEGER NOT NULL DEFAULT 0,
            total_bytes INTEGER NOT NULL DEFAULT 0,
            error_message TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          )
        ''');
        await db.execute(
          'CREATE UNIQUE INDEX idx_downloads_dedupe ON $_table (dedupe_key)',
        );
      },
    );
    return _db!;
  }

  @override
  Future<List<DownloadRecord>> getAll() async {
    final db = await _getDb();
    final rows = await db.query(_table, orderBy: 'created_at DESC');
    return rows.map((r) => DownloadRecord.fromDbMap(r)).toList();
  }

  @override
  Future<void> upsert(DownloadRecord record) async {
    final db = await _getDb();
    await db.insert(
      _table,
      record.toDbMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  @override
  Future<void> delete(String id) async {
    final db = await _getDb();
    await db.delete(_table, where: 'id = ?', whereArgs: [id]);
  }

  @override
  Future<void> close() async {
    await _db?.close();
    _db = null;
  }
}

class InMemoryDownloadStore implements DownloadStore {
  final Map<String, DownloadRecord> _items = {};

  @override
  Future<List<DownloadRecord>> getAll() async {
    final list = _items.values.toList()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return list;
  }

  @override
  Future<void> upsert(DownloadRecord record) async {
    _items.removeWhere((_, existing) => existing.dedupeKey == record.dedupeKey && existing.id != record.id);
    _items[record.id] = record;
  }

  @override
  Future<void> delete(String id) async {
    _items.remove(id);
  }

  @override
  Future<void> close() async {}
}
