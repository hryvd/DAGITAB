const PROTOCOL = 'dagitab-sheets-v1';
const SHEET_NAME = 'DAGITAB Database';
const TABLES = new Set([
  'teams',
  'users',
  'sessions',
  'projects',
  'tasks',
  'rate_limits',
]);
const MAX_ENTRIES = 5000;
const MAX_RECORD_LENGTH = 48000;
const MAX_PAYLOAD_LENGTH = 4000000;
const MAX_CLOCK_SKEW_MS = 300000;
const REVISION_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function respond(value) {
  return ContentService.createTextOutput(
    JSON.stringify({ protocol: PROTOCOL, ...value }),
  ).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return respond({ ok: true });
}

function authenticated(payload, signature, secret) {
  if (
    typeof signature !== 'string' ||
    !/^[0-9a-f]{64}$/.test(signature) ||
    !secret ||
    secret.length < 32
  )
    return false;
  const bytes = Utilities.computeHmacSha256Signature(
    payload,
    secret,
    Utilities.Charset.UTF_8,
  );
  const expected = Array.from(bytes, (byte) =>
    (byte & 255).toString(16).padStart(2, '0'),
  ).join('');
  let difference = 0;
  for (let index = 0; index < expected.length; index++)
    difference |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
  return difference === 0;
}

function validEntry(entry) {
  if (
    !Array.isArray(entry) ||
    entry.length !== 2 ||
    !TABLES.has(entry[0]) ||
    typeof entry[1] !== 'string' ||
    entry[1].length > MAX_RECORD_LENGTH
  )
    return false;
  try {
    const record = JSON.parse(entry[1]);
    return (
      record !== null && typeof record === 'object' && !Array.isArray(record)
    );
  } catch {
    return false;
  }
}

function readRevision(sheet, rowCount) {
  if (rowCount === 0) return null;
  if (rowCount > MAX_ENTRIES + 1) throw new Error('Unexpected database size');
  const [[protocol, revision]] = sheet.getRange(1, 1, 1, 2).getValues();
  if (
    protocol !== PROTOCOL ||
    typeof revision !== 'string' ||
    !REVISION_PATTERN.test(revision)
  )
    throw new Error('Unexpected database header');
  return revision;
}

function serve(request, spreadsheetId) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000))
    return respond({ ok: false, error: 'storage_unavailable' });
  try {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet =
      spreadsheet.getSheetByName(SHEET_NAME) ||
      spreadsheet.insertSheet(SHEET_NAME);
    const rowCount = sheet.getLastRow();
    const revision = readRevision(sheet, rowCount);
    if (request.action === 'load') {
      const entries =
        rowCount > 1 ? sheet.getRange(2, 1, rowCount - 1, 2).getValues() : [];
      if (!entries.every(validEntry))
        throw new Error('Invalid database record');
      return respond({ ok: true, revision, entries });
    }
    if (request.revision !== revision)
      return respond({ ok: false, error: 'conflict' });

    const nextRevision = Utilities.getUuid();
    const rows = [[PROTOCOL, nextRevision], ...request.entries];
    while (rows.length < rowCount) rows.push(['', '']);
    const maxRows = sheet.getMaxRows();
    if (rows.length > maxRows)
      sheet.insertRowsAfter(maxRows, rows.length - maxRows);
    sheet.getRange(1, 1, rows.length, 2).setValues(rows);
    SpreadsheetApp.flush();
    return respond({ ok: true, revision: nextRevision });
  } finally {
    lock.releaseLock();
  }
}

function doPost(event) {
  const raw = event?.postData?.contents;
  if (typeof raw !== 'string' || raw.length > 2 * MAX_PAYLOAD_LENGTH)
    return respond({ ok: false, error: 'invalid_request' });
  try {
    const envelope = JSON.parse(raw);
    if (
      !envelope ||
      typeof envelope.payload !== 'string' ||
      envelope.payload.length > MAX_PAYLOAD_LENGTH
    )
      return respond({ ok: false, error: 'invalid_request' });

    const properties = PropertiesService.getScriptProperties();
    if (
      !authenticated(
        envelope.payload,
        envelope.signature,
        properties.getProperty('DAGITAB_SHEETS_SECRET'),
      )
    )
      return respond({ ok: false, error: 'unauthorized' });

    const request = JSON.parse(envelope.payload);
    if (
      !request ||
      !['load', 'commit'].includes(request.action) ||
      !Number.isSafeInteger(request.issuedAt) ||
      Math.abs(Date.now() - request.issuedAt) > MAX_CLOCK_SKEW_MS
    )
      return respond({ ok: false, error: 'invalid_request' });
    if (
      request.action === 'commit' &&
      ((request.revision !== null &&
        (typeof request.revision !== 'string' ||
          !REVISION_PATTERN.test(request.revision))) ||
        !Array.isArray(request.entries) ||
        request.entries.length > MAX_ENTRIES ||
        !request.entries.every(validEntry))
    )
      return respond({ ok: false, error: 'invalid_request' });

    const spreadsheetId = properties.getProperty('DAGITAB_SPREADSHEET_ID');
    if (!spreadsheetId)
      return respond({ ok: false, error: 'storage_unavailable' });
    try {
      return serve(request, spreadsheetId);
    } catch {
      return respond({ ok: false, error: 'storage_unavailable' });
    }
  } catch {
    return respond({ ok: false, error: 'invalid_request' });
  }
}
