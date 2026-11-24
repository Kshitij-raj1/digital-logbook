// API tests using Node's built-in test runner:  npm test   (= node --test)
// Runs the real Express app against a throw-away data folder.
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'logbook-test-'));
process.env.DATA_DIR = dataDir; // must be set before the app's config is imported
execFileSync(process.execPath, [path.join(import.meta.dirname, '..', 'scripts', 'seed.js')], { env: process.env, stdio: 'ignore' });

const { createApp } = await import('../src/app.js');
const { ensureDataDirs } = await import('../src/lib/paths.js');

let server, base, kshitij, alice, formTemplate, doc;

async function call(method, url, { token, json, form } = {}) {
  const res = await fetch(base + url, {
    method,
    headers: { ...(token && { Authorization: `Bearer ${token}` }), ...(json && { 'Content-Type': 'application/json' }) },
    body: json ? JSON.stringify(json) : form,
  });
  const isJson = res.headers.get('content-type')?.includes('json');
  return { status: res.status, headers: res.headers, body: isJson ? await res.json() : Buffer.from(await res.arrayBuffer()) };
}
const login = async (username) => (await call('POST', '/auth/login', { json: { username, password: 'pass123' } })).body.token;
const pdfForm = (bytes, name = 'x.pdf') => {
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: 'application/pdf' }), name);
  return form;
};

const sampleState = {
  fields: { student_name: 'Kshitij Raj', roll_number: '42', department: 'Physics', semester: '3', check_1: true, check_3: true, aim_procedure: 'Measure g\nusing a pendulum', result: 'Achieved' },
  custom: [{ id: 'c1', page: 1, type: 'text', x: 60, y: 500, w: 200, h: 20, value: 'Custom note', fontSize: 11 }],
  strokes: [{ id: 's1', page: 1, color: '#1d4ed8', width: 2, points: [[100, 600], [150, 640], [200, 610]] }],
};

before(async () => {
  await ensureDataDirs();
  server = createApp().listen(0);
  base = `http://localhost:${server.address().port}/api`;
  [kshitij, alice] = await Promise.all([login('kshitij'), login('alice')]);
});
after(() => { server.close(); fs.rmSync(dataDir, { recursive: true, force: true }); });

describe('authentication', () => {
  it('rejects requests without a token', async () => assert.equal((await call('GET', '/documents')).status, 401));
  it('rejects a wrong password', async () =>
    assert.equal((await call('POST', '/auth/login', { json: { username: 'kshitij', password: 'nope' } })).status, 401));
  it('returns 404 JSON for unknown API routes', async () => assert.equal((await call('GET', '/nope', { token: kshitij })).status, 404));
});

describe('templates', () => {
  it('lists the shared college templates and streams a PDF', async () => {
    const list = (await call('GET', '/templates', { token: kshitij })).body;
    assert.equal(list.length, 2);
    formTemplate = list.find((t) => t.name.includes('fillable'));
    const file = await call('GET', `/templates/shared/${formTemplate.id}/file`, { token: kshitij });
    assert.equal(file.body.subarray(0, 5).toString(), '%PDF-');
  });

  it('rejects uploads that are not valid, safe PDFs', async () => {
    assert.equal((await call('POST', '/templates', { token: kshitij, form: pdfForm(Buffer.from('not a pdf at all')) })).status, 400);
    const scripted = Buffer.from('%PDF-1.4\n/JavaScript (app.alert(1))\n%%EOF');
    assert.equal((await call('POST', '/templates', { token: kshitij, form: pdfForm(scripted) })).status, 400);
  });

  it('keeps uploaded templates private to their owner', async () => {
    const blank = await PDFDocument.create();
    blank.addPage();
    const up = await call('POST', '/templates', { token: kshitij, form: pdfForm(await blank.save(), 'My College.pdf') });
    assert.equal(up.status, 201);
    assert.equal(up.body.pages, 1);
    assert.equal((await call('GET', '/templates', { token: alice })).body.length, 2);
    assert.equal((await call('GET', `/templates/mine/${up.body.id}/file`, { token: alice })).status, 404);
  });
});

describe('documents', () => {
  it('creates a document at version 1', async () => {
    const res = await call('POST', '/documents', { token: kshitij, json: { templateId: formTemplate.id, templateScope: 'shared', title: 'Exp 1' } });
    assert.equal(res.status, 201);
    doc = res.body;
    assert.equal(doc.latestVersion, 1);
  });

  it('saves drafts as new versions and detects stale saves', async () => {
    const saved = await call('PUT', `/documents/${doc.id}`, { token: kshitij, json: { state: sampleState, baseVersion: 1 } });
    assert.equal(saved.body.latestVersion, 2);
    const stale = await call('PUT', `/documents/${doc.id}`, { token: kshitij, json: { state: sampleState, baseVersion: 1 } });
    assert.equal(stale.status, 409);
  });

  it('reopens a draft with every value, and keeps old versions', async () => {
    const latest = (await call('GET', `/documents/${doc.id}`, { token: kshitij })).body;
    assert.equal(latest.state.fields.student_name, 'Kshitij Raj');
    assert.equal(latest.state.strokes.length, 1);
    assert.equal((await call('GET', `/documents/${doc.id}/versions`, { token: kshitij })).body.length, 2);
    assert.equal((await call('GET', `/documents/${doc.id}?version=1`, { token: kshitij })).body.state.fields.student_name, undefined);
  });

  it("hides one user's documents from another user", async () => {
    assert.equal((await call('GET', `/documents/${doc.id}`, { token: alice })).status, 404);
    assert.equal((await call('GET', `/documents/${doc.id}/export`, { token: alice })).status, 404);
  });

  it('rejects path-traversal ids', async () =>
    assert.equal((await call('GET', '/documents/..%2F..%2Fetc', { token: kshitij })).status, 400));
});

describe('PDF export', () => {
  it('produces a flattened PDF with no form fields left', async () => {
    const res = await call('GET', `/documents/${doc.id}/export`, { token: kshitij });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-disposition'), /attachment/);
    assert.equal((await PDFDocument.load(res.body)).getForm().getFields().length, 0);
  });

  it('deletes a document', async () => assert.equal((await call('DELETE', `/documents/${doc.id}`, { token: kshitij })).status, 204));
});
