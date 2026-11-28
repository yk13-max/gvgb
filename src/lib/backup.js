// A backup file is the document plus an envelope saying where and when it came from.
// Importing one is the same operation as loading from the server, so the two agree by
// construction rather than by being kept in step.
import { DOC_APP, DOC_VERSION, buildDoc, parseDoc } from './doc.js';
import { downloadBlob } from './download.js';

export { DOC_APP as BACKUP_APP, DOC_VERSION as BACKUP_VERSION };

export function exportJSON(state) {
  const doc = { ...buildDoc(state), exportedAt: new Date().toISOString() };
  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' }), 'fufa-backup-' + stamp + '.json');
}

export function parseBackup(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { error: 'That file is not valid JSON.' };
  }
  return parseDoc(data);
}

export function readBackupFile(file, done) {
  const reader = new FileReader();
  reader.onload = () => done(parseBackup(String(reader.result)), file.name);
  reader.onerror = () => done({ error: 'That file could not be read.' }, file.name);
  reader.readAsText(file);
}
