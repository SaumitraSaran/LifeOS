/* LifeOS public demo store — fictional data only, persisted in localStorage. */
const api = (() => {
  const key = 'lifeos-public-demo-v1';
  const day = new Date().toISOString().slice(0, 10);
  const stamp = () => new Date().toISOString();
  const id = () => globalThis.crypto?.randomUUID?.() || `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const seed = () => ({
    tasks: [
      ['Plan portfolio refresh', 'HIGH', 45, '09:30'], ['Review design notes', 'MEDIUM', 30, '14:00'], ['Schedule a run', 'LOW', 15, '18:30'], ['Prepare weekly review', 'URGENT', 50, '16:00']
    ].map(([title, priority, estimated_minutes, due_time]) => ({ id: id(), title, priority, estimated_minutes, due_time, due_date: day, status: 'TODO', source: 'demo', created_at: stamp() })),
    events: [['Deep work block', '10:00'], ['Team check-in', '13:00'], ['Evening walk', '19:00']].map(([title, time]) => ({ id: id(), title, start: `${day}T${time}`, end: `${day}T${String(Number(time.slice(0, 2)) + 1).padStart(2, '0')}:${time.slice(3)}`, source: 'demo', created_at: stamp() })),
    academic_events: [
      { title: 'Case-study outline', course: 'Product thinking', due_label: 'Due Friday', type: 'ASSIGNMENT' },
      { title: 'Research synthesis', course: 'Human-centered design', due_label: 'Due next week', type: 'DEADLINE' }
    ].map(item => ({ id: id(), ...item, due_date: day, source: 'demo', created_at: stamp() })),
    messages: [{ sender: 'Avery', platform: 'Demo inbox', preview: 'Shared feedback on the project brief.', important: true, read: false }, { sender: 'Morgan', platform: 'Demo inbox', preview: 'Let’s find time for a quick review.', important: true, read: false }].map(item => ({ id: id(), ...item, timestamp: stamp(), created_at: stamp() })),
    notifications: [{ title: 'Two tasks are planned for today.', source: 'LifeOS', read: false }, { title: 'Your focus block starts in 30 minutes.', source: 'LifeOS', read: false }].map(item => ({ id: id(), ...item, timestamp: stamp(), created_at: stamp() })),
    media: [{ title: 'Designing your week', platform: 'Demo collection', type: 'article', watchlisted: true }, { title: 'The long walk', platform: 'Demo collection', type: 'podcast', watchlisted: true }].map(item => ({ id: id(), ...item, release_date: day, created_at: stamp() })),
    projects: [{ name: 'Personal website', description: 'A small, intentional portfolio.', status: 'ACTIVE', priority: 'HIGH' }, { name: 'Reading habit', description: 'A calmer evening routine.', status: 'ACTIVE', priority: 'MEDIUM' }].map(item => ({ id: id(), ...item, deadline: day, created_at: stamp() })),
    goals: [{ name: 'Ship a portfolio refresh', progress: 60, status: 'ACTIVE' }, { name: 'Move every day', progress: 42, status: 'ACTIVE' }].map(item => ({ id: id(), ...item, deadline: day, created_at: stamp() })),
    activity: [{ title: 'Demo workspace opened', type: 'system' }, { title: 'Weekly plan drafted', type: 'note' }].map(item => ({ id: id(), ...item, timestamp: stamp(), created_at: stamp() })),
    important_contacts: []
  });
  const load = () => { try { return JSON.parse(localStorage.getItem(key)) || seed(); } catch { return seed(); } };
  let data = load();
  const save = () => localStorage.setItem(key, JSON.stringify(data));
  const list = name => Promise.resolve([...(data[name] || [])]);
  const crud = name => ({
    get: () => list(name),
    create: values => { const item = { id: id(), created_at: stamp(), ...values }; (data[name] ||= []).unshift(item); save(); return Promise.resolve(item); },
    update: (itemId, values) => { const item = data[name].find(value => value.id === itemId); if (!item) return Promise.reject(new Error('Demo item not found.')); Object.assign(item, values, { updated_at: stamp() }); save(); return Promise.resolve(item); },
    remove: itemId => { data[name] = data[name].filter(value => value.id !== itemId); save(); return Promise.resolve({ ok: true }); }
  });
  const dashboard = () => { const tasks = data.tasks || []; return Promise.resolve({ tasks, events: data.events || [], academic: data.academic_events || [], messages: (data.messages || []).filter(item => item.important), media: data.media || [], recommendation: tasks.find(item => item.status !== 'COMPLETED'), stats: { open_tasks: tasks.filter(item => item.status !== 'COMPLETED').length, unread: (data.notifications || []).filter(item => !item.read).length, academic: (data.academic_events || []).length } }); };
  const update = (name, itemId, values) => crud(name).update(itemId, values);
  return {
    dashboard,
    search: query => { const needle = query.toLowerCase(); const items = Object.entries(data).flatMap(([type, values]) => values.filter(value => JSON.stringify(value).toLowerCase().includes(needle)).map(value => ({ type, title: value.title || value.name || value.sender, date: value.due_date || value.timestamp || '' }))); return Promise.resolve({ items }); },
    completeTask: (itemId, completed) => update('tasks', itemId, { status: completed ? 'COMPLETED' : 'TODO' }),
    updateTaskStatus: (itemId, status) => update('tasks', itemId, { status }),
    markMessageRead: (itemId, read) => update('messages', itemId, { read }), markMessageImportant: (itemId, important) => update('messages', itemId, { important }),
    markNotificationRead: (itemId, read) => update('notifications', itemId, { read }), dismissNotification: itemId => crud('notifications').remove(itemId), dismissAcademic: itemId => crud('academic_events').remove(itemId),
    importAcademic: values => crud('academic_events').create({ ...values, due_date: values.due_date || day, source: 'demo' }), importAcademicUrl: values => crud('academic_events').create({ title: 'Imported demo calendar', course: values.course || 'Unassigned', due_date: day, source: 'demo' }),
    integrations: () => Promise.resolve({ items: [{ provider: 'google', name: 'Google', access: 'Calendar + Gmail', configured: false, connected: false }] }), googleStatus: () => Promise.resolve({ connected: false, calendar_count: 0, gmail_count: 0, enabled_gmail_contacts: 0 }), autoSyncStatus: () => Promise.resolve({ enabled: false, interval_minutes: 60, status: 'demo' }),
    connectIntegration: () => Promise.reject(new Error('Integrations are disabled in the public demo.')), disconnectIntegration: () => Promise.resolve({ ok: true }), oauthStart: () => Promise.reject(new Error('OAuth is not available in the public demo.')), syncIntegration: () => Promise.resolve({ calendar_synced: 0, gmail_synced: 0 }), syncAll: () => Promise.resolve({ calendar_synced: 0, gmail_synced: 0 }),
    githubConfig: () => Promise.resolve({ configured: false, username: '' }), updateGithubConfig: () => Promise.resolve({ configured: false }), startFocus: task_id => Promise.resolve({ id: id(), task_id }), finishFocus: () => Promise.resolve({ ok: true }),
    tasks: crud('tasks'), events: crud('events'), academic: crud('academic_events'), notifications: crud('notifications'), messages: crud('messages'), contacts: crud('important_contacts'), projects: crud('projects'), goals: crud('goals'), media: crud('media'), activity: crud('activity')
  };
})();
