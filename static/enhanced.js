(() => {
    const sectionMap = {
        today: ['Today', 'Your command center'], calendar: ['Calendar', 'Plan the shape of your time'], tasks: ['Tasks', 'Work in progress'], academic: ['Academic', 'Courses and milestones'], messages: ['Messages', 'Only selected conversations'], notifications: ['Notifications', 'A quiet inbox for your systems'], media: ['Media', 'Releases and watchlist'], projects: ['Projects', 'The work behind the work'], goals: ['Goals', 'Longer horizons'], activity: ['Activity', 'Meaningful movement'], focus: ['Focus', 'One thing at a time'], settings: ['Settings', 'Make it yours']
    };
    const collectionFor = { tasks: 'tasks', calendar: 'events', academic: 'academic', messages: 'messages', notifications: 'notifications', media: 'media', projects: 'projects', goals: 'goals', activity: 'activity' };
    let calendarMode = 'week';
    let calendarDate = new Date();
    let selectedCalendarDate = new Date().toISOString().slice(0, 10);
    let academicFilter = 'ALL';
    let focusSession = null;
    let focusSeconds = 0;
    let focusTimer = null;
    function safeUrl(value) { try { const url = new URL(value, window.location.href); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } }

    function enhancedNav() {
        const nav = document.querySelector('#nav');
        nav.innerHTML = navItems.map(([id, icon, label]) => `<button class="nav-item ${state.section === id ? 'active' : ''}" data-section="${id}"><span>${icon}</span>${label}</button>`).join('');
        nav.querySelectorAll('[data-section]').forEach(button => button.onclick = () => { state.section = button.dataset.section; enhancedRender(); });
        const settings = document.querySelector('.settings-link');
        settings.classList.toggle('active', state.section === 'settings');
        settings.onclick = () => { state.section = 'settings'; enhancedRender(); };
        let mobile = document.querySelector('.mobile-nav');
        if (!mobile) { mobile = document.createElement('nav'); mobile.className = 'mobile-nav'; document.body.appendChild(mobile); }
        mobile.innerHTML = navItems.slice(0, 5).map(([id, icon, label]) => `<button class="nav-item ${state.section === id ? 'active' : ''}" data-section="${id}"><span>${icon}</span>${label}</button>`).join('');
        mobile.querySelectorAll('[data-section]').forEach(button => button.onclick = () => { state.section = button.dataset.section; enhancedRender(); });
    }

    function header(title, kicker, action = '') { return `<div class="section-head"><div><div class="eyebrow">${esc(kicker)}</div><h1>${esc(title)}</h1></div>${action}</div>`; }
    function empty(title, action = '') { return `<div class="empty"><strong>${esc(title)}</strong><p>There is nothing here yet.</p>${action}</div>`; }
    function collectionButtons(type) { const labels = { tasks: 'task', events: 'event', academic: 'academic event', messages: 'message', notifications: 'notification', media: 'media item', projects: 'project', goals: 'goal', activity: 'activity note' }; return `<button class="button" data-enhanced-action="${type === 'events' ? 'event' : type === 'academic' ? 'academic' : type.slice(0, -1)}">+ Add ${labels[type] || 'item'}</button>`; }
    function taskItem(task) { return `<div class="list-row"><button class="check ${task.status === 'COMPLETED' ? 'done' : ''}" data-enhanced-complete="${task.id}"></button><div class="row-main"><div class="item-title">${esc(task.title)}</div><div class="item-meta">${esc(task.due_date || 'No deadline')} · ${task.estimated_minutes || 0} min · ${esc(task.status)}</div></div><span class="priority ${esc(task.priority)}">${esc(task.priority)}</span><button class="icon-button" data-enhanced-edit="tasks:${task.id}" title="Edit">✎</button><button class="icon-button" data-enhanced-delete="tasks:${task.id}" title="Delete">×</button></div>`; }
    function genericItem(item, type) { const title = item.title || item.name || item.sender || item.preview || item.type || 'Untitled'; const detail = item.course_name || item.course || item.platform || item.status || item.due_date || item.timestamp || item.description || ''; const actions = type === 'messages' ? `<button class="button secondary" data-message-read="${item.id}">${item.read ? 'Unread' : 'Read'}</button><button class="button secondary" data-message-important="${item.id}">${item.important ? 'Unmark' : 'Important'}</button>` : type === 'notifications' ? `<button class="button secondary" data-notification-read="${item.id}">${item.read ? 'Unread' : 'Read'}</button><button class="button secondary" data-notification-dismiss="${item.id}">Dismiss</button>` : type === 'academic_events' ? `<span class="priority">${esc(item.event_type || 'ACADEMIC')}</span>${item.duration_minutes ? `<span class="item-meta">${item.duration_minutes} min</span>` : ''}` : ''; const external = safeUrl(item.url || item.external_url); return `<div class="list-row"><div class="row-main"><div class="item-title">${esc(title)}</div><div class="item-meta">${esc(detail)}${external ? ` · <a href="${esc(external)}" target="_blank" rel="noreferrer">Open original</a>` : ''}</div></div>${actions}<button class="icon-button" data-enhanced-edit="${type}:${item.id}" title="Edit">✎</button><button class="icon-button" data-enhanced-delete="${type}:${item.id}" title="Delete">×</button></div>`; }

    async function enhancedRender() {
        enhancedNav();
        document.querySelector('#date-line').textContent = new Date().toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        try {
            if (state.section === 'today') { const data = await api.dashboard(); state.dashboard = data; document.querySelector('#view').innerHTML = dashboardView(data); bindEnhanced(); return; }
            if (state.section === 'calendar') { await renderCalendar(); return; }
            if (state.section === 'focus') { await renderEnhancedFocus(); return; }
            if (state.section === 'settings') { await renderEnhancedSettings(); return; }
            const type = collectionFor[state.section];
            const items = await api[type === 'academic' ? 'academic' : type].get();
            document.querySelector('#view').innerHTML = renderCollection(state.section, items);
            bindEnhanced();
        } catch (error) { document.querySelector('#view').innerHTML = `<div class="panel"><div class="empty"><strong>${esc(error.message)}</strong><p>Check the API connection and try again.</p><button class="button secondary" data-enhanced-action="retry">Retry</button></div></div>`; bindEnhanced(); }
    }

    function renderCollection(section, items) {
        const [title, kicker] = sectionMap[section];
        if (section === 'tasks') return `${header(title, kicker, collectionButtons('tasks'))}<div class="toolbar"><input id="task-filter" placeholder="Filter tasks"><select id="task-status"><option value="">All statuses</option><option>TODO</option><option>IN_PROGRESS</option><option>COMPLETED</option><option>CANCELLED</option></select><select id="task-sort"><option value="priority">Priority</option><option value="due_date">Due date</option><option value="created_at">Newest</option></select></div><div class="panel" id="task-list">${items.length ? items.map(taskItem).join('') : empty('Nothing left on your list.', collectionButtons('tasks'))}</div>`;
        if (section === 'academic') return `${header(title, kicker, '<div class="header-actions"><button class="button secondary" data-enhanced-action="academic-import">Import ICS / URL</button>' + collectionButtons('academic') + '</div>')}<div class="panel academic-summary"><div class="eyebrow">Course view</div><div class="cards-grid">${courseGroups(items)}</div></div><div class="panel">${items.length ? items.map(item => genericItem(item, 'academic_events')).join('') : empty('Connect or import your academic calendar.', collectionButtons('academic'))}</div>`;
        const type = collectionFor[section];
        return `${header(title, kicker, collectionButtons(type))}<div class="panel">${items.length ? items.map(item => genericItem(item, type === 'academic' ? 'academic_events' : type)).join('') : empty(`No ${title.toLowerCase()} yet.`, collectionButtons(type))}</div>`;
    }

    function courseGroups(items) { const groups = {}; items.forEach(item => { const key = item.course || 'Unassigned course'; (groups[key] ||= []).push(item); }); return Object.entries(groups).map(([course, events]) => `<div class="panel course-card"><div class="eyebrow">${events.length} items</div><h3>${esc(course)}</h3><p>${esc(events[0].title)}</p><div class="progress-track"><span style="width:${Math.min(90, events.length * 18)}%"></span></div></div>`).join('') || '<div class="empty">Add a course event to see progress.</div>'; }

    async function renderCalendar() {
        const [events, tasks, academic, githubConfig] = await Promise.all([
            api.events.get(),
            api.tasks.get(),
            api.academic.get(),
            api.githubConfig().catch(() => ({ configured: false, username: '' }))
        ]);
        const days = calendarMode === 'month' ? monthDays(calendarDate) : calendarMode === 'week' ? weekDays(calendarDate) : [calendarDate];
        const academicItems = academic.filter(item => academicFilter === 'ALL' || item.event_type === academicFilter).map(item => ({ ...item, calendarDate: (item.start_at || item.due_date || '').slice(0, 10), calendarType: 'academic' }));
        const localItems = events.map(item => ({ ...item, calendarDate: (item.start || '').slice(0, 10), calendarType: 'local' }));
        const eventCard = item => `<div class="calendar-event ${item.calendarType === 'academic' ? 'academic-event' : ''}"><strong>${esc(item.title)}</strong><small>${esc(item.event_type || 'EVENT')} · ${esc(item.duration_minutes ? `${item.duration_minutes} min` : (item.start || '').slice(11, 16))}</small>${item.course_name || item.course ? `<small>${esc(item.course_name || item.course)}</small>` : ''}${safeUrl(item.url) ? `<a href="${esc(safeUrl(item.url))}" target="_blank" rel="noreferrer">Open event ↗</a>` : ''}${item.calendarType === 'academic' ? `<button class="icon-button" data-academic-dismiss="${item.id}" title="Dismiss">×</button>` : ''}</div>`;
        const cardsFor = date => [...localItems, ...academicItems].filter(item => item.calendarDate === date).map(eventCard).join('') || '<div class="calendar-empty">Open time</div>';
        
        const githubCalendarSection = `
        <div class="panel github-calendar-panel" style="margin-top: 24px;">
            <div class="eyebrow">GitHub Activity</div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px; flex-wrap:wrap; gap:8px;">
                <h2 style="margin:0;">GitHub Contribution Calendar</h2>
                <div style="display:flex; align-items:center; gap:8px;">
                    <span class="item-meta">${githubConfig.configured ? `Account: <strong>@${esc(githubConfig.username)}</strong>` : 'No username set'}</span>
                    <button class="button secondary" data-enhanced-action="github-user" style="padding:4px 10px; font-size:12px;">${githubConfig.configured ? 'Change' : 'Set username'}</button>
                </div>
            </div>
            ${githubConfig.configured ? `
            <div class="github-graph-scroll-wrap" style="position:relative; width:100%; overflow-x:auto; overflow-y:hidden; -webkit-overflow-scrolling:touch; border-radius:8px; background:#0d1117; border:1px solid var(--border); padding:16px 8px; min-height:190px;">
                <div id="github-graph-loading" class="item-meta" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); z-index:1; color:#8b949e; text-align:center;">
                    Loading GitHub contribution calendar...
                </div>
                <div style="min-width:760px; max-width:880px; margin:0 auto; position:relative;">
                    <iframe 
                        id="github-contributions-iframe"
                        src="${esc(githubConfig.endpoint)}"
                        title="GitHub Contribution Calendar for ${esc(githubConfig.username)}"
                        width="100%"
                        height="190"
                        loading="lazy"
                        frameborder="0"
                        scrolling="no"
                        sandbox="allow-scripts allow-same-origin"
                        style="display:block; border:none; width:100%; height:190px; pointer-events:none; background:transparent;"
                        onload="const l=document.getElementById('github-graph-loading'); if(l) l.style.display='none';"
                        onerror="const l=document.getElementById('github-graph-loading'); if(l) l.textContent='Failed to load GitHub contribution calendar.';"
                    ></iframe>
                </div>
            </div>
            <p class="item-meta" style="margin: 10px 0 0 0; font-size:12px;">
                Embedded via <a href="https://github.com/codeadamca/github-contributions" target="_blank" rel="noreferrer" style="color:inherit; text-decoration:underline;">codeadamca/github-contributions</a> · Read-only contribution graph for @${esc(githubConfig.username)}
            </p>
            ` : `
            <div class="empty" style="padding:28px 16px; text-align:center;">
                <p>No GitHub username configured.</p>
                <button class="button" data-enhanced-action="github-user">Set GitHub Username</button>
                <p class="item-meta" style="margin-top:8px;">Or set <code>GITHUB_USERNAME=your_username</code> in <code>.env</code>.</p>
            </div>
            `}
        </div>`;

        document.querySelector('#view').innerHTML = `${header('Calendar', 'Plan the shape of your time', '<button class="button" data-enhanced-action="event">+ Add event</button>')}<div class="view-switcher"><button class="button secondary" data-calendar-shift="-1">←</button><strong>${calendarDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</strong><button class="button secondary" data-calendar-shift="1">→</button>${['day', 'week', 'month'].map(mode => `<button class="button ${calendarMode === mode ? '' : 'secondary'}" data-calendar-mode="${mode}">${mode}</button>`).join('')}<select data-academic-filter><option value="ALL">All academic events</option><option value="LIVE_EVENT">Live events</option><option value="DEADLINE">Deadlines</option><option value="ASSIGNMENT">Assignments</option><option value="QUIZ">Quizzes</option><option value="PEER_REVIEW">Peer reviews</option></select></div><div class="calendar-grid ${calendarMode}">${days.map(dayItem => { const iso = dayItem.toISOString().slice(0, 10); return `<div class="calendar-day ${iso === selectedCalendarDate ? 'selected' : ''}" tabindex="0" data-calendar-date="${iso}"><div class="eyebrow">${dayItem.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div>${cardsFor(iso)}</div>`; }).join('')}</div><div class="panel"><div class="eyebrow">Selected date · ${esc(selectedCalendarDate)}</div>${cardsFor(selectedCalendarDate)}${tasks.filter(item => item.due_date === selectedCalendarDate).map(taskItem).join('') || '<div class="empty">No scheduled tasks.</div>'}</div>${githubCalendarSection}`;
        document.querySelector('[data-academic-filter]').value = academicFilter;
        bindEnhanced();
    }
    function weekDays(date) { const start = new Date(date); start.setDate(date.getDate() - date.getDay()); return Array.from({ length: 7 }, (_, index) => { const value = new Date(start); value.setDate(start.getDate() + index); return value; }); }
    function monthDays(date) { const start = new Date(date.getFullYear(), date.getMonth(), 1); const end = new Date(date.getFullYear(), date.getMonth() + 1, 0); return Array.from({ length: end.getDate() }, (_, index) => new Date(start.getFullYear(), start.getMonth(), index + 1)); }

    async function renderEnhancedFocus() { const tasks = await api.tasks.get(); const active = focusSession?.task_id ? tasks.find(task => task.id === focusSession.task_id) : state.dashboard?.recommendation || tasks.find(task => task.status !== 'COMPLETED'); document.querySelector('#view').innerHTML = `${header('Focus mode', 'One thing at a time', '')}<div class="panel featured focus-panel"><div class="eyebrow">Current task</div><h2>${esc(active?.title || 'Choose a task')}</h2><div class="stat" id="focus-timer">${formatSeconds(focusSeconds || (active?.estimated_minutes || 25) * 60)}</div><p>${active ? `${active.estimated_minutes || 25} minutes · ${active.priority} priority` : 'Create a task first.'}</p><select id="focus-task">${tasks.filter(task => task.status !== 'COMPLETED').map(task => `<option value="${task.id}" ${active?.id === task.id ? 'selected' : ''}>${esc(task.title)}</option>`).join('')}</select><div class="focus-actions"><button class="button" data-enhanced-action="focus-start" ${active ? '' : 'disabled'}>${focusSession ? 'Pause' : 'Start'}</button><button class="button secondary" data-enhanced-action="focus-complete" ${focusSession ? '' : 'disabled'}>Complete</button></div></div>`; bindEnhanced(); }
    function formatSeconds(seconds) { return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }

    async function renderEnhancedSettings() {
        const integrations = await api.integrations();
        const google = await api.googleStatus();
        const autoSync = await api.autoSyncStatus().catch(() => ({ enabled: true, interval_minutes: 60, status: 'idle' }));
        const googleItem = integrations.items.find(item => item.provider === 'google');
        const googleDetail = google.connected ? `Last synced: ${esc(google.last_synced_at || 'Never')} · ${google.calendar_count} calendar events · ${google.gmail_count} Gmail messages · ${google.enabled_gmail_contacts} enabled Gmail contacts${google.last_sync_error ? ` · Error: ${esc(google.last_sync_error)}` : ''}` : 'Not connected';
        const hasConnected = integrations.items.some(item => item.connected);
        const autoSyncStatusText = autoSync.enabled
            ? `Active · Syncs every hour (60 min)${autoSync.last_run_at ? ` · Last run: ${new Date(autoSync.last_run_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}${autoSync.next_run_at ? ` · Next: ${new Date(autoSync.next_run_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}`
            : 'Paused';

        document.querySelector('#view').innerHTML = `${header('Settings', 'Make it yours', '')}<div class="cards-grid"><div class="panel"><div class="eyebrow">Appearance</div><h2>Theme</h2><p class="item-meta">Persisted on this device.</p><select id="theme-select"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></div><div class="panel"><div class="eyebrow">Connections</div><div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; gap:8px; flex-wrap:wrap"><div><h2 style="margin:0">Official integrations</h2><p class="item-meta" style="margin:4px 0 0 0">Auto-sync: <strong>${esc(autoSyncStatusText)}</strong></p></div>${hasConnected ? `<button class="button secondary" data-sync-all style="white-space:nowrap">Sync All Connected</button>` : ''}</div><div class="list-row"><div class="row-main"><div class="item-title">Google</div><div class="item-meta">Calendar + Gmail · ${esc(googleDetail)}</div></div>${google.connected ? `<button class="button secondary" data-sync="google">Sync Now</button><button class="button secondary" data-disconnect="google">Disconnect</button>` : `<button class="button secondary" data-connect="google">${googleItem?.configured ? 'Connect Google' : 'Configure'}</button>`}</div>${integrations.items.filter(item => item.provider !== 'google').map(item => `<div class="list-row"><div class="row-main"><div class="item-title">${esc(item.name)}</div><div class="item-meta">${esc(item.access)} · ${item.configured ? 'Needs provider implementation' : 'Needs configuration'}</div></div></div>`).join('')}</div><div class="panel"><div class="eyebrow">Gmail privacy</div><h2>Important contacts</h2><p class="item-meta">Only enabled Gmail contacts are included in sync. The full inbox is never scanned.</p><button class="button" data-enhanced-action="gmail-contact">Add Gmail contact</button></div><div class="panel"><div class="eyebrow">Academic preferences</div><h2>Study calendar</h2><label class="setting-toggle"><input type="checkbox" data-pref="academic_today" checked> Show deadlines on Today</label><label class="setting-toggle"><input type="checkbox" data-pref="academic_calendar" checked> Show events on Calendar</label><label class="setting-toggle"><input type="checkbox" data-pref="academic_tasks"> Create tasks from deadlines</label><button class="button" data-enhanced-action="academic-import">Import ICS / calendar URL</button></div></div>`;
        document.querySelector('#theme-select').value = state.theme;
        document.querySelector('#theme-select').onchange = event => setTheme(event.target.value);
        bindEnhanced();
    }

    function academicImportModal() { document.querySelector('#modal-content').innerHTML = `<div class="modal-inner"><div class="eyebrow">Academic calendar</div><h2>Import your schedule</h2><form id="academic-import-form"><div class="field"><label>Calendar URL</label><input name="url" type="url" placeholder="https://.../calendar.ics"></div><div class="field"><label>Or upload an ICS file</label><input name="file" type="file" accept=".ics,text/calendar"></div><div class="field"><label>Or paste ICS content</label><textarea name="content" placeholder="BEGIN:VCALENDAR"></textarea></div><div class="form-grid"><div class="field"><label>Manual title</label><input name="title"></div><div class="field"><label>Course</label><input name="course"></div><div class="field"><label>Due date</label><input name="due_date" type="date"></div></div><div class="form-actions"><button type="button" class="button secondary" onclick="document.querySelector('#modal').close()">Cancel</button><button class="button">Import</button></div></form></div>`; document.querySelector('#modal').showModal(); document.querySelector('#academic-import-form').onsubmit = async event => { event.preventDefault(); const form = event.currentTarget; const data = Object.fromEntries(new FormData(form)); try { if (form.file.files[0]) data.content = await form.file.files[0].text(); if (data.url) await api.importAcademicUrl({ url: data.url, course: data.course }); else await api.importAcademic({ ...data, type: data.content ? 'ics' : 'manual' }); document.querySelector('#modal').close(); toast('Academic calendar imported'); enhancedRender(); } catch (error) { toast(error.message, true); } }; }

    function editModal(type, item) { const collection = type === 'academic_events' ? 'academic' : type; const fields = type === 'tasks' ? [{ name: 'title', label: 'Title', required: true, value: item.title }, { name: 'priority', label: 'Priority', value: item.priority }, { name: 'due_date', label: 'Due date', type: 'date', value: item.due_date }, { name: 'due_time', label: 'Due time', type: 'time', value: item.due_time }, { name: 'estimated_minutes', label: 'Minutes', type: 'number', value: item.estimated_minutes }, { name: 'description', label: 'Description', type: 'textarea', full: true, value: item.description }] : [{ name: 'title', label: 'Title', required: true, value: item.title || item.name || item.sender }, { name: 'description', label: 'Description', type: 'textarea', full: true, value: item.description || item.preview }]; modal('Edit item', fields, 'Save changes', data => api[collection].update(item.id, data)); }

    function bindEnhanced() {
        document.querySelectorAll('[data-enhanced-action]').forEach(button => button.onclick = async () => { const actionName = button.dataset.enhancedAction; if (actionName === 'retry') return enhancedRender(); if (actionName === 'academic-import') return academicImportModal(); if (actionName === 'focus') return state.section = 'focus', enhancedRender(); if (actionName === 'github-user') { const config = await api.githubConfig(); return modal('GitHub Account', [{ name: 'username', label: 'GitHub Username', required: true, value: config.username || '' }], 'Save Username', async data => { await api.updateGithubConfig({ username: data.username.trim() }); toast('GitHub username updated'); renderCalendar(); }); } if (actionName === 'focus-start') { const select = document.querySelector('#focus-task'); if (focusSession) { clearInterval(focusTimer); focusTimer = null; focusSession = null; } else { focusSession = await api.startFocus(select.value); focusSeconds = Number(select.selectedOptions[0]?.dataset?.minutes || 1500); focusTimer = setInterval(() => { focusSeconds = Math.max(0, focusSeconds - 1); const timer = document.querySelector('#focus-timer'); if (timer) timer.textContent = formatSeconds(focusSeconds); }, 1000); } return renderEnhancedFocus(); } if (actionName === 'focus-complete' && focusSession) { await api.finishFocus(focusSession.id, { duration: Math.max(0, 1500 - focusSeconds), completed: true }); await api.completeTask(focusSession.task_id, true); focusSession = null; clearInterval(focusTimer); toast('Focus session completed'); return enhancedRender(); } if (actionName === 'event') return modal('Add calendar event', [{ name: 'title', label: 'Title', required: true }, { name: 'start', label: 'Start', type: 'datetime-local' }, { name: 'end', label: 'End', type: 'datetime-local' }, { name: 'description', label: 'Description', type: 'textarea', full: true }], 'Create event', data => api.events.create(data)); if (actionName === 'academic') return modal('Add academic event', [{ name: 'title', label: 'Title', required: true }, { name: 'course', label: 'Course' }, { name: 'due_date', label: 'Due date', type: 'date' }], 'Create event', data => api.importAcademic(data)); return action(actionName); });
        document.querySelectorAll('[data-enhanced-complete]').forEach(button => button.onclick = async () => { await api.completeTask(button.dataset.enhancedComplete, !button.classList.contains('done')); enhancedRender(); });
        document.querySelectorAll('[data-enhanced-delete]').forEach(button => button.onclick = async () => { const [type, id] = button.dataset.enhancedDelete.split(':'); await api[type === 'academic_events' ? 'academic' : type].remove(id); toast('Deleted'); enhancedRender(); });
        document.querySelectorAll('[data-message-read]').forEach(button => button.onclick = async () => { await api.markMessageRead(button.dataset.messageRead, button.textContent === 'Read'); enhancedRender(); });
        document.querySelectorAll('[data-message-important]').forEach(button => button.onclick = async () => { await api.markMessageImportant(button.dataset.messageImportant, button.textContent === 'Important'); enhancedRender(); });
        document.querySelectorAll('[data-notification-read]').forEach(button => button.onclick = async () => { await api.markNotificationRead(button.dataset.notificationRead, button.textContent === 'Read'); enhancedRender(); });
        document.querySelectorAll('[data-notification-dismiss]').forEach(button => button.onclick = async () => { await api.dismissNotification(button.dataset.notificationDismiss); enhancedRender(); });
        document.querySelectorAll('[data-academic-dismiss]').forEach(button => button.onclick = async () => { await api.dismissAcademic(button.dataset.academicDismiss); toast('Academic event dismissed'); enhancedRender(); });
        document.querySelectorAll('[data-enhanced-edit]').forEach(button => button.onclick = async () => { const [type, id] = button.dataset.enhancedEdit.split(':'); const collection = type === 'academic_events' ? 'academic' : type; const item = await api[collection].get().then(items => items.find(value => value.id === id)); if (item) editModal(type, item); });
        document.querySelectorAll('[data-calendar-mode]').forEach(button => button.onclick = () => { calendarMode = button.dataset.calendarMode; renderCalendar(); });
        document.querySelectorAll('[data-calendar-shift]').forEach(button => button.onclick = () => {
            const amount = Number(button.dataset.calendarShift);
            if (calendarMode === 'day') calendarDate.setDate(calendarDate.getDate() + amount);
            if (calendarMode === 'week') calendarDate.setDate(calendarDate.getDate() + (amount * 7));
            if (calendarMode === 'month') calendarDate.setMonth(calendarDate.getMonth() + amount);
            selectedCalendarDate = calendarDate.toISOString().slice(0, 10);
            renderCalendar();
        });
        document.querySelectorAll('[data-calendar-date]').forEach(button => button.onclick = () => { selectedCalendarDate = button.dataset.calendarDate; renderCalendar(); });
        document.querySelectorAll('[data-academic-filter]').forEach(select => select.onchange = () => { academicFilter = select.value; renderCalendar(); });
        document.querySelectorAll('[data-connect]').forEach(button => button.onclick = async () => { try { const result = await api.oauthStart(button.dataset.connect.includes('google') ? 'google' : button.dataset.connect); window.location.href = result.authorization_url; } catch (error) { toast(error.message, true); } });
        document.querySelectorAll('[data-sync]').forEach(button => button.onclick = async () => { try { const result = await api.syncIntegration(button.dataset.sync); toast(`Synced ${result.calendar_synced} calendar events and ${result.gmail_synced} messages`); await renderEnhancedSettings(); } catch (error) { toast(error.message, true); } });
        document.querySelectorAll('[data-sync-all]').forEach(button => button.onclick = async () => {
            const originalText = button.textContent;
            try {
                button.disabled = true;
                button.textContent = 'Syncing...';
                const result = await api.syncAll();
                toast(`Synced ${result.calendar_synced || 0} calendar events and ${result.gmail_synced || 0} messages`);
                await renderEnhancedSettings();
            } catch (error) {
                toast(error.message, true);
            } finally {
                button.disabled = false;
                button.textContent = originalText;
            }
        });
        document.querySelectorAll('[data-disconnect]').forEach(button => button.onclick = async () => { await api.disconnectIntegration(button.dataset.disconnect); toast('Integration disconnected'); renderEnhancedSettings(); });
        const filter = document.querySelector('#task-filter'); const status = document.querySelector('#task-status'); if (filter) { const apply = async () => { const items = await api.tasks.get(); const filtered = items.filter(item => (!filter.value || JSON.stringify(item).toLowerCase().includes(filter.value.toLowerCase())) && (!status.value || item.status === status.value)); document.querySelector('#task-list').innerHTML = filtered.map(taskItem).join('') || empty('No tasks match this filter.'); bindEnhanced(); }; filter.oninput = apply; status.onchange = apply; }
    }

    document.addEventListener('click', event => {
        const button = event.target.closest('[data-enhanced-action="gmail-contact"]');
        if (!button) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        modal('Add Gmail contact', [{ name: 'contact_name', label: 'Name', required: true }, { name: 'email', label: 'Email', type: 'email', required: true }, { name: 'platform', label: 'Platform', value: 'Gmail' }], 'Save contact', data => api.contacts.create({ ...data, enabled: true }));
    }, true);

    window.addEventListener('load', () => { render = enhancedRender; enhancedRender(); });
})();
