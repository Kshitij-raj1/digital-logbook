// All the backend calls the UI makes, in one place.
import { request } from './client.js';

export { getToken, setToken, setUnauthorizedHandler } from './client.js';

export const api = {
  // auth
  login: (username, password) => request('POST', '/auth/login', { json: { username, password } }),
  me: () => request('GET', '/auth/me'),

  // templates
  templates: () => request('GET', '/templates'),
  uploadTemplate(file) {
    const form = new FormData();
    form.append('file', file);
    return request('POST', '/templates', { form });
  },
  deleteTemplate: (id) => request('DELETE', `/templates/${id}`),
  templateBytes: async (scope, id) => (await request('GET', `/templates/${scope}/${id}/file`, { raw: true })).arrayBuffer(),

  // documents
  documents: () => request('GET', '/documents'),
  createDocument: (templateId, templateScope, title) => request('POST', '/documents', { json: { templateId, templateScope, title } }),
  getDocument: (id, version) => request('GET', `/documents/${id}${version ? `?version=${version}` : ''}`),
  saveDocument: (id, state, baseVersion) => request('PUT', `/documents/${id}`, { json: { state, baseVersion } }),
  versions: (id) => request('GET', `/documents/${id}/versions`),
  deleteDocument: (id) => request('DELETE', `/documents/${id}`),

  // We download with fetch (not a plain link) so the login token is sent along.
  async download(id, version) {
    const query = version ? `?version=${version}` : '';
    const res = await request('GET', `/documents/${id}/export${query}`, { raw: true });
    const filename = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') ?? '')?.[1] ?? 'logbook.pdf';
    const url = URL.createObjectURL(await res.blob());
    const link = Object.assign(document.createElement('a'), { href: url, download: filename });
    link.click();
    URL.revokeObjectURL(url);
  },
};
