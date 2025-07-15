// Конфигурация API
const API_URL = '/api';
let users = [];
let roles = [];
let currentUser = null;
let userModal = null;

document.addEventListener('DOMContentLoaded', function() {
    // Инициализация модального окна
    userModal = new bootstrap.Modal(document.getElementById('userModal'));

    // Определяем тип страницы
    if (document.getElementById('usersTable')) {
        initAdminPage();
    } else if (document.getElementById('user-profile-card')) {
        initUserPage();
    }
});

// 1. Общие функции -----------------------------------------------------------

async function fetchData(url, method = 'GET', body = null) {
    try {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        };

        if (body) options.body = JSON.stringify(body);

        const response = await fetch(url, options);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || error.message || 'Request failed');
        }

        return await response.json();
    } catch (error) {
        console.error('Fetch error:', error);
        alert('Error: ' + error.message);
        throw error;
    }
}

// 2. Функции для работы с данными --------------------------------------------

async function loadCurrentUser() {
    try {
        currentUser = await fetchData(`${API_URL}/current`);
        renderUserProfile();
        return currentUser;
    } catch (error) {
        console.error('Failed to load current user:', error);
        return null;
    }
}

async function loadUsers() {
    try {
        users = await fetchData(`${API_URL}`);
        renderUsersTable();
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

async function loadRoles() {
    try {
        roles = await fetchData(`${API_URL}/roles`);
        populateRolesDropdown();
    } catch (error) {
        console.error('Error loading roles:', error);
    }
}

// 3. Функции рендеринга -----------------------------------------------------

function renderUserProfile() {
    if (!currentUser) return;

    const emailElement = document.getElementById('user-email');
    const rolesElement = document.getElementById('user-roles');
    const firstNameElement = document.getElementById('profile-first-name');
    const lastNameElement = document.getElementById('profile-last-name');
    const ageElement = document.getElementById('profile-age');

    if (emailElement) emailElement.textContent = currentUser.email;
    if (rolesElement) rolesElement.textContent = currentUser.roles
        ? currentUser.roles.map(r => r.name.replace('ROLE_', '')).join(', ')
        : '';
    if (firstNameElement) firstNameElement.textContent = currentUser.firstName || '';
    if (lastNameElement) lastNameElement.textContent = currentUser.lastName || '';
    if (ageElement) ageElement.textContent = currentUser.age || '';
}

function renderUsersTable() {
    const tbody = document.querySelector('#usersTable tbody');
    if (!tbody) return;

    tbody.innerHTML = users.map(user => {
        // Проверяем наличие ролей и правильно их форматируем
        const roles = user.roles && user.roles.length > 0
            ? user.roles.map(r => r.name.replace('ROLE_', '')).join(', ')
            : 'No roles';

        return `
        <tr>
            <td>${user.id}</td>
            <td>${user.firstName}</td>
            <td>${user.lastName}</td>
            <td>${user.email}</td>
            <td>${roles}</td>
            <td>
                <button class="btn btn-sm btn-primary edit-btn" data-id="${user.id}">Edit</button>
                <button class="btn btn-sm btn-danger delete-btn" data-id="${user.id}">Delete</button>
            </td>
        </tr>`;
    }).join('');

    // Добавляем обработчики для кнопок в таблице
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => editUser(btn.dataset.id));
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteUser(btn.dataset.id));
    });
}

function populateRolesDropdown() {
    const select = document.getElementById('roles');
    if (!select) return;

    select.innerHTML = roles.map(role => `
        <option value="${role.id}">${role.name.replace('ROLE_', '')}</option>
    `).join('');
}

// 4. Функции для работы с пользователями -------------------------------------

async function saveUser() {
    const formData = {
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        age: document.getElementById('age')?.value || 0, // Добавляем возраст
        roleIds: Array.from(document.getElementById('roles').selectedOptions)
            .map(option => parseInt(option.value))
    };

    const userId = document.getElementById('userId').value;
    const url = userId ? `${API_URL}/${userId}` : `${API_URL}`;
    const method = userId ? 'PUT' : 'POST';

    try {
        const response = await fetchData(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || error.message || 'Request failed');
        }

        if (userModal) userModal.hide();
        await loadUsers();
    } catch (error) {
        console.error('Error saving user:', error);
        alert('Error saving user: ' + error.message);
    }
}

async function editUser(id) {
    try {
        const user = await fetchData(`${API_URL}/${id}`);

        document.getElementById('modalTitle').textContent = 'Edit User';
        document.getElementById('userId').value = user.id;
        document.getElementById('firstName').value = user.firstName;
        document.getElementById('lastName').value = user.lastName;
        document.getElementById('email').value = user.email;
        document.getElementById('age').value = user.age || '';
        document.getElementById('password').value = '';

        // Сбрасываем выделение ролей
        const rolesSelect = document.getElementById('roles');
        Array.from(rolesSelect.options).forEach(option => {
            option.selected = user.roles.some(r => r.id == option.value);
        });

        userModal.show();
    } catch (error) {
        console.error('Error loading user:', error);
        alert('Error loading user: ' + error.message);
    }
}

async function deleteUser(id) {
    if (confirm('Are you sure you want to delete this user?')) {
        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            // Обрабатываем случай, когда сервер возвращает 204 No Content
            if (response.status === 204) {
                await loadUsers();
                return;
            }

            // Если сервер возвращает что-то кроме 204, пробуем распарсить JSON
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to delete user');
            }

            await loadUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Error deleting user: ' + error.message);
        }
    }
}

// 5. Инициализация страниц --------------------------------------------------

function initAdminPage() {
    // Загрузка данных
    Promise.all([loadCurrentUser(), loadRoles(), loadUsers()])
        .catch(error => console.error('Initialization error:', error));

    // Обработчики кнопок
    document.getElementById('addUserBtn').addEventListener('click', () => {
        document.getElementById('modalTitle').textContent = 'Add User';
        document.getElementById('userId').value = '';
        document.getElementById('userForm').reset();
        userModal.show();
    });

    document.getElementById('saveUserBtn').addEventListener('click', saveUser);
    document.getElementById('logoutBtn').addEventListener('click', () => {
        window.location.href = '/logout';
    });


}

function initUserPage() {
    loadCurrentUser();
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        window.location.href = '/logout';
    });
}