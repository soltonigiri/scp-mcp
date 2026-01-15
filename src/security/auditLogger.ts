import { appendFile } from 'node:fs/promises';

export type AuditEvent = {
  ts: string;
  session_id?: string;
  tool: string;
  args: unknown;
  result_meta?: unknown;
  error?: string;
};

export type AuditLoggerOptions = {
  logPath?: string;
};

export class AuditLogger {
  private readonly logPath?: string;

  constructor(options: AuditLoggerOptions = {}) {
    this.logPath = options.logPath;
  }

  log(event: AuditEvent) {
    const line = `${JSON.stringify(event)}\n`;

    if (!this.logPath) {
      console.error(line.trimEnd());
      return;
    }

    void appendFile(this.logPath, line, { encoding: 'utf8' }).catch((err) => {
      console.error('audit log write failed:', err);
    });
  }
}

export function truncateForLog(value: unknown, maxStringLength = 200): unknown {
  if (typeof value === 'string') {
    return value.length > maxStringLength ? `${value.slice(0, maxStringLength)}…` : value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((v) => truncateForLog(v, maxStringLength));
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = truncateForLog(v, maxStringLength);
    }
    return out;
  }
  return value;
}

