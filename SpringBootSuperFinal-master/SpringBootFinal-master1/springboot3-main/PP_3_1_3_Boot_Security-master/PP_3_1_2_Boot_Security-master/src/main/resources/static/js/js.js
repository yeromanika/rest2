// Конфигурация API
const API_URL = {
    BASE: '/api',
    USERS: '/api',
    ROLES: '/api/roles',
    CURRENT_USER: '/api/current'
};

let users = [];
let roles = [];
let currentUser = null;
let userModal = null;
let deleteUserModal = null;

document.addEventListener('DOMContentLoaded', function() {
    userModal = new bootstrap.Modal(document.getElementById('userModal'));
    deleteUserModal = new bootstrap.Modal(document.getElementById('deleteUserModal'));
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

        return await response.json();
    } catch (error) {
        console.error(`Fetch error [${method} ${url}]:`, error);
        alert('Error: ' + error.message);
        throw error;
    }
}

// 2. Функции для работы с данными --------------------------------------------
async function loadCurrentUser() {
    try {
        currentUser = await fetchData(API_URL.CURRENT_USER);
        document.getElementById('currentUserEmail').textContent = currentUser.email;
        document.getElementById('currentUserRoles').textContent = currentUser.roles
            ? currentUser.roles.map(r => r.name.replace('ROLE_', '')).join(', ')
            : '';
        renderUserProfile();
    } catch (error) {
        console.error('Failed to load current user:', error);
    }
}

async function loadUsers() {
    try {
        users = await fetchData(API_URL.USERS);
        renderUsersTable();
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

async function loadRoles() {
    try {
        roles = await fetchData(API_URL.ROLES);
        populateRolesDropdown();
    } catch (error) {
        console.error('Error loading roles:', error);
    }
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

// 3. Функции рендеринга -----------------------------------------------------
function renderUserProfile() {
    if (!currentUser) return;

    const fields = {
        'user-email': currentUser.email,
        'user-roles': currentUser.roles?.map(r => r.name.replace('ROLE_', '')).join(', ') || '',
        'profile-first-name': currentUser.firstName || '',
        'profile-last-name': currentUser.lastName || '',
        'profile-age': currentUser.age || ''
    };

    Object.entries(fields).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });
}
function renderUsersTable() {
    const tbody = document.getElementById('usersTable');
    if (!tbody) {
        console.error("Table body not found!");
        return;
    }

    tbody.innerHTML = users.map(user => {
        // Отладочный вывод
        console.log(`User ${user.id} roles:`, user.roles);

        const rolesDisplay = user.roles
            ? Object.values(user.roles).map(r => r.name.replace('ROLE_', '')).join(', ')
            : 'No roles';

        return `
        <tr>
            <td>${user.id}</td>
            <td>${user.firstName}</td>
            <td>${user.lastName}</td>
            <td>${user.age || ''}</td>
            <td>${user.email}</td>
            <td>${rolesDisplay}</td>
            <td><button class="btn btn-sm btn-primary edit-btn" data-id="${user.id}">Edit</button></td>
            <td><button class="btn btn-sm btn-danger delete-btn" data-id="${user.id}">Delete</button></td>
        </tr>
        `;
    }).join('');
}

// 4. Функции для работы с пользователями -------------------------------------
async function saveNewUser() {
    const form = document.getElementById('addUserForm');
    if (!form) return;

    const formData = {
        firstName: document.getElementById('addFirstName').value,
        lastName: document.getElementById('addLastName').value,
        email: document.getElementById('addEmail').value,
        password: document.getElementById('addPassword').value,
        age: document.getElementById('addAge').value || 0,
        roleIds: Array.from(document.getElementById('addRoles').selectedOptions)
            .map(option => parseInt(option.value))
    };

    try {
        const response = await fetch(`${API_URL.BASE}/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create user');
        }

        // Закрываем модальное окно добавления
        const addUserModal = bootstrap.Modal.getInstance(document.getElementById('addUserModal'));
        if (addUserModal) addUserModal.hide();

        // Очищаем форму
        form.reset();

        // Обновляем список пользователей
        await loadUsers();

        // Переключаемся на вкладку с таблицей пользователей
        const usersTab = document.querySelector('#users-tab');
        if (usersTab) {
            const tab = new bootstrap.Tab(usersTab);
            tab.show();
        }

        alert('User created successfully!');
    } catch (error) {
        console.error('Create user error:', error);
        alert('Error: ' + error.message);
    }
}


async function editUser(id) {
    try {
        const user = await fetchData(`${API_URL.USERS}/${id}`);

        document.getElementById('modalTitle').textContent = 'Edit User';
        document.getElementById('editUserId').value = user.id;
        document.getElementById('editFirstName').value = user.firstName;
        document.getElementById('editLastName').value = user.lastName;
        document.getElementById('editEmail').value = user.email;
        document.getElementById('editAge').value = user.age || '';
        document.getElementById('editPassword').value = '';

        const rolesSelect = document.getElementById('editRoles');
        if (rolesSelect) {
            Array.from(rolesSelect.options).forEach(option => {
                option.selected = user.roles?.some(r => r.id == option.value) || false;
            });
        }

        userModal.show();
    } catch (error) {
        console.error('Error loading user:', error);
        alert('Error loading user: ' + error.message);
    }
}

async function saveUser() {
    const userId = document.getElementById('editUserId').value;
    if (!userId) return;

    const formData = {
        firstName: document.getElementById('editFirstName').value,
        lastName: document.getElementById('editLastName').value,
        email: document.getElementById('editEmail').value,
        password: document.getElementById('editPassword').value || undefined,
        age: document.getElementById('editAge').value || 0,
        roleIds: Array.from(document.getElementById('editRoles').selectedOptions)
            .map(option => parseInt(option.value))
    };

    try {
        const response = await fetch(`${API_URL.USERS}/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update user');
        }

        userModal.hide();
        await loadUsers();
        alert('User updated successfully!');
    } catch (error) {
        console.error('Update user error:', error);
        alert('Error: ' + error.message);
    }
}


async function deleteUser(id) {
    try {
        // Получаем данные пользователя для отображения в модальном окне
        const user = await fetchData(`${API_URL.USERS}/${id}`);

        // Заполняем модальное окно данными пользователя
        document.getElementById('deleteUserId').textContent = user.id;
        document.getElementById('deleteFirstName').textContent = user.firstName;
        document.getElementById('deleteLastName').textContent = user.lastName;
        document.getElementById('deleteAge').textContent = user.age || '';
        document.getElementById('deleteEmail').textContent = user.email;
        document.getElementById('deleteRoles').textContent =
            user.roles?.map(r => r.name.replace('ROLE_', '')).join(', ') || '';

        // Показываем модальное окно подтверждения
        deleteUserModal.show();

        // Обработчик кнопки удаления в модальном окне
        document.getElementById('confirmDeleteBtn').onclick = async function() {
            try {
                await fetchData(`${API_URL.USERS}/${id}`, 'DELETE');
                deleteUserModal.hide();
                await loadUsers();

                // Переключаемся на вкладку с таблицей пользователей
                const usersTab = document.querySelector('#users-tab');
                if (usersTab) {
                    const tab = new bootstrap.Tab(usersTab);
                    tab.show();
                }

                alert('User deleted successfully!');
            } catch (error) {
                console.error('Error deleting user:', error);
                alert('Error: ' + error.message);
            }
        };
    } catch (error) {
        console.error('Error loading user for deletion:', error);
        alert('Error loading user: ' + error.message);
    }
}

// 5. Инициализация страниц --------------------------------------------------

async function initAdminPage() {
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