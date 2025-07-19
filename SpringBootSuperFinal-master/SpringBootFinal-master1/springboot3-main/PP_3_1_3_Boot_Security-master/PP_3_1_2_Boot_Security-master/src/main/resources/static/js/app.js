// app.js

const API_URL = {
    BASE: '/api',
    // ИСПРАВЛЕНО: URL для CRUD операций с пользователями вынесен в отдельную константу
    USERS: '/api',
    ROLES: '/api/roles',
    CURRENT_USER: '/api/current'
};

let users = [];
let roles = [];
let currentUser = null;
let userModal = null;
let deleteUserModal = null;

function showSection(id) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    const section = document.getElementById(id);
    if (section) {
        section.classList.add('active');
    }
}

async function checkAuth() {
    try {
        const response = await fetch(API_URL.CURRENT_USER, {credentials: 'include'});
        if (!response.ok) throw new Error('Not authenticated');

        currentUser = await response.json();

        document.getElementById('main-content').style.display = 'block';
        document.getElementById('loginSection').style.display = 'none';

        const isAdmin = currentUser.roles.some(role => role.name === 'ROLE_ADMIN');

        if (isAdmin) {
            document.querySelector('a[data-section="admin"]').style.display = 'block';
            document.querySelector('a[data-section="user"]').style.display = 'block';
            document.querySelector('a[data-section="admin"]').click(); // Открываем админку по умолчанию
        } else {
            document.querySelector('a[data-section="admin"]').style.display = 'none';
            document.querySelector('a[data-section="user"]').style.display = 'block';
            document.querySelector('a[data-section="user"]').click(); // Открываем панель юзера
        }

        await loadCurrentUser();

    } catch (error) {
        document.getElementById('main-content').style.display = 'none';
        document.getElementById('loginSection').style.display = 'block';
    }
}

// ИСПРАВЛЕНО: Форма входа теперь отправляет POST на /login, как ожидает Spring Security
document.getElementById('loginForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    try {
        const resp = await fetch('/login', { // <-- ИЗМЕНЕНИЕ
            method: 'POST',
            body: new URLSearchParams(formData),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        if (resp.ok) {
            await checkAuth(); // После успешного входа проверяем статус и загружаем данные
        } else {
            // Показываем ошибку, если вход не удался
            const errorElement = document.getElementById('loginError');
            if(errorElement) {
                errorElement.textContent = 'Неверный email или пароль';
                errorElement.style.display = 'block';
            }
        }
    } catch(err) {
        console.error("Login request failed", err);
        const errorElement = document.getElementById('loginError');
        if(errorElement) {
            errorElement.textContent = 'Ошибка сети. Попробуйте снова.';
            errorElement.style.display = 'block';
        }
    }
});


document.addEventListener('DOMContentLoaded', function() {
    // Инициализация модальных окон Bootstrap
    const userModalEl = document.getElementById('userModal');
    if (userModalEl) userModal = new bootstrap.Modal(userModalEl);

    const deleteUserModalEl = document.getElementById('deleteUserModal');
    if (deleteUserModalEl) deleteUserModal = new bootstrap.Modal(deleteUserModalEl);

    // SPA переключение
    const sidebarLinks = document.querySelectorAll('.sidebar a.nav-link');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const target = link.dataset.section;

            sidebarLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            document.querySelectorAll('.content-section').forEach(section => {
                section.classList.remove('active');
            });
            const activeSection = document.getElementById(target);
            if(activeSection) activeSection.classList.add('active');


            if (target === 'admin') initAdminPage();
            else if (target === 'user') initUserPage();
        });
    });

    // Проверяем аутентификацию при загрузке
    checkAuth();

    // Обработчик формы добавления
    document.getElementById('addUserForm')?.addEventListener('submit', saveNewUser);

    // Обработчик формы редактирования
    document.getElementById('editUserForm')?.addEventListener('submit', saveUser);

    // Обработчик кнопки выхода
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        await fetch('/logout', { method: 'POST', credentials: 'include' });
        window.location.href = "/login"; // Перезагружаем страницу на логин
    });
});


async function fetchData(url, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        credentials: 'include'
    };

    if (body) options.body = JSON.stringify(body);

    const response = await fetch(url, options);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Request failed');
    }

    if (response.status === 204 || response.headers.get("content-length") === "0") {
        return null; // Handle no content
    }

    return await response.json();
}

async function loadCurrentUser() {
    if (!currentUser) return;
    document.getElementById('currentUserEmail').textContent = currentUser.email;
    document.getElementById('currentUserRoles').textContent = currentUser.roles
        ? currentUser.roles.map(r => r.name.replace('ROLE_', '')).join(', ')
        : '';
    renderUserDataTable(); // Обновляем инфо о юзере и в его вкладке
}

async function loadRoles() {
    roles = await fetchData(API_URL.ROLES);
    populateRolesDropdown();
}

async function loadUsers() {
    users = await fetchData(API_URL.USERS);
    renderUsersTable();
}

function populateRolesDropdown() {
    const selects = [
        document.getElementById('addRoles'),
        document.getElementById('editRoles')
    ];

    selects.forEach(select => {
        if (select && roles.length) {
            select.innerHTML = roles.map(role =>
                `<option value="${role.id}">${role.name.replace('ROLE_', '')}</option>`
            ).join('');
        }
    });
}

function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    tbody.innerHTML = users.map(user => {
        const rolesDisplay = user.roles
            ? user.roles.map(r => r.name.replace('ROLE_', '')).join(', ')
            : 'No roles';

        return `
      <tr>
        <td>${user.id}</td>
        <td>${user.firstName}</td>
        <td>${user.lastName}</td>
        <td>${user.age || ''}</td>
        <td>${user.email}</td>
        <td>${rolesDisplay}</td>
        <td><button class="btn btn-sm btn-info edit-btn" data-id="${user.id}">Edit</button></td>
        <td><button class="btn btn-sm btn-danger delete-btn" data-id="${user.id}">Delete</button></td>
      </tr>
    `;
    }).join('');

    initUserButtons();
}

function initUserButtons() {
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => editUser(btn.dataset.id));
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => showDeleteModal(btn.dataset.id));
    });
}

async function saveNewUser(e) {
    e.preventDefault();
    const formData = {
        firstName: document.getElementById('addFirstName').value,
        lastName: document.getElementById('addLastName').value,
        email: document.getElementById('addEmail').value,
        password: document.getElementById('addPassword').value,
        age: parseInt(document.getElementById('addAge').value) || 0,
        roleIds: Array.from(document.getElementById('addRoles').selectedOptions, option => parseInt(option.value))
    };

    try {
        // ИСПРАВЛЕНО: URL для создания пользователя
        await fetchData(`${API_URL.BASE}/create`, 'POST', formData);

        document.getElementById('addUserForm').reset();
        await loadUsers();

        const usersTabTrigger = document.querySelector('button[data-bs-target="#users-table-tab"]');
        if (usersTabTrigger) {
            const tab = new bootstrap.Tab(usersTabTrigger);
            tab.show();
        }
    } catch (error) {
        alert('Ошибка при создании пользователя: ' + error.message);
    }
}

async function editUser(id) {
    try {
        const user = await fetchData(`${API_URL.USERS}/${id}`);
        document.getElementById('editUserId').value = user.id;
        document.getElementById('editFirstName').value = user.firstName;
        document.getElementById('editLastName').value = user.lastName;
        document.getElementById('editEmail').value = user.email;
        document.getElementById('editAge').value = user.age || '';
        document.getElementById('editPassword').value = '';

        const rolesSelect = document.getElementById('editRoles');
        Array.from(rolesSelect.options).forEach(option => {
            option.selected = user.roles?.some(r => r.id == option.value) || false;
        });

        if(userModal) userModal.show();
    } catch (error) {
        alert('Error loading user: ' + error.message);
    }
}

async function saveUser(e) {
    e.preventDefault();
    const userId = document.getElementById('editUserId').value;
    if (!userId) return;

    const formData = {
        firstName: document.getElementById('editFirstName').value,
        lastName: document.getElementById('editLastName').value,
        email: document.getElementById('editEmail').value,
        age: parseInt(document.getElementById('editAge').value) || 0,
        roleIds: Array.from(document.getElementById('editRoles').selectedOptions).map(option => parseInt(option.value))
    };

    // Пароль добавляем только если он был введен
    const password = document.getElementById('editPassword').value;
    if (password) {
        formData.password = password;
    }

    try {
        await fetchData(`${API_URL.USERS}/${userId}`, 'PUT', formData);
        if(userModal) userModal.hide();
        await loadUsers();
    } catch (error) {
        alert('Error updating user: ' + error.message);
    }
}

async function showDeleteModal(id) {
    try {
        const user = await fetchData(`${API_URL.USERS}/${id}`);
        document.getElementById('deleteUserId').value = user.id;
        document.getElementById('deleteUserFirstName').textContent = user.firstName;
        document.getElementById('deleteUserLastName').textContent = user.lastName;
        document.getElementById('deleteUserAge').textContent = user.age || '';
        document.getElementById('deleteUserEmail').textContent = user.email;

        if (deleteUserModal) deleteUserModal.show();

        document.getElementById('confirmDeleteBtn').onclick = async () => {
            await deleteUser(id);
        };

    } catch (error) {
        alert('Error loading user for deletion: ' + error.message);
    }
}

async function deleteUser(id) {
    try {
        await fetchData(`${API_URL.USERS}/${id}`, 'DELETE');
        if(deleteUserModal) deleteUserModal.hide();
        await loadUsers();
    } catch (error) {
        alert('Error deleting user: ' + error.message);
    }
}


async function initAdminPage() {
    await Promise.all([
        loadRoles(),
        loadUsers()
    ]);
}

async function initUserPage() {
    await loadCurrentUser();
}

function renderUserDataTable() {
    if (!currentUser) return;

    const tbody = document.getElementById('userDataTableBody');
    if (!tbody) return;

    const rolesDisplay = currentUser.roles
        ? currentUser.roles.map(r => r.name.replace('ROLE_', '')).join(', ')
        : 'No roles';

    tbody.innerHTML = `
    <tr>
      <td>${currentUser.id || ''}</td>
      <td>${currentUser.firstName || ''}</td>
      <td>${currentUser.lastName || ''}</td>
      <td>${currentUser.age || ''}</td>
      <td>${currentUser.email || ''}</td>
      <td>${rolesDisplay}</td>
    </tr>
  `;
}