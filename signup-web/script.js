document.addEventListener('DOMContentLoaded', () => {
    // =========================================
    // ELEMENT REFERENCES
    // =========================================
    const togglePasswordBtn = document.getElementById('togglePasswordVisibility');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const eyeIcon = document.getElementById('eyeIcon');
    const signupForm = document.getElementById('signupForm');
    const submitBtn = document.getElementById('submitBtn');
    const signupPage = document.getElementById('signupPage');
    const dashboardPage = document.getElementById('dashboardPage');
    const logoutBtn = document.getElementById('logoutBtn');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const avatarInitials = document.getElementById('avatarInitials');
    const calendarGrid = document.getElementById('calendarGrid');
    const calMonthLabel = document.getElementById('calMonthLabel');
    const calPrev = document.getElementById('calPrev');
    const calNext = document.getElementById('calNext');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const darkModeIcon = document.getElementById('darkModeIcon');
    const pageTitle = document.getElementById('pageTitle');

    // Auth toggle elements
    const loginForm = document.getElementById('loginForm');
    const showLoginLink = document.getElementById('showLoginLink');
    const showSignupLink = document.getElementById('showSignupLink');
    const signupSection = document.getElementById('signupSection');
    const loginSection = document.getElementById('loginSection');

    // Dashboard content sections
    const dashboardContent = document.querySelector('.dashboard-content:not(.profile-content):not(.todo-content):not(.focus-content):not(.habits-content):not(.contact-content)');
    const profileContent = document.getElementById('profileContent');
    const todoContent = document.getElementById('todoContent');
    const focusContent = document.getElementById('focusContent');
    const habitsContent = document.getElementById('habitsContent');
    const contactContent = document.getElementById('contactContent');
    const contactForm = document.getElementById('contactForm');

    // Profile elements
    const profileAvatarInitials = document.getElementById('profileAvatarInitials');
    const profilePicInitials = document.getElementById('profilePicInitials');
    const profileUserName = document.getElementById('profileUserName');
    const profileFirstName = document.getElementById('profileFirstName');
    const profileLastName = document.getElementById('profileLastName');
    const profileEmail = document.getElementById('profileEmail');

    // =========================================
    // ACCOUNT MANAGEMENT (localStorage)
    // =========================================
    function getAccounts() {
        try { return JSON.parse(localStorage.getItem('ctrl-accounts') || '[]'); }
        catch(e) { return []; }
    }

    function saveAccounts(accounts) {
        localStorage.setItem('ctrl-accounts', JSON.stringify(accounts));
    }

    function getUserKey(email) {
        return 'ctrl-user-' + email.toLowerCase().trim();
    }

    function getSession() {
        return localStorage.getItem('ctrl-session');
    }

    function setSession(email) {
        localStorage.setItem('ctrl-session', email.toLowerCase().trim());
    }

    function clearSessionStorage() {
        localStorage.removeItem('ctrl-session');
    }

    // =========================================
    // USER STATE
    // =========================================
    let userData = {
        firstName: '',
        lastName: '',
        email: '',
        initials: '',
        profilePhoto: null
    };

    let currentActivePage = 'dashboard';

    // =========================================
    // TOAST NOTIFICATION SYSTEM
    // =========================================
    const notifications = [];

    function showToast(type, title, message, duration) {
        duration = duration || 4000;
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const iconMap = {
            welcome: 'ph-hand-waving',
            success: 'ph-check-circle',
            focus: 'ph-person-simple-tai-chi',
            info: 'ph-info',
            logout: 'ph-sign-out'
        };

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `
            <div class="toast-icon ${type}"><i class="ph ${iconMap[type] || 'ph-bell'}"></i></div>
            <div class="toast-body">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="this.closest('.toast').classList.add('toast-exit'); setTimeout(() => this.closest('.toast')?.remove(), 350);">
                <i class="ph ph-x"></i>
            </button>
        `;
        container.appendChild(toast);

        // Add to notification panel
        addNotification(type, title, message);

        // Auto-remove
        setTimeout(() => {
            if (toast.parentNode) {
                toast.classList.add('toast-exit');
                setTimeout(() => toast.remove(), 350);
            }
        }, duration);
    }

    function addNotification(type, title, message) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        notifications.unshift({ type, title, message, time: timeStr });
        if (notifications.length > 20) notifications.pop();
        renderNotifPanel();
        updateNotifBadge();
    }

    function renderNotifPanel() {
        const list = document.getElementById('notifPanelList');
        if (!list) return;
        if (notifications.length === 0) {
            list.innerHTML = '<div class="notif-panel-empty"><i class="ph ph-bell-slash"></i><p>No notifications yet</p></div>';
            return;
        }
        const iconMap = {
            welcome: 'ph-hand-waving',
            success: 'ph-check-circle',
            focus: 'ph-person-simple-tai-chi',
            info: 'ph-info',
            logout: 'ph-sign-out'
        };
        list.innerHTML = notifications.map(n => `
            <div class="notif-item">
                <div class="notif-item-icon ${n.type}"><i class="ph ${iconMap[n.type] || 'ph-bell'}"></i></div>
                <div class="notif-item-body">
                    <div class="notif-item-title">${n.title}</div>
                    <div class="notif-item-text">${n.message}</div>
                </div>
                <span class="notif-item-time">${n.time}</span>
            </div>
        `).join('');
    }

    function updateNotifBadge() {
        const badge = document.getElementById('notifBadge');
        if (!badge) return;
        if (notifications.length > 0) {
            badge.style.display = 'flex';
            badge.textContent = notifications.length;
        } else {
            badge.style.display = 'none';
        }
    }

    // Notification bell panel toggle
    const notifBtn = document.getElementById('notifBtn');
    const notifPanel = document.getElementById('notifPanel');
    const notifOverlay = document.getElementById('notifOverlay');
    const notifClearBtn = document.getElementById('notifClearBtn');

    if (notifBtn && notifPanel && notifOverlay) {
        notifBtn.addEventListener('click', () => {
            notifPanel.classList.toggle('active');
            notifOverlay.classList.toggle('active');
        });
        notifOverlay.addEventListener('click', () => {
            notifPanel.classList.remove('active');
            notifOverlay.classList.remove('active');
        });
    }
    if (notifClearBtn) {
        notifClearBtn.addEventListener('click', () => {
            notifications.length = 0;
            renderNotifPanel();
            updateNotifBadge();
        });
    }

    // =========================================
    // FOCUS MODE STATE
    // =========================================
    const focusState = {
        mode: 'pomodoro',
        isRunning: false,
        timeLeft: 25 * 60,
        totalTime: 25 * 60,
        interval: null,
        currentSession: 1,
        totalSessions: 4,
        sessionsCompleted: 0,
        totalFocusSeconds: 0,
        bestDaySeconds: 0,
        streak: 0,
        history: [],
        settings: {
            focusDuration: 25,
            shortBreak: 5,
            longBreak: 15,
            autoStartBreaks: false,
            soundAlert: true
        }
    };

    // =========================================
    // HABIT TRACKER STATE
    // =========================================
    const habitsState = {
        habits: [],
        // Each habit: { id, name, category, frequency, goal, reminder, color, createdAt, completions: { 'YYYY-MM-DD': true }, streak: 0, bestStreak: 0 }
        weekOffset: 0
    };

    // =========================================
    // DATA PERSISTENCE
    // =========================================
    function serializeTodos() {
        const cards = document.querySelectorAll('.todo-cards-grid .todo-card');
        const todos = [];
        cards.forEach(card => {
            const titleEl = card.querySelector('.todo-card-title');
            const descEl = card.querySelector('.todo-card-desc');
            const timeEl = card.querySelector('.todo-time');
            todos.push({
                id: card.dataset.id || Date.now().toString(),
                title: titleEl ? titleEl.textContent : '',
                description: descEl ? descEl.textContent : '',
                date: timeEl ? timeEl.textContent.trim() : '',
                status: card.dataset.status || 'open'
            });
        });
        return todos;
    }

    function deserializeTodos(todos) {
        const grid = document.querySelector('.todo-cards-grid');
        if (!grid || !todos) return;
        grid.innerHTML = '';
        todos.forEach(todo => {
            const card = document.createElement('div');
            card.className = 'todo-card todo-card-small';
            card.dataset.status = todo.status;
            card.dataset.id = todo.id;
            const isChecked = todo.status === 'closed' ? 'checked' : '';
            const badgeClass = todo.status;
            const badgeText = todo.status.charAt(0).toUpperCase() + todo.status.slice(1);
            const timeHtml = todo.date ? `<div class="todo-time" style="margin-bottom: 8px;"><i class="ph ph-clock"></i> ${todo.date}</div>` : '';
            const descHtml = todo.description ? `<div class="todo-card-desc" style="margin-top: 4px;">${todo.description}</div>` : '';
            card.innerHTML = `
                <div class="todo-card-top">
                    <label class="todo-checkbox">
                        <input type="checkbox" ${isChecked}>
                        <span class="todo-checkmark"><i class="ph ph-check"></i></span>
                    </label>
                    <div class="todo-card-info">
                        <div class="todo-card-title">${todo.title}</div>
                        ${descHtml}
                        <span class="todo-status-badge ${badgeClass}">${badgeText}</span>
                    </div>
                </div>
                <div class="todo-card-bottom">
                    <div>
                        ${timeHtml}
                        <div class="todo-card-actions">
                            <button class="todo-action-btn" title="Edit"><i class="ph ph-pencil-simple"></i></button>
                            <button class="todo-action-btn todo-action-delete" title="Delete"><i class="ph ph-trash"></i></button>
                        </div>
                    </div>
                    <div class="todo-avatars">
                        <div class="todo-avatar" style="background:#6B4CE6;">${userData.initials ? userData.initials[0] : 'U'}</div>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
        attachDeleteEvents();
        attachCheckboxEvents();
        updateTodoCounts();
    }

    function saveAllUserData() {
        const email = getSession();
        if (!email) return;
        const data = {
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            initials: userData.initials,
            profilePhoto: userData.profilePhoto || null,
            activePage: currentActivePage,
            todos: serializeTodos(),
            focusData: {
                settings: focusState.settings,
                sessionsCompleted: focusState.sessionsCompleted,
                totalFocusSeconds: focusState.totalFocusSeconds,
                bestDaySeconds: focusState.bestDaySeconds,
                streak: focusState.streak,
                history: focusState.history.slice(0, 20),
                currentSession: focusState.currentSession
            },
            habitsData: habitsState.habits
        };
        localStorage.setItem(getUserKey(email), JSON.stringify(data));
    }

    function loadAllUserData() {
        const email = getSession();
        if (!email) return null;
        try {
            const raw = localStorage.getItem(getUserKey(email));
            return raw ? JSON.parse(raw) : null;
        } catch(e) { return null; }
    }

    function applyLoadedData(data) {
        if (!data) return;
        // User data
        userData.firstName = data.firstName || '';
        userData.lastName = data.lastName || '';
        userData.email = data.email || '';
        userData.initials = data.initials || '';
        userData.profilePhoto = data.profilePhoto || null;
        currentActivePage = data.activePage || 'dashboard';

        // Update avatars
        if (avatarInitials) avatarInitials.textContent = userData.initials;

        // Load profile photo
        if (userData.profilePhoto) {
            applyProfilePhoto(userData.profilePhoto);
        }

        // Load focus data
        if (data.focusData) {
            Object.assign(focusState.settings, data.focusData.settings || {});
            focusState.sessionsCompleted = data.focusData.sessionsCompleted || 0;
            focusState.totalFocusSeconds = data.focusData.totalFocusSeconds || 0;
            focusState.bestDaySeconds = data.focusData.bestDaySeconds || 0;
            focusState.streak = data.focusData.streak || 0;
            focusState.history = data.focusData.history || [];
            focusState.currentSession = data.focusData.currentSession || 1;
        }

        // Load todos
        if (data.todos && data.todos.length > 0) {
            deserializeTodos(data.todos);
        }

        // Load habits
        if (data.habitsData) {
            habitsState.habits = data.habitsData;
        }
    }

    // =========================================
    // PAGE NAVIGATION (Signup <-> Dashboard)
    // =========================================
    function showPage(pageId) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(pageId).classList.add('active');
    }

    // =========================================
    // SECTION NAVIGATION
    // =========================================
    function hideAllSections() {
        if (dashboardContent) dashboardContent.style.display = 'none';
        if (profileContent) profileContent.style.display = 'none';
        if (todoContent) todoContent.style.display = 'none';
        if (focusContent) focusContent.style.display = 'none';
        if (habitsContent) habitsContent.style.display = 'none';
        if (contactContent) contactContent.style.display = 'none';
    }

    function showSection(section, skipSave) {
        hideAllSections();
        currentActivePage = section;

        // Update sidebar nav
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(i => i.classList.remove('active'));
        const navItem = document.querySelector(`.sidebar-nav .nav-item[data-page="${section}"]`);
        if (navItem) navItem.classList.add('active');

        if (section === 'dashboard') {
            if (dashboardContent) dashboardContent.style.display = '';
            pageTitle.textContent = 'Dashboard';
            document.title = 'Dashboard - CTRL';
        } else if (section === 'profile') {
            if (profileContent) profileContent.style.display = '';
            pageTitle.textContent = 'Profile';
            document.title = 'Profile - CTRL';
            syncProfileData();
        } else if (section === 'todo') {
            if (todoContent) todoContent.style.display = '';
            pageTitle.textContent = 'To-Do List';
            document.title = 'To-Do List - CTRL';
            updateTodoDate();
            updateTodoCounts();
        } else if (section === 'focus') {
            if (focusContent) focusContent.style.display = '';
            pageTitle.textContent = 'Focus Mode';
            document.title = 'Focus Mode - CTRL';
        } else if (section === 'habits') {
            if (habitsContent) habitsContent.style.display = '';
            pageTitle.textContent = 'Habit Tracker';
            document.title = 'Habit Tracker - CTRL';
            renderHabitsPage();
        } else if (section === 'contact') {
            if (contactContent) contactContent.style.display = '';
            pageTitle.textContent = 'Contact';
            document.title = 'Contact - CTRL';
        }

        if (!skipSave) saveAllUserData();
    }

    function syncProfileData() {
        if (profileFirstName) profileFirstName.value = userData.firstName;
        if (profileLastName) profileLastName.value = userData.lastName;
        if (profileEmail) profileEmail.value = userData.email;
        if (profileUserName) profileUserName.textContent = `${userData.firstName} ${userData.lastName}`.trim() || 'User Name';
        if (profileAvatarInitials) profileAvatarInitials.textContent = userData.initials;
        if (profilePicInitials) profilePicInitials.textContent = userData.initials;
        updateProductivityStats();
    }

    // =========================================
    // DARK MODE
    // =========================================
    function setDarkMode(isDark) {
        if (isDark) {
            document.documentElement.setAttribute('data-theme', 'dark');
            darkModeIcon.classList.remove('ph-sun');
            darkModeIcon.classList.add('ph-moon');
            localStorage.setItem('ctrl-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
            darkModeIcon.classList.remove('ph-moon');
            darkModeIcon.classList.add('ph-sun');
            localStorage.setItem('ctrl-theme', 'light');
        }
    }

    const savedTheme = localStorage.getItem('ctrl-theme');
    if (savedTheme === 'dark') setDarkMode(true);

    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            setDarkMode(!isDark);
        });
    }

    // =========================================
    // AUTH: Toggle Signup <-> Login
    // =========================================
    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (signupSection) signupSection.style.display = 'none';
            if (loginSection) loginSection.style.display = '';
        });
    }

    if (showSignupLink) {
        showSignupLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (loginSection) loginSection.style.display = 'none';
            if (signupSection) signupSection.style.display = '';
        });
    }

    // =========================================
    // SIGNUP: Toggle password visibility
    // =========================================
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', () => {
            const type = confirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            confirmPasswordInput.setAttribute('type', type);
            if (type === 'text') {
                eyeIcon.classList.remove('ph-eye-slash');
                eyeIcon.classList.add('ph-eye');
                eyeIcon.style.color = 'var(--primary)';
            } else {
                eyeIcon.classList.remove('ph-eye');
                eyeIcon.classList.add('ph-eye-slash');
                eyeIcon.style.color = 'var(--text-secondary)';
            }
        });
    }

    // =========================================
    // SIGNUP: Handle form submission
    // =========================================
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const firstName = document.getElementById('firstName').value.trim();
            const lastName = document.getElementById('lastName').value.trim();
            const emailVal = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = confirmPasswordInput.value;

            if (password !== confirmPassword) {
                alert("Passwords do not match!");
                return;
            }

            // Check if account already exists
            const accounts = getAccounts();
            const emailLower = emailVal.toLowerCase().trim();
            if (accounts.find(a => a.email === emailLower)) {
                alert("An account with this email already exists. Please log in instead.");
                return;
            }

            // Register new account
            accounts.push({ email: emailLower, password, firstName, lastName });
            saveAccounts(accounts);

            // Create user data
            const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
            userData = { firstName, lastName, email: emailLower, initials };
            currentActivePage = 'dashboard';

            // Set session
            setSession(emailLower);

            // Save initial user data
            saveAllUserData();

            // Update avatar
            if (avatarInitials) avatarInitials.textContent = initials;

            // Simulate loading
            const originalText = submitBtn.innerText;
            submitBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Creating...';
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.7';
            submitBtn.style.cursor = 'not-allowed';

            setTimeout(() => {
                submitBtn.innerHTML = '<i class="ph ph-check-circle"></i> Success!';
                submitBtn.style.backgroundColor = '#28a745';
                setTimeout(() => {
                    enterDashboard('dashboard');
                    showToast('welcome', 'Welcome \uD83D\uDC4B', `Welcome, ${firstName}! Ready to control your day?`);
                    signupForm.reset();
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                    submitBtn.style.opacity = '1';
                    submitBtn.style.cursor = 'pointer';
                    submitBtn.style.backgroundColor = 'var(--primary)';
                }, 1000);
            }, 1500);
        });
    }

    // =========================================
    // LOGIN: Handle form submission
    // =========================================
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const emailVal = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;

            const accounts = getAccounts();
            const emailLower = emailVal.toLowerCase().trim();
            const account = accounts.find(a => a.email === emailLower && a.password === password);

            if (!account) {
                alert("Invalid email or password. Please try again.");
                return;
            }

            // Set session
            setSession(emailLower);

            // Load existing user data
            const savedData = loadAllUserData();
            if (savedData) {
                applyLoadedData(savedData);
            } else {
                const initials = (account.firstName.charAt(0) + account.lastName.charAt(0)).toUpperCase();
                userData = { firstName: account.firstName, lastName: account.lastName, email: emailLower, initials };
                currentActivePage = 'dashboard';
            }

            if (avatarInitials) avatarInitials.textContent = userData.initials;

            // Animate login
            const loginBtn = document.getElementById('loginSubmitBtn');
            const originalText = loginBtn.innerText;
            loginBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Logging in...';
            loginBtn.disabled = true;
            loginBtn.style.opacity = '0.7';

            setTimeout(() => {
                loginBtn.innerHTML = '<i class="ph ph-check-circle"></i> Welcome!';
                loginBtn.style.backgroundColor = '#28a745';
                setTimeout(() => {
                    enterDashboard(currentActivePage);
                    showToast('welcome', 'Welcome Back \uD83D\uDC4B', `Welcome back, ${userData.firstName}! Let\'s get productive.`);
                    loginForm.reset();
                    loginBtn.innerHTML = originalText;
                    loginBtn.disabled = false;
                    loginBtn.style.opacity = '1';
                    loginBtn.style.backgroundColor = 'var(--primary)';
                }, 800);
            }, 1000);
        });
    }

    // =========================================
    // ENTER DASHBOARD (common helper)
    // =========================================
    function enterDashboard(page) {
        showPage('dashboardPage');
        initFocusMode();
        showSection(page || 'dashboard', true);
        // Update all connected stats
        setTimeout(() => updateProductivityStats(), 100);
    }

    // =========================================
    // LOGOUT
    // =========================================
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Save before logout
            saveAllUserData();

            const userName = userData.firstName || 'User';

            // Stop focus timer if running
            if (focusState.isRunning) stopTimer();

            clearSessionStorage();
            userData = { firstName: '', lastName: '', email: '', initials: '' };
            currentActivePage = 'dashboard';
            notifications.length = 0;

            // Clear todo grid
            const grid = document.querySelector('.todo-cards-grid');
            if (grid) grid.innerHTML = '';

            // Clear habits state
            habitsState.habits = [];
            habitsState.weekOffset = 0;

            // Reset forms
            if (signupSection) signupSection.style.display = '';
            if (loginSection) loginSection.style.display = 'none';

            showPage('signupPage');
            document.title = 'CTRL - Control Your Life';
            showSection('dashboard', true);
            updateNotifBadge();

            showToast('logout', 'Logged Out \uD83D\uDC4B', `Goodbye, ${userName}! See you soon.`);
        });
    }

    // =========================================
    // SIDEBAR: Toggle (mobile)
    // =========================================
    let overlay = null;

    function createOverlay() {
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            document.body.appendChild(overlay);
            overlay.addEventListener('click', closeSidebar);
        }
    }

    function openSidebar() {
        sidebar.classList.add('open');
        createOverlay();
        requestAnimationFrame(() => { overlay.classList.add('active'); });
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
    }

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            if (sidebar.classList.contains('open')) closeSidebar();
            else openSidebar();
        });
    }

    // =========================================
    // SIDEBAR: Navigation -> Sections
    // =========================================
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            if (page === 'profile') showSection('profile');
            else if (page === 'todo') showSection('todo');
            else if (page === 'focus') showSection('focus');
            else if (page === 'habits') showSection('habits');
            else if (page === 'contact') showSection('contact');
            else showSection('dashboard');

            if (window.innerWidth <= 768) closeSidebar();
        });
    });

    // =========================================
    // User avatar click -> Profile
    // =========================================
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar) {
        userAvatar.addEventListener('click', () => {
            showSection('profile');
        });
    }

    // =========================================
    // DASHBOARD: Time filter buttons
    // =========================================
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.dataset.filter;
            const dateRangeText = document.getElementById('dateRangeText');
            const now = new Date();
            const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            switch (filter) {
                case 'day':
                    dateRangeText.textContent = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
                    break;
                case 'week':
                    const weekStart = new Date(now);
                    weekStart.setDate(now.getDate() - now.getDay() + 1);
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekStart.getDate() + 6);
                    dateRangeText.textContent = `${weekStart.getDate()} ${months[weekStart.getMonth()]} – ${weekEnd.getDate()} ${months[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;
                    break;
                case 'month':
                    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                    dateRangeText.textContent = `1 ${months[now.getMonth()]} ${now.getFullYear()} – ${lastDay} ${months[now.getMonth()]} ${now.getFullYear()}`;
                    break;
                case 'year':
                    dateRangeText.textContent = `1 Jan ${now.getFullYear()} – 31 Dec ${now.getFullYear()}`;
                    break;
            }
        });
    });

    // =========================================
    // DASHBOARD: Mini Calendar
    // =========================================
    let calMonth = new Date().getMonth();
    let calYear = new Date().getFullYear();

    function renderCalendar(month, year) {
        const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        calMonthLabel.textContent = `${months[month]} ${year}`;
        calendarGrid.innerHTML = '';
        let firstDay = new Date(year, month, 1).getDay();
        firstDay = firstDay === 0 ? 6 : firstDay - 1;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();
        const today = new Date();
        const isCurrentMonth = (month === today.getMonth() && year === today.getFullYear());

        for (let i = firstDay - 1; i >= 0; i--) {
            const div = document.createElement('div');
            div.className = 'cal-day other-month';
            div.textContent = daysInPrevMonth - i;
            calendarGrid.appendChild(div);
        }
        for (let d = 1; d <= daysInMonth; d++) {
            const div = document.createElement('div');
            div.className = 'cal-day';
            if (isCurrentMonth && d === today.getDate()) div.classList.add('today');
            div.textContent = d;
            calendarGrid.appendChild(div);
        }
        const totalCells = calendarGrid.children.length;
        const remaining = (Math.ceil(totalCells / 7) * 7) - totalCells;
        for (let i = 1; i <= remaining; i++) {
            const div = document.createElement('div');
            div.className = 'cal-day other-month';
            div.textContent = i;
            calendarGrid.appendChild(div);
        }
    }

    if (calPrev) {
        calPrev.addEventListener('click', () => {
            calMonth--;
            if (calMonth < 0) { calMonth = 11; calYear--; }
            renderCalendar(calMonth, calYear);
        });
    }
    if (calNext) {
        calNext.addEventListener('click', () => {
            calMonth++;
            if (calMonth > 11) { calMonth = 0; calYear++; }
            renderCalendar(calMonth, calYear);
        });
    }
    renderCalendar(calMonth, calYear);

    // =========================================
    // DASHBOARD: Animate habit ring
    // =========================================
    function animateHabitRing() {
        const ring = document.querySelector('.habit-ring-progress');
        if (ring) {
            const circumference = 2 * Math.PI * 28;
            const percent = 10;
            const offset = circumference - (percent / 100) * circumference;
            ring.style.strokeDasharray = circumference;
            ring.style.strokeDashoffset = circumference;
            requestAnimationFrame(() => {
                setTimeout(() => { ring.style.strokeDashoffset = offset; }, 100);
            });
        }
    }

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.id === 'dashboardPage' && mutation.target.classList.contains('active')) {
                animateHabitRing();
            }
        });
    });
    if (dashboardPage) observer.observe(dashboardPage, { attributes: true, attributeFilter: ['class'] });

    // =========================================
    // PROFILE: Inner tab navigation
    // =========================================
    document.querySelectorAll('.profile-nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.profile-nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            const tab = item.dataset.tab;
            // For now just show profile-info tab content (the main profile form)
            // All tabs navigate to the same profile main content area
            if (tab === 'profile-info') {
                showSection('profile');
            }
        });
    });

    // =========================================
    // PROFILE: Upload/Delete Photo
    // =========================================
    const profilePhotoInput = document.getElementById('profilePhotoInput');
    const updatePhotoBtn = document.getElementById('updatePhotoBtn');
    const deletePhotoBtn = document.getElementById('deletePhotoBtn');

    if (updatePhotoBtn && profilePhotoInput) {
        updatePhotoBtn.addEventListener('click', () => {
            profilePhotoInput.click();
        });

        profilePhotoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Validate file size (10MB)
            if (file.size > 10 * 1024 * 1024) {
                showToast('info', 'File too large', 'Please choose an image under 10MB.');
                return;
            }

            // Validate file type
            if (!['image/png', 'image/jpeg', 'image/gif'].includes(file.type)) {
                showToast('info', 'Invalid format', 'Please upload a PNG, JPEG, or GIF image.');
                return;
            }

            const reader = new FileReader();
            reader.onload = (ev) => {
                const dataUrl = ev.target.result;
                userData.profilePhoto = dataUrl;
                applyProfilePhoto(dataUrl);
                saveAllUserData();
                showToast('success', 'Photo Updated', 'Your profile photo has been updated successfully.');
            };
            reader.readAsDataURL(file);
            // Reset input so same file can be selected again
            profilePhotoInput.value = '';
        });
    }

    if (deletePhotoBtn) {
        deletePhotoBtn.addEventListener('click', () => {
            if (!userData.profilePhoto) {
                showToast('info', 'No Photo', 'You don\'t have a profile photo to delete.');
                return;
            }
            userData.profilePhoto = null;
            removeProfilePhoto();
            saveAllUserData();
            showToast('success', 'Photo Deleted', 'Your profile photo has been removed.');
        });
    }

    function applyProfilePhoto(dataUrl) {
        // Topbar avatar
        const avatarImg = document.getElementById('avatarImg');
        if (avatarImg) {
            avatarImg.src = dataUrl;
            avatarImg.style.display = 'block';
        }
        if (avatarInitials) avatarInitials.style.display = 'none';

        // Profile sidebar avatar
        const profileAvatarImg = document.getElementById('profileAvatarImg');
        if (profileAvatarImg) {
            profileAvatarImg.src = dataUrl;
            profileAvatarImg.style.display = 'block';
        }
        if (profileAvatarInitials) profileAvatarInitials.style.display = 'none';

        // Profile picture section avatar
        const profilePicImg = document.getElementById('profilePicImg');
        if (profilePicImg) {
            profilePicImg.src = dataUrl;
            profilePicImg.style.display = 'block';
        }
        if (profilePicInitials) profilePicInitials.style.display = 'none';
    }

    function removeProfilePhoto() {
        // Topbar avatar
        const avatarImg = document.getElementById('avatarImg');
        if (avatarImg) {
            avatarImg.src = '';
            avatarImg.style.display = 'none';
        }
        if (avatarInitials) { avatarInitials.style.display = ''; avatarInitials.textContent = userData.initials; }

        // Profile sidebar avatar
        const profileAvatarImg = document.getElementById('profileAvatarImg');
        if (profileAvatarImg) {
            profileAvatarImg.src = '';
            profileAvatarImg.style.display = 'none';
        }
        if (profileAvatarInitials) { profileAvatarInitials.style.display = ''; profileAvatarInitials.textContent = userData.initials; }

        // Profile picture section avatar
        const profilePicImg = document.getElementById('profilePicImg');
        if (profilePicImg) {
            profilePicImg.src = '';
            profilePicImg.style.display = 'none';
        }
        if (profilePicInitials) { profilePicInitials.style.display = ''; profilePicInitials.textContent = userData.initials; }
    }

    // =========================================
    // CHANGE PASSWORD
    // =========================================
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const passwordModalOverlay = document.getElementById('passwordModalOverlay');
    const passwordModalClose = document.getElementById('passwordModalClose');
    const changePasswordForm = document.getElementById('changePasswordForm');
    const passwordCancelBtn = document.getElementById('passwordCancelBtn');
    const passwordModalError = document.getElementById('passwordModalError');

    function openPasswordModal() {
        if (passwordModalOverlay) passwordModalOverlay.style.display = 'flex';
        if (passwordModalError) { passwordModalError.style.display = 'none'; passwordModalError.textContent = ''; }
        if (changePasswordForm) changePasswordForm.reset();
    }

    function closePasswordModal() {
        if (passwordModalOverlay) passwordModalOverlay.style.display = 'none';
        if (changePasswordForm) changePasswordForm.reset();
        if (passwordModalError) { passwordModalError.style.display = 'none'; passwordModalError.textContent = ''; }
    }

    if (changePasswordBtn) changePasswordBtn.addEventListener('click', openPasswordModal);
    if (passwordModalClose) passwordModalClose.addEventListener('click', closePasswordModal);
    if (passwordCancelBtn) passwordCancelBtn.addEventListener('click', closePasswordModal);
    if (passwordModalOverlay) {
        passwordModalOverlay.addEventListener('click', (e) => {
            if (e.target === passwordModalOverlay) closePasswordModal();
        });
    }

    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const currentPw = document.getElementById('currentPasswordInput').value;
            const newPw = document.getElementById('newPasswordInput').value;
            const confirmPw = document.getElementById('confirmNewPasswordInput').value;

            // Validate current password
            const email = getSession();
            if (!email) return;
            const accounts = getAccounts();
            const account = accounts.find(a => a.email === email);
            if (!account) return;

            if (account.password !== currentPw) {
                if (passwordModalError) {
                    passwordModalError.textContent = 'Current password is incorrect.';
                    passwordModalError.style.display = 'block';
                }
                return;
            }

            if (newPw !== confirmPw) {
                if (passwordModalError) {
                    passwordModalError.textContent = 'New passwords do not match.';
                    passwordModalError.style.display = 'block';
                }
                return;
            }

            if (newPw.length < 4) {
                if (passwordModalError) {
                    passwordModalError.textContent = 'Password must be at least 4 characters.';
                    passwordModalError.style.display = 'block';
                }
                return;
            }

            // Update password
            account.password = newPw;
            saveAccounts(accounts);
            closePasswordModal();
            showToast('success', 'Password Changed', 'Your password has been updated successfully.');
        });
    }

    // =========================================
    // PRODUCTIVITY STATS (Dynamic)
    // =========================================
    function updateProductivityStats() {
        const prodFocusScore = document.getElementById('prodFocusScore');
        const prodCompletedGoals = document.getElementById('prodCompletedGoals');
        const prodCurrentStreak = document.getElementById('prodCurrentStreak');

        // Completed goals = number of closed/completed tasks
        const allCards = document.querySelectorAll('.todo-cards-grid .todo-card');
        let completedGoals = 0;
        let totalTasks = 0;
        allCards.forEach(card => {
            totalTasks++;
            if (card.dataset.status === 'closed') completedGoals++;
        });

        // Focus score = percentage based on sessions done (cap at 100)
        let focusScore = 0;
        if (focusState.sessionsCompleted > 0) {
            focusScore = Math.min(100, Math.round((focusState.totalFocusSeconds / 3600) * 10));
        }

        // Current streak from habits
        let maxStreak = 0;
        habitsState.habits.forEach(h => {
            const streak = calcStreak(h);
            if (streak > maxStreak) maxStreak = streak;
        });
        // Also include focus streak
        if (focusState.streak > maxStreak) maxStreak = focusState.streak;

        if (prodFocusScore) prodFocusScore.textContent = focusScore + '%';
        if (prodCompletedGoals) prodCompletedGoals.textContent = completedGoals;
        if (prodCurrentStreak) prodCurrentStreak.textContent = maxStreak + 'd';

        // Also update dashboard stat cards
        updateDashboardStats();
    }

    function updateDashboardStats() {
        // Update Dashboard Tasks Completed
        const tasksCard = document.getElementById('tasksCompletedCard');
        if (tasksCard) {
            const allCards = document.querySelectorAll('.todo-cards-grid .todo-card');
            let completed = 0, total = 0;
            allCards.forEach(card => {
                total++;
                if (card.dataset.status === 'closed') completed++;
            });
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
            const valEl = tasksCard.querySelector('.stat-value');
            const trendEl = tasksCard.querySelector('.stat-trend');
            if (valEl) valEl.innerHTML = `${completed} <span class="stat-highlight">(${pct}%)</span>`;
            if (trendEl) {
                if (total === 0) {
                    trendEl.innerHTML = '<span>Start adding tasks</span>';
                    trendEl.className = 'stat-trend neutral';
                } else {
                    trendEl.innerHTML = `<span>${completed} of ${total} tasks done</span>`;
                    trendEl.className = pct >= 50 ? 'stat-trend up' : 'stat-trend neutral';
                }
            }
        }

        // Focus Score card
        const focusCard = document.getElementById('focusScoreCard');
        if (focusCard) {
            let focusScore = 0;
            if (focusState.sessionsCompleted > 0) {
                focusScore = Math.min(100, Math.round((focusState.totalFocusSeconds / 3600) * 10));
            }
            const valEl = focusCard.querySelector('.stat-value');
            const trendEl = focusCard.querySelector('.stat-trend');
            if (valEl) valEl.innerHTML = `${focusScore}<span class="stat-unit">/100</span>`;
            if (trendEl) {
                if (focusState.sessionsCompleted === 0) {
                    trendEl.innerHTML = '<span>No data yet</span>';
                    trendEl.className = 'stat-trend neutral';
                } else {
                    trendEl.innerHTML = `<span>${focusState.sessionsCompleted} sessions completed</span>`;
                    trendEl.className = 'stat-trend up';
                }
            }
        }

        // Streak card
        const streakCard = document.getElementById('streakCard');
        if (streakCard) {
            let maxStreak = focusState.streak;
            habitsState.habits.forEach(h => {
                const s = calcStreak(h);
                if (s > maxStreak) maxStreak = s;
            });
            const valEl = streakCard.querySelector('.stat-value');
            const trendEl = streakCard.querySelector('.stat-trend');
            if (valEl) valEl.innerHTML = `${maxStreak} <span class="stat-unit">days</span>`;
            if (trendEl) {
                if (maxStreak === 0) {
                    trendEl.innerHTML = '<span>Start a streak!</span>';
                    trendEl.className = 'stat-trend neutral';
                } else {
                    trendEl.innerHTML = `<span>Keep going! 🔥</span>`;
                    trendEl.className = 'stat-trend up';
                }
            }
        }

        // Habit Completion card
        const habitCard = document.getElementById('habitCompletionCard');
        if (habitCard) {
            const total = habitsState.habits.length;
            const completed = habitsState.habits.filter(h => isHabitDoneToday(h)).length;
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
            const trendEl = habitCard.querySelector('.stat-trend');
            const ringLabel = habitCard.querySelector('.habit-ring-label');
            if (trendEl) trendEl.textContent = pct + '% out of 100';
            if (ringLabel) ringLabel.textContent = pct + '%';
        }
    }

    // =========================================
    // PROFILE: Save Changes
    // =========================================
    const profileSaveBtn = document.getElementById('profileSaveBtn');
    if (profileSaveBtn) {
        profileSaveBtn.addEventListener('click', () => {
            userData.firstName = profileFirstName.value.trim();
            userData.lastName = profileLastName.value.trim();
            userData.email = profileEmail.value.trim();
            userData.initials = (userData.firstName.charAt(0) + userData.lastName.charAt(0)).toUpperCase();

            if (avatarInitials) avatarInitials.textContent = userData.initials;
            if (profileAvatarInitials) profileAvatarInitials.textContent = userData.initials;
            if (profilePicInitials) profilePicInitials.textContent = userData.initials;
            if (profileUserName) profileUserName.textContent = `${userData.firstName} ${userData.lastName}`.trim();

            // Also update the account record
            const email = getSession();
            if (email) {
                const accounts = getAccounts();
                const acc = accounts.find(a => a.email === email);
                if (acc) {
                    acc.firstName = userData.firstName;
                    acc.lastName = userData.lastName;
                    saveAccounts(accounts);
                }
            }

            saveAllUserData();

            const original = profileSaveBtn.innerHTML;
            profileSaveBtn.innerHTML = '<i class="ph ph-check-circle"></i> Saved!';
            profileSaveBtn.style.backgroundColor = '#28a745';
            setTimeout(() => {
                profileSaveBtn.innerHTML = original;
                profileSaveBtn.style.backgroundColor = '';
            }, 1500);
        });
    }

    // =========================================
    // PROFILE: Cancel -> Dashboard
    // =========================================
    const profileCancelBtn = document.getElementById('profileCancelBtn');
    if (profileCancelBtn) {
        profileCancelBtn.addEventListener('click', () => {
            showSection('dashboard');
        });
    }

    // =========================================
    // SEARCH: Keyboard shortcuts
    // =========================================
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') { searchInput.value = ''; searchInput.blur(); }
        });
    }
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            if (dashboardPage && dashboardPage.classList.contains('active') && searchInput) searchInput.focus();
        }
    });

    // =========================================
    // TODO LIST
    // =========================================
    function updateTodoDate() {
        const todoDateEl = document.getElementById('todoDate');
        if (todoDateEl) {
            const now = new Date();
            const options = { weekday: 'long', day: 'numeric', month: 'long' };
            todoDateEl.textContent = now.toLocaleDateString('en-US', options);
        }
    }

    function updateTodoCounts() {
        const cards = document.querySelectorAll('.todo-cards-grid .todo-card');
        let counts = { all: 0, open: 0, closed: 0, archived: 0 };
        cards.forEach(card => {
            counts.all++;
            const status = card.dataset.status;
            if (counts[status] !== undefined) counts[status]++;
        });
        if (document.getElementById('countAll')) document.getElementById('countAll').textContent = counts.all;
        if (document.getElementById('countOpen')) document.getElementById('countOpen').textContent = counts.open;
        if (document.getElementById('countClosed')) document.getElementById('countClosed').textContent = counts.closed;
        if (document.getElementById('countArchived')) document.getElementById('countArchived').textContent = counts.archived;
    }

    // Filter Buttons
    document.querySelectorAll('.todo-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.todo-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.dataset.filter;
            document.querySelectorAll('.todo-cards-grid .todo-card').forEach(card => {
                card.style.display = (filter === 'all' || card.dataset.status === filter) ? '' : 'none';
            });
        });
    });

    // Delete Task
    function attachDeleteEvents() {
        document.querySelectorAll('.todo-action-delete').forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', function() {
                const card = this.closest('.todo-card');
                if (card) {
                    card.style.opacity = '0';
                    setTimeout(() => {
                        card.remove();
                        updateTodoCounts();
                        saveAllUserData();
                    }, 300);
                }
            });
        });
    }

    // Checkbox toggle
    function attachCheckboxEvents() {
        document.querySelectorAll('.todo-checkbox input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', function() {
                const card = this.closest('.todo-card');
                if (card && card.dataset.status !== 'archived') {
                    if (this.checked) {
                        card.dataset.status = 'closed';
                        const badge = card.querySelector('.todo-status-badge');
                        if (badge) { badge.textContent = 'Closed'; badge.className = 'todo-status-badge closed'; }
                    } else {
                        card.dataset.status = 'open';
                        const badge = card.querySelector('.todo-status-badge');
                        if (badge) { badge.textContent = 'Open'; badge.className = 'todo-status-badge open'; }
                    }
                    updateTodoCounts();
                    saveAllUserData();
                    updateProductivityStats();
                }
            });
        });
    }

    attachDeleteEvents();
    attachCheckboxEvents();

    // Create New Task
    const newTaskForm = document.getElementById('newTaskForm');
    if (newTaskForm) {
        newTaskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('taskTitle').value.trim();
            const dateStr = document.getElementById('taskDate').value.trim();
            const desc = document.getElementById('taskDesc').value.trim();
            if (!title) return;

            const grid = document.querySelector('.todo-cards-grid');
            if (!grid) return;

            const newCard = document.createElement('div');
            newCard.className = 'todo-card todo-card-small';
            newCard.dataset.status = 'open';
            newCard.dataset.id = Date.now().toString();

            const timeHtml = dateStr ? `<div class="todo-time" style="margin-bottom: 8px;"><i class="ph ph-clock"></i> ${dateStr}</div>` : '';
            const descHtml = desc ? `<div class="todo-card-desc" style="margin-top: 4px;">${desc}</div>` : '';

            newCard.innerHTML = `
                <div class="todo-card-top">
                    <label class="todo-checkbox">
                        <input type="checkbox">
                        <span class="todo-checkmark"><i class="ph ph-check"></i></span>
                    </label>
                    <div class="todo-card-info">
                        <div class="todo-card-title">${title}</div>
                        ${descHtml}
                        <span class="todo-status-badge open">Open</span>
                    </div>
                </div>
                <div class="todo-card-bottom">
                    <div>
                        ${timeHtml}
                        <div class="todo-card-actions">
                            <button class="todo-action-btn" title="Edit"><i class="ph ph-pencil-simple"></i></button>
                            <button class="todo-action-btn todo-action-delete" title="Delete"><i class="ph ph-trash"></i></button>
                        </div>
                    </div>
                    <div class="todo-avatars">
                        <div class="todo-avatar" style="background:#6B4CE6;">${userData.initials ? userData.initials[0] : 'U'}</div>
                    </div>
                </div>
            `;

            grid.prepend(newCard);
            newCard.style.opacity = '0';
            newCard.style.transform = 'translateY(-10px)';
            newCard.style.transition = 'all 0.3s ease';
            requestAnimationFrame(() => {
                newCard.style.opacity = '1';
                newCard.style.transform = 'translateY(0)';
            });

            updateTodoCounts();
            attachDeleteEvents();
            attachCheckboxEvents();
            saveAllUserData();
            showToast('success', 'New Task \u2705', `Task Added: '${title}' is now in your To-Do list.`);
            newTaskForm.reset();
        });
    }

    const cancelTaskBtn = document.getElementById('cancelTaskBtn');
    if (cancelTaskBtn) {
        cancelTaskBtn.addEventListener('click', () => { if (newTaskForm) newTaskForm.reset(); });
    }

    // =========================================
    // FOCUS MODE: Timer Logic
    // =========================================
    function formatTime(seconds) {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    function formatDuration(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}h ${m}m`;
    }

    function getDurationForMode(mode) {
        switch(mode) {
            case 'pomodoro': return focusState.settings.focusDuration * 60;
            case 'short': return focusState.settings.shortBreak * 60;
            case 'long': return focusState.settings.longBreak * 60;
            default: return 25 * 60;
        }
    }

    function updateTimerDisplay() {
        const display = document.getElementById('focusTimeDisplay');
        if (display) display.textContent = formatTime(focusState.timeLeft);
        const ring = document.getElementById('focusRingProgress');
        const glow = document.getElementById('focusRingGlow');
        if (ring) {
            const circumference = 2 * Math.PI * 115;
            const progress = focusState.totalTime > 0 ? focusState.timeLeft / focusState.totalTime : 1;
            const offset = circumference * (1 - progress);
            ring.style.strokeDasharray = circumference;
            ring.style.strokeDashoffset = offset;
            if (glow) {
                glow.style.strokeDasharray = circumference;
                glow.style.strokeDashoffset = offset;
            }
        }
    }

    function updateFocusStats() {
        const el1 = document.getElementById('focusTotalTime');
        const el2 = document.getElementById('focusSessionsDone');
        const el3 = document.getElementById('focusStreak');
        const el4 = document.getElementById('focusBestDay');
        if (el1) el1.textContent = formatDuration(focusState.totalFocusSeconds);
        if (el2) el2.textContent = focusState.sessionsCompleted;
        if (el3) el3.textContent = focusState.streak;
        if (el4) el4.textContent = formatDuration(focusState.bestDaySeconds);
    }

    function updateSessionDots() {
        const dots = document.getElementById('focusDots');
        const text = document.getElementById('focusCounterText');
        if (dots) {
            dots.innerHTML = '';
            for (let i = 1; i <= focusState.totalSessions; i++) {
                const dot = document.createElement('span');
                dot.className = 'focus-dot';
                if (i < focusState.currentSession) dot.classList.add('done');
                if (i === focusState.currentSession) dot.classList.add('active');
                dots.appendChild(dot);
            }
        }
        if (text) text.textContent = `Session ${focusState.currentSession} of ${focusState.totalSessions}`;
    }

    function switchMode(mode) {
        if (focusState.isRunning) stopTimer();
        focusState.mode = mode;
        focusState.totalTime = getDurationForMode(mode);
        focusState.timeLeft = focusState.totalTime;
        document.querySelectorAll('.focus-tab').forEach(t => t.classList.remove('active'));
        const activeTab = document.querySelector(`.focus-tab[data-session="${mode}"]`);
        if (activeTab) activeTab.classList.add('active');
        const label = document.getElementById('focusSessionLabel');
        if (label) {
            switch(mode) {
                case 'pomodoro': label.textContent = 'Focus Session'; break;
                case 'short': label.textContent = 'Short Break'; break;
                case 'long': label.textContent = 'Long Break'; break;
            }
        }
        const wrapper = document.querySelector('.focus-timer-wrapper');
        if (wrapper) {
            wrapper.classList.remove('mode-break', 'mode-long');
            if (mode === 'short') wrapper.classList.add('mode-break');
            if (mode === 'long') wrapper.classList.add('mode-long');
        }
        updateTimerDisplay();
        updateStartButton();
    }

    function updateStartButton() {
        const icon = document.getElementById('focusPlayIcon');
        const label = document.getElementById('focusStartLabel');
        if (focusState.isRunning) {
            if (icon) { icon.classList.remove('ph-play'); icon.classList.add('ph-pause'); }
            if (label) label.textContent = 'Pause';
        } else {
            if (icon) { icon.classList.remove('ph-pause'); icon.classList.add('ph-play'); }
            if (label) {
                if (focusState.timeLeft < focusState.totalTime) label.textContent = 'Resume';
                else label.textContent = focusState.mode === 'pomodoro' ? 'Start Focus' : 'Start Break';
            }
        }
    }

    function startTimer() {
        if (focusState.isRunning) return;
        const isNewStart = focusState.timeLeft === focusState.totalTime;
        focusState.isRunning = true;
        updateStartButton();
        const wrapper = document.querySelector('.focus-timer-wrapper');
        if (wrapper) wrapper.classList.add('running');

        if (isNewStart && focusState.mode === 'pomodoro') {
            const mins = focusState.settings.focusDuration;
            showToast('focus', 'Focus Mode \uD83E\uDDD8', `Focus Active: Stay focused for ${mins} minutes. \u23F0 ${formatTime(focusState.timeLeft)} remaining.`);
        }

        focusState.interval = setInterval(() => {
            focusState.timeLeft--;
            if (focusState.mode === 'pomodoro') focusState.totalFocusSeconds++;
            updateTimerDisplay();
            if (focusState.timeLeft <= 0) {
                clearInterval(focusState.interval);
                focusState.interval = null;
                focusState.isRunning = false;
                if (wrapper) wrapper.classList.remove('running');
                onTimerComplete();
            }
        }, 1000);
    }

    function stopTimer() {
        focusState.isRunning = false;
        if (focusState.interval) { clearInterval(focusState.interval); focusState.interval = null; }
        const wrapper = document.querySelector('.focus-timer-wrapper');
        if (wrapper) wrapper.classList.remove('running');
        updateStartButton();
    }

    function resetTimer() {
        stopTimer();
        focusState.totalTime = getDurationForMode(focusState.mode);
        focusState.timeLeft = focusState.totalTime;
        updateTimerDisplay();
        updateStartButton();
    }

    function onTimerComplete() {
        if (focusState.settings.soundAlert) playCompletionSound();
        if (focusState.mode === 'pomodoro') {
            const task = document.getElementById('focusTaskInput');
            focusState.history.unshift({
                task: task ? task.value.trim() || 'Focus Session' : 'Focus Session',
                duration: focusState.settings.focusDuration,
                time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                type: 'focus'
            });
            focusState.sessionsCompleted++;
            if (focusState.totalFocusSeconds > focusState.bestDaySeconds) focusState.bestDaySeconds = focusState.totalFocusSeconds;
            if (focusState.currentSession >= focusState.totalSessions) {
                focusState.currentSession = 1;
                focusState.streak++;
                switchMode('long');
            } else {
                focusState.currentSession++;
                switchMode('short');
            }
            updateSessionDots();
            updateFocusStats();
            renderFocusHistory();
            saveAllUserData();
            updateProductivityStats();
            if (focusState.settings.autoStartBreaks) setTimeout(() => startTimer(), 500);
        } else {
            switchMode('pomodoro');
            updateSessionDots();
            if (focusState.settings.autoStartBreaks) setTimeout(() => startTimer(), 500);
        }
    }

    function playCompletionSound() {
        const wrapper = document.querySelector('.focus-timer-wrapper');
        if (wrapper) {
            wrapper.classList.add('completed');
            setTimeout(() => wrapper.classList.remove('completed'), 2000);
        }
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            [523.25, 659.25, 783.99].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = freq;
                osc.type = 'sine';
                gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.2);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.2 + 0.5);
                osc.start(ctx.currentTime + i * 0.2);
                osc.stop(ctx.currentTime + i * 0.2 + 0.5);
            });
        } catch(e) {}
    }

    function renderFocusHistory() {
        const list = document.getElementById('focusHistoryList');
        if (!list) return;
        if (focusState.history.length === 0) {
            list.innerHTML = `<div class="focus-history-empty"><i class="ph ph-clock-countdown"></i><p>No sessions yet today</p><span>Start your first focus session!</span></div>`;
            return;
        }
        list.innerHTML = focusState.history.slice(0, 8).map(s => `
            <div class="focus-history-item">
                <div class="focus-history-icon ${s.type}"><i class="ph ph-${s.type === 'focus' ? 'brain' : 'coffee'}"></i></div>
                <div class="focus-history-info">
                    <span class="focus-history-task">${s.task}</span>
                    <span class="focus-history-meta">${s.duration}min • ${s.time}</span>
                </div>
            </div>
        `).join('');
    }

    // Focus tabs
    document.querySelectorAll('.focus-tab').forEach(tab => {
        tab.addEventListener('click', () => switchMode(tab.dataset.session));
    });

    // Start/Pause
    const focusStartBtn = document.getElementById('focusStartBtn');
    if (focusStartBtn) {
        focusStartBtn.addEventListener('click', () => {
            if (focusState.isRunning) stopTimer();
            else startTimer();
        });
    }

    // Reset
    const focusResetBtn = document.getElementById('focusResetBtn');
    if (focusResetBtn) focusResetBtn.addEventListener('click', resetTimer);

    // Skip
    const focusSkipBtn = document.getElementById('focusSkipBtn');
    if (focusSkipBtn) {
        focusSkipBtn.addEventListener('click', () => {
            if (focusState.isRunning) stopTimer();
            onTimerComplete();
        });
    }

    // Settings +/- buttons
    document.querySelectorAll('.focus-inc-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            const action = btn.dataset.action;
            let current = focusState.settings[target];
            if (action === 'inc') current = Math.min(120, current + 5);
            else current = Math.max(1, current - 5);
            focusState.settings[target] = current;
            const valMap = { focusDuration: 'focusDurationVal', shortBreak: 'shortBreakVal', longBreak: 'longBreakVal' };
            const el = document.getElementById(valMap[target]);
            if (el) el.textContent = current;
            if (!focusState.isRunning) {
                const modeMap = { pomodoro: 'focusDuration', short: 'shortBreak', long: 'longBreak' };
                if (modeMap[focusState.mode] === target) {
                    focusState.totalTime = current * 60;
                    focusState.timeLeft = current * 60;
                    updateTimerDisplay();
                }
            }
            saveAllUserData();
        });
    });

    // Toggle switches
    const autoStartBreaks = document.getElementById('autoStartBreaks');
    if (autoStartBreaks) {
        autoStartBreaks.checked = focusState.settings.autoStartBreaks;
        autoStartBreaks.addEventListener('change', () => {
            focusState.settings.autoStartBreaks = autoStartBreaks.checked;
            saveAllUserData();
        });
    }

    const soundAlert = document.getElementById('soundAlert');
    if (soundAlert) {
        soundAlert.checked = focusState.settings.soundAlert;
        soundAlert.addEventListener('change', () => {
            focusState.settings.soundAlert = soundAlert.checked;
            saveAllUserData();
        });
    }

    // =========================================
    // FOCUS INIT
    // =========================================
    function initFocusMode() {
        const dv = document.getElementById('focusDurationVal');
        const sv = document.getElementById('shortBreakVal');
        const lv = document.getElementById('longBreakVal');
        if (dv) dv.textContent = focusState.settings.focusDuration;
        if (sv) sv.textContent = focusState.settings.shortBreak;
        if (lv) lv.textContent = focusState.settings.longBreak;

        if (autoStartBreaks) autoStartBreaks.checked = focusState.settings.autoStartBreaks;
        if (soundAlert) soundAlert.checked = focusState.settings.soundAlert;

        focusState.totalTime = getDurationForMode(focusState.mode);
        focusState.timeLeft = focusState.totalTime;
        updateTimerDisplay();
        updateSessionDots();
        updateFocusStats();
        renderFocusHistory();
    }

    // =========================================
    // HABIT TRACKER LOGIC
    // =========================================
    const categoryIcons = {
        health: 'ph-heart',
        fitness: 'ph-barbell',
        mindfulness: 'ph-flower-lotus',
        learning: 'ph-book-open',
        productivity: 'ph-lightning',
        social: 'ph-users'
    };

    const categoryLabels = {
        health: 'Health',
        fitness: 'Fitness',
        mindfulness: 'Mindfulness',
        learning: 'Learning',
        productivity: 'Productivity',
        social: 'Social'
    };

    function getTodayStr() {
        return new Date().toISOString().slice(0, 10);
    }

    function getWeekDates(offset) {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(now);
        monday.setDate(now.getDate() + mondayOffset + (offset * 7));
        const dates = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            dates.push(d);
        }
        return dates;
    }

    function formatWeekRange(dates) {
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const start = dates[0];
        const end = dates[6];
        return `${months[start.getMonth()]} ${start.getDate()} – ${months[end.getMonth()]} ${end.getDate()}`;
    }

    function calcStreak(habit) {
        let streak = 0;
        const today = new Date();
        const d = new Date(today);
        // Check from today backward
        while (true) {
            const ds = d.toISOString().slice(0, 10);
            if (habit.completions && habit.completions[ds]) {
                streak++;
                d.setDate(d.getDate() - 1);
            } else {
                // If today isn't completed yet, try starting from yesterday
                if (streak === 0 && d.toISOString().slice(0, 10) === getTodayStr()) {
                    d.setDate(d.getDate() - 1);
                    continue;
                }
                break;
            }
        }
        return streak;
    }

    function isHabitDoneToday(habit) {
        return habit.completions && habit.completions[getTodayStr()];
    }

    function toggleHabitComplete(habitId) {
        const habit = habitsState.habits.find(h => h.id === habitId);
        if (!habit) return;
        if (!habit.completions) habit.completions = {};
        const today = getTodayStr();
        if (habit.completions[today]) {
            delete habit.completions[today];
        } else {
            habit.completions[today] = true;
        }
        // Update streak
        habit.streak = calcStreak(habit);
        if (habit.streak > (habit.bestStreak || 0)) habit.bestStreak = habit.streak;
        saveAllUserData();
        renderHabitsPage();
        updateProductivityStats();
    }

    function deleteHabit(habitId) {
        habitsState.habits = habitsState.habits.filter(h => h.id !== habitId);
        saveAllUserData();
        renderHabitsPage();
        updateProductivityStats();
        showToast('success', 'Habit Removed', 'Habit has been deleted successfully.');
    }

    function renderHabitsPage() {
        renderHabitCards();
        renderWeekGrid();
        updateHabitStats();
        renderStreaksLeaderboard();
        updateHabitRing();
        // Update date label
        const label = document.getElementById('habitsDateLabel');
        if (label) {
            const now = new Date();
            const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
            label.textContent = now.toLocaleDateString('en-US', options);
        }
    }

    function renderHabitCards() {
        const list = document.getElementById('habitsCardsList');
        const emptyEl = document.getElementById('habitsCardsEmpty');
        if (!list) return;

        // Get active filter
        const activeFilter = document.querySelector('.habits-filter.active');
        const filter = activeFilter ? activeFilter.dataset.filter : 'all';

        // Clear existing cards but keep empty
        const existingCards = list.querySelectorAll('.habit-card');
        existingCards.forEach(c => c.remove());

        if (habitsState.habits.length === 0) {
            if (emptyEl) emptyEl.style.display = '';
            return;
        }

        if (emptyEl) emptyEl.style.display = 'none';

        habitsState.habits.forEach((habit, idx) => {
            const isDone = isHabitDoneToday(habit);
            const streak = calcStreak(habit);

            // Apply filter
            if (filter === 'done' && !isDone) return;
            if (filter === 'pending' && isDone) return;

            const card = document.createElement('div');
            card.className = 'habit-card' + (isDone ? ' completed' : '');
            card.style.setProperty('--habit-color', habit.color || '#6B4CE6');
            card.style.animationDelay = `${idx * 0.05}s`;
            card.dataset.habitId = habit.id;

            const goalHtml = habit.goal ? `<span class="habit-goal-text"><i class="ph ph-target"></i> ${habit.goal}</span>` : '';

            card.innerHTML = `
                <div class="habit-check-wrapper">
                    <button class="habit-check" data-id="${habit.id}" title="${isDone ? 'Mark incomplete' : 'Mark complete'}">
                        <i class="ph ph-check"></i>
                    </button>
                </div>
                <div class="habit-info">
                    <div class="habit-name">${habit.name}</div>
                    <div class="habit-meta">
                        <span class="habit-category" style="color:${habit.color};background:${habit.color}15;">
                            <i class="ph ${categoryIcons[habit.category] || 'ph-star'}"></i>
                            ${categoryLabels[habit.category] || habit.category}
                        </span>
                        ${goalHtml}
                    </div>
                </div>
                <div class="habit-streak-info">
                    <div class="habit-streak-count">${streak}</div>
                    <div class="habit-streak-label"><i class="ph ph-fire"></i> streak</div>
                </div>
                <div class="habit-actions">
                    <button class="habit-action-btn delete" data-id="${habit.id}" title="Delete habit">
                        <i class="ph ph-trash"></i>
                    </button>
                </div>
            `;

            list.appendChild(card);
        });

        // Attach events
        list.querySelectorAll('.habit-check').forEach(btn => {
            btn.addEventListener('click', () => toggleHabitComplete(btn.dataset.id));
        });
        list.querySelectorAll('.habit-action-btn.delete').forEach(btn => {
            btn.addEventListener('click', () => {
                if (confirm('Delete this habit?')) deleteHabit(btn.dataset.id);
            });
        });
    }

    function renderWeekGrid() {
        const rows = document.getElementById('habitsWeekRows');
        const rangeEl = document.getElementById('habitWeekRange');
        if (!rows) return;

        const dates = getWeekDates(habitsState.weekOffset);
        if (rangeEl) rangeEl.textContent = formatWeekRange(dates);

        if (habitsState.habits.length === 0) {
            rows.innerHTML = `<div class="habits-week-empty"><i class="ph ph-calendar-plus"></i><p>Add habits to see your weekly progress</p></div>`;
            return;
        }

        const todayStr = getTodayStr();
        rows.innerHTML = '';

        habitsState.habits.forEach(habit => {
            const row = document.createElement('div');
            row.className = 'habits-week-row';

            let nameHtml = `<div class="habits-week-habit-name">
                <span class="habits-week-dot" style="background:${habit.color || '#6B4CE6'}"></span>
                ${habit.name}
            </div>`;

            let cellsHtml = '';
            dates.forEach(date => {
                const ds = date.toISOString().slice(0, 10);
                const completed = habit.completions && habit.completions[ds];
                const isToday = ds === todayStr;
                const isFuture = date > new Date() && !isToday;
                let classes = 'habits-week-cell';
                if (completed) classes += ' completed';
                if (isToday) classes += ' today';
                if (isFuture) classes += ' future';

                cellsHtml += `<div class="${classes}" data-habit-id="${habit.id}" data-date="${ds}">
                    ${completed ? '<i class="ph ph-check"></i>' : ''}
                </div>`;
            });

            row.innerHTML = nameHtml + cellsHtml;
            rows.appendChild(row);
        });

        // Click on week cells to toggle
        rows.querySelectorAll('.habits-week-cell:not(.future)').forEach(cell => {
            cell.addEventListener('click', () => {
                const habitId = cell.dataset.habitId;
                const dateStr = cell.dataset.date;
                const habit = habitsState.habits.find(h => h.id === habitId);
                if (!habit) return;
                if (!habit.completions) habit.completions = {};
                if (habit.completions[dateStr]) {
                    delete habit.completions[dateStr];
                } else {
                    habit.completions[dateStr] = true;
                }
                habit.streak = calcStreak(habit);
                if (habit.streak > (habit.bestStreak || 0)) habit.bestStreak = habit.streak;
                saveAllUserData();
                renderHabitsPage();
            });
        });
    }

    function updateHabitStats() {
        const total = habitsState.habits.length;
        const completedToday = habitsState.habits.filter(h => isHabitDoneToday(h)).length;
        const bestStreak = habitsState.habits.reduce((max, h) => Math.max(max, h.bestStreak || 0), 0);
        const rate = total > 0 ? Math.round((completedToday / total) * 100) : 0;

        const el1 = document.getElementById('habitStatCompleted');
        const el2 = document.getElementById('habitStatStreak');
        const el3 = document.getElementById('habitStatRate');
        const el4 = document.getElementById('habitStatTotal');
        if (el1) el1.textContent = completedToday;
        if (el2) el2.textContent = bestStreak;
        if (el3) el3.textContent = rate + '%';
        if (el4) el4.textContent = total;
    }

    function updateHabitRing() {
        const total = habitsState.habits.length;
        const completed = habitsState.habits.filter(h => isHabitDoneToday(h)).length;
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
        const ring = document.getElementById('habitRingTrack');
        const label = document.getElementById('habitRingPct');

        if (ring) {
            const circumference = 2 * Math.PI * 68;
            const offset = circumference - (pct / 100) * circumference;
            ring.style.strokeDasharray = circumference;
            requestAnimationFrame(() => {
                setTimeout(() => { ring.style.strokeDashoffset = offset; }, 100);
            });
        }
        if (label) label.textContent = pct + '%';
    }

    function renderStreaksLeaderboard() {
        const list = document.getElementById('habitsStreaksList');
        if (!list) return;

        const sorted = [...habitsState.habits]
            .map(h => ({ ...h, streak: calcStreak(h) }))
            .filter(h => h.streak > 0 || h.bestStreak > 0)
            .sort((a, b) => (b.bestStreak || 0) - (a.bestStreak || 0))
            .slice(0, 5);

        if (sorted.length === 0) {
            list.innerHTML = `<div class="habits-streaks-empty"><i class="ph ph-medal"></i><p>Complete habits to build streaks!</p></div>`;
            return;
        }

        const rankClasses = ['gold', 'silver', 'bronze'];
        list.innerHTML = sorted.map((h, i) => `
            <div class="habits-streak-item">
                <div class="habits-streak-rank ${i < 3 ? rankClasses[i] : 'normal'}">${i + 1}</div>
                <span class="habits-streak-name">${h.name}</span>
                <span class="habits-streak-days"><i class="ph ph-fire"></i> ${h.bestStreak || 0}d</span>
            </div>
        `).join('');
    }

    // Habit form logic
    function showHabitForm() {
        const form = document.getElementById('habitsFormCard');
        if (form) {
            form.style.display = '';
            form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    function hideHabitForm() {
        const form = document.getElementById('habitsFormCard');
        const formEl = document.getElementById('habitForm');
        if (form) form.style.display = 'none';
        if (formEl) formEl.reset();
        // Reset picker selections
        document.querySelectorAll('.habits-cat-btn').forEach((b, i) => {
            b.classList.toggle('active', i === 0);
        });
        document.querySelectorAll('.habits-color-btn').forEach((b, i) => {
            b.classList.toggle('active', i === 0);
        });
    }

    // Add Habit buttons
    const habitsAddBtn = document.getElementById('habitsAddBtn');
    const habitsEmptyAddBtn = document.getElementById('habitsEmptyAddBtn');
    const habitFormCancel = document.getElementById('habitFormCancel');

    if (habitsAddBtn) habitsAddBtn.addEventListener('click', showHabitForm);
    if (habitsEmptyAddBtn) habitsEmptyAddBtn.addEventListener('click', showHabitForm);
    if (habitFormCancel) habitFormCancel.addEventListener('click', hideHabitForm);

    // Category picker
    document.querySelectorAll('.habits-cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.habits-cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Color picker
    document.querySelectorAll('.habits-color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.habits-color-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Week nav
    const habitWeekPrev = document.getElementById('habitWeekPrev');
    const habitWeekNext = document.getElementById('habitWeekNext');
    if (habitWeekPrev) {
        habitWeekPrev.addEventListener('click', () => {
            habitsState.weekOffset--;
            renderWeekGrid();
        });
    }
    if (habitWeekNext) {
        habitWeekNext.addEventListener('click', () => {
            habitsState.weekOffset++;
            renderWeekGrid();
        });
    }

    // Habit filters
    document.querySelectorAll('.habits-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.habits-filter').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderHabitCards();
        });
    });

    // Submit habit form
    const habitForm = document.getElementById('habitForm');
    if (habitForm) {
        habitForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('habitName').value.trim();
            if (!name) return;

            const activeCat = document.querySelector('.habits-cat-btn.active');
            const activeColor = document.querySelector('.habits-color-btn.active');

            const habit = {
                id: Date.now().toString(),
                name: name,
                category: activeCat ? activeCat.dataset.category : 'health',
                frequency: document.getElementById('habitFrequency').value,
                goal: document.getElementById('habitGoal').value.trim(),
                reminder: document.getElementById('habitReminder').value,
                color: activeColor ? activeColor.dataset.color : '#6B4CE6',
                createdAt: new Date().toISOString(),
                completions: {},
                streak: 0,
                bestStreak: 0
            };

            habitsState.habits.push(habit);
            saveAllUserData();
            hideHabitForm();
            renderHabitsPage();
            showToast('success', 'New Habit 🌱', `"${name}" has been added to your habits!`);
        });
    }

    // =========================================
    // SESSION CHECK ON LOAD
    // =========================================
    const existingSession = getSession();
    if (existingSession) {
        // User is already logged in — check account still exists
        const accounts = getAccounts();
        const account = accounts.find(a => a.email === existingSession);
        if (account) {
            const savedData = loadAllUserData();
            if (savedData) {
                applyLoadedData(savedData);
            } else {
                const initials = (account.firstName.charAt(0) + account.lastName.charAt(0)).toUpperCase();
                userData = { firstName: account.firstName, lastName: account.lastName, email: existingSession, initials };
            }
            enterDashboard(currentActivePage);
        } else {
            // Invalid session
            clearSessionStorage();
            showPage('signupPage');
        }
    } else {
        showPage('signupPage');
    }

    // =========================================
    // CONTACT FORM HANDLING
    // =========================================
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const contactSubmitBtn = document.getElementById('contactSubmitBtn');
            const originalText = contactSubmitBtn.innerHTML;
            
            contactSubmitBtn.disabled = true;
            contactSubmitBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Sending...';
            
            setTimeout(() => {
                showToast('success', 'Message Sent!', 'We have received your message and will get back to you soon.');
                contactForm.reset();
                contactSubmitBtn.disabled = false;
                contactSubmitBtn.innerHTML = originalText;
            }, 1500);
        });
    }

    // =========================================
    // AUTO-SAVE on page unload
    // =========================================
    window.addEventListener('beforeunload', () => {
        if (getSession()) saveAllUserData();
    });

});
