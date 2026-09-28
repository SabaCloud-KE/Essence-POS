import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
export type LogCategory =
  | 'AUTH'
  | 'PAYMENT'
  | 'ADMIN'
  | 'SYSTEM'
  | 'DATABASE'
  | 'API'
  | 'SECURITY';

export interface LogEntry {
  id?: string;
  timestamp: string;
  createdAt?: string;
  level: LogLevel;
  category: LogCategory;
  context?: string;
  message: string;
  metadata?: any;
  stackTrace?: string;
}

export interface ReadLogsQuery {
  page?: number;
  limit?: number;
  level?: string;
  category?: string;
  context?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  file?: string;
}

const SENSITIVE_KEYS = [
  'password',
  'passwordhash',
  'token',
  'jwt',
  'secret',
  'passkey',
  'authorization',
  'cookie',
  'consumersecret',
  'consumerkey',
  'apikey',
  'api_key',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'mfasecret',
  'mfa_secret',
  'securitycredential',
];

/**
 * Mask Kenyan and general phone numbers (e.g. 254712345678 -> 2547****5678)
 */
export function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  const str = String(phone).trim();
  if (str.length < 8) return '***';
  const prefix = str.slice(0, 4);
  const suffix = str.slice(-4);
  return `${prefix}****${suffix}`;
}

/**
 * Recursively strip sensitive keys and mask sensitive data
 */
export function sanitizeMetadata(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') {
    if (typeof data === 'string' && /^(?:\+?254|0)[17]\d{8}$/.test(data.trim())) {
      return maskPhoneNumber(data);
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeMetadata(item));
  }

  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    const lower = key.toLowerCase().replace(/[-_]/g, '');
    if (SENSITIVE_KEYS.some((s) => lower.includes(s))) {
      clean[key] = '[REDACTED]';
    } else if (lower.includes('phone') && typeof val === 'string') {
      clean[key] = maskPhoneNumber(val);
    } else if (typeof val === 'object' && val !== null) {
      clean[key] = sanitizeMetadata(val);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

@Injectable()
export class AppLoggerService implements OnModuleInit {
  private readonly logDir = path.resolve(process.cwd(), 'storage', 'logs');
  private writeQueue: Promise<void> = Promise.resolve();

  onModuleInit() {
    this.ensureLogDirectory();
    this.cleanOldLogs(30);
  }

  /**
   * Ensure storage/logs directory exists
   */
  private ensureLogDirectory(): void {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    } catch (err: any) {
      console.error('[AppLoggerService] Failed to create log directory:', err.message);
    }
  }

  /**
   * Format current timestamp as YYYY-MM-DD HH:mm:ss (UTC)
   */
  private getTimestamp(date: Date = new Date()): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    const y = date.getUTCFullYear();
    const m = pad(date.getUTCMonth() + 1);
    const d = pad(date.getUTCDate());
    const h = pad(date.getUTCHours());
    const min = pad(date.getUTCMinutes());
    const s = pad(date.getUTCSeconds());
    return `${y}-${m}-${d} ${h}:${min}:${s}`;
  }

  /**
   * Get date prefix for daily rotation (YYYY-MM-DD)
   */
  private getDatePrefix(date: Date = new Date()): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
  }

  /**
   * Format metadata into key=value or JSON
   */
  private formatMetadataString(metadata?: any): string {
    if (metadata === undefined || metadata === null) return '';
    const sanitized = sanitizeMetadata(metadata);
    if (typeof sanitized === 'string') return sanitized.trim();
    if (typeof sanitized !== 'object') return String(sanitized);

    const entries = Object.entries(sanitized);
    if (entries.length === 0) return '';

    const isFlat = entries.every(
      ([_, v]) =>
        v === null ||
        typeof v === 'string' ||
        typeof v === 'number' ||
        typeof v === 'boolean',
    );

    if (isFlat) {
      return entries
        .map(([k, v]) => `${k}=${v === null ? 'null' : String(v)}`)
        .join(' ');
    }

    try {
      return JSON.stringify(sanitized);
    } catch {
      return '[Unserializable Metadata]';
    }
  }

  /**
   * Core logging method with zero-crash guarantee and queue-backed concurrency safety
   */
  public log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    metadata?: any,
    stackTrace?: string,
  ): void {
    const now = new Date();
    const timestamp = this.getTimestamp(now);
    const datePrefix = this.getDatePrefix(now);
    const sanitizedMeta = this.formatMetadataString(metadata);

    // Build standard human-readable log line:
    // YYYY-MM-DD HH:mm:ss | LEVEL | CATEGORY | MESSAGE | METADATA
    let logLine = `${timestamp} | ${level} | ${category} | ${message.replace(/\r?\n/g, ' ')}`;
    if (sanitizedMeta) {
      logLine += ` | ${sanitizedMeta}`;
    }

    // Stream to server console (Render stdout/stderr)
    this.streamToConsole(level, logLine, stackTrace);

    // Prepare full text to append to files
    let textToAppend = logLine + '\n';
    if (stackTrace) {
      const formattedStack = stackTrace
        .split('\n')
        .map((line) => `  Stack: ${line}`)
        .join('\n');
      textToAppend += formattedStack + '\n';
    }

    // Determine target log file basenames
    const targetFiles: string[] = ['application'];

    if (category === 'AUTH' || category === 'SECURITY') {
      targetFiles.push('authentication');
    }
    if (category === 'PAYMENT') {
      targetFiles.push('payments');
    }
    if (category === 'ADMIN') {
      targetFiles.push('admin');
    }
    if (level === 'ERROR') {
      targetFiles.push('errors');
    }

    // Append to file queue safely
    this.enqueueWrite(datePrefix, targetFiles, textToAppend);
  }

  /**
   * Stream directly to console for Render logging
   */
  private streamToConsole(level: LogLevel, line: string, stackTrace?: string): void {
    switch (level) {
      case 'ERROR':
        console.error(line);
        if (stackTrace) console.error(stackTrace);
        break;
      case 'WARN':
        console.warn(line);
        break;
      case 'DEBUG':
        console.debug(line);
        break;
      case 'INFO':
      default:
        console.log(line);
        break;
    }
  }

  /**
   * Safely append text to target files sequentially without throwing errors
   */
  private enqueueWrite(datePrefix: string, basenames: string[], content: string): void {
    this.writeQueue = this.writeQueue
      .then(async () => {
        this.ensureLogDirectory();

        for (const base of basenames) {
          // Write to both daily-rotated file and un-dated convenience file
          const dailyFile = path.join(this.logDir, `${datePrefix}-${base}.log`);
          const unifiedFile = path.join(this.logDir, `${base}.log`);

          try {
            await fs.promises.appendFile(dailyFile, content, { encoding: 'utf8' });
          } catch (err: any) {
            console.error(`[AppLoggerService] Write error for ${dailyFile}:`, err.message);
          }

          try {
            await fs.promises.appendFile(unifiedFile, content, { encoding: 'utf8' });
          } catch (err: any) {
            console.error(`[AppLoggerService] Write error for ${unifiedFile}:`, err.message);
          }
        }
      })
      .catch((err) => {
        console.error('[AppLoggerService] Unhandled queue write error:', err.message);
      });
  }

  public info(category: LogCategory, message: string, metadata?: any): void {
    this.log('INFO', category, message, metadata);
  }

  public warn(category: LogCategory, message: string, metadata?: any): void {
    this.log('WARN', category, message, metadata);
  }

  public error(
    category: LogCategory,
    message: string,
    metadata?: any,
    stackTrace?: string,
  ): void {
    this.log('ERROR', category, message, metadata, stackTrace);
  }

  public debug(category: LogCategory, message: string, metadata?: any): void {
    this.log('DEBUG', category, message, metadata);
  }

  /**
   * Safe Admin Log Reader with strict path traversal protection
   */
  public async readLogs(query: ReadLogsQuery): Promise<{
    data: LogEntry[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    this.ensureLogDirectory();

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));

    // STRICT Path Traversal Validation: Whitelist format
    let targetFileName = query.file;
    if (targetFileName) {
      const isValid = /^(\d{4}-\d{2}-\d{2}-)?(application|authentication|payments|admin|errors)\.log$/.test(
        targetFileName,
      );
      if (!isValid) {
        throw new Error('Invalid log file name requested.');
      }
    } else {
      // Default to application.log or today's log
      targetFileName = 'application.log';
    }

    const filePath = path.join(this.logDir, targetFileName);

    // If file doesn't exist yet, return empty list
    if (!fs.existsSync(filePath)) {
      return {
        data: [],
        meta: { page: 1, limit, total: 0, totalPages: 0 },
      };
    }

    const logs: LogEntry[] = [];
    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    const lineRegex = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \| ([A-Z]+) \| ([A-Z]+) \| (.*?)(?: \| (.*))?$/;
    let currentEntry: LogEntry | null = null;
    let entryIndex = 0;

    for await (const line of rl) {
      if (!line.trim()) continue;

      const match = line.match(lineRegex);
      if (match) {
        if (currentEntry) {
          logs.push(currentEntry);
        }

        const [, timestamp, level, category, message, metadata] = match;
        entryIndex++;
        currentEntry = {
          id: `log-${entryIndex}-${timestamp.replace(/[: -]/g, '')}`,
          timestamp,
          createdAt: new Date(timestamp + 'Z').toISOString(),
          level: level as LogLevel,
          category: category as LogCategory,
          context: category, // Matches UI expectation
          message,
          metadata: metadata || null,
        };
      } else if (currentEntry && line.startsWith('  Stack:')) {
        const stackLine = line.replace('  Stack: ', '');
        currentEntry.stackTrace = currentEntry.stackTrace
          ? `${currentEntry.stackTrace}\n${stackLine}`
          : stackLine;
      }
    }

    if (currentEntry) {
      logs.push(currentEntry);
    }

    // Filter logs in memory
    const search = query.search ? query.search.toLowerCase().trim() : null;
    const filterLevel = query.level ? query.level.toUpperCase().trim() : null;
    const filterCategory = (query.category || query.context)
      ? (query.category || query.context)!.toUpperCase().trim()
      : null;

    const filtered = logs.filter((log) => {
      if (filterLevel && filterLevel !== 'ALL' && log.level !== filterLevel) {
        return false;
      }
      if (
        filterCategory &&
        filterCategory !== 'ALL' &&
        log.category !== filterCategory &&
        log.context !== filterCategory
      ) {
        return false;
      }
      if (query.startDate) {
        const logDate = new Date(log.timestamp + 'Z');
        const start = new Date(query.startDate);
        if (logDate < start) return false;
      }
      if (query.endDate) {
        const logDate = new Date(log.timestamp + 'Z');
        const end = new Date(query.endDate);
        if (logDate > end) return false;
      }
      if (search) {
        const inMsg = log.message.toLowerCase().includes(search);
        const inCat = log.category.toLowerCase().includes(search);
        const inMeta = log.metadata ? String(log.metadata).toLowerCase().includes(search) : false;
        if (!inMsg && !inCat && !inMeta) return false;
      }
      return true;
    });

    // Sort newest first
    filtered.reverse();

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const skip = (page - 1) * limit;
    const data = filtered.slice(skip, skip + limit);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Return metadata about existing log files
   */
  public getAvailableLogFiles(): Array<{
    fileName: string;
    sizeBytes: number;
    modifiedAt: string;
  }> {
    this.ensureLogDirectory();
    try {
      const files = fs.readdirSync(this.logDir);
      return files
        .filter((file) => file.endsWith('.log'))
        .map((file) => {
          const stats = fs.statSync(path.join(this.logDir, file));
          return {
            fileName: file,
            sizeBytes: stats.size,
            modifiedAt: stats.mtime.toISOString(),
          };
        })
        .sort((a, b) => b.fileName.localeCompare(a.fileName));
    } catch {
      return [];
    }
  }

  /**
   * Prune logs older than maxDays to preserve disk space on Render
   */
  public cleanOldLogs(maxDays = 30): void {
    try {
      if (!fs.existsSync(this.logDir)) return;
      const files = fs.readdirSync(this.logDir);
      const now = Date.now();
      const maxAgeMs = maxDays * 24 * 60 * 60 * 1000;

      for (const file of files) {
        if (!file.endsWith('.log')) continue;
        // Check date prefix if daily rotated
        const match = file.match(/^(\d{4}-\d{2}-\d{2})-/);
        if (match) {
          const fileDate = new Date(match[1]).getTime();
          if (!isNaN(fileDate) && now - fileDate > maxAgeMs) {
            fs.unlinkSync(path.join(this.logDir, file));
            console.log(`[AppLoggerService] Pruned expired log file: ${file}`);
          }
        }
      }
    } catch (err: any) {
      console.error('[AppLoggerService] Error cleaning old logs:', err.message);
    }
  }
}
