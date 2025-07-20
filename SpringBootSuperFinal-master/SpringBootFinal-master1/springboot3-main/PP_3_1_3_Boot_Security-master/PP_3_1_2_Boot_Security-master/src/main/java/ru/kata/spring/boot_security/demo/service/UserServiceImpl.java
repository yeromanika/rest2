package ru.kata.spring.boot_security.demo.service;

import org.hibernate.Hibernate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.ui.Model;
import ru.kata.spring.boot_security.demo.model.Role;
import ru.kata.spring.boot_security.demo.model.User;
import ru.kata.spring.boot_security.demo.repository.UserRepository;

import javax.servlet.http.HttpSession;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service("userServiceImpl")
@Transactional
public class UserServiceImpl implements UserService {
    private final UserRepository userRepository;
    private final RoleService roleService;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public UserServiceImpl(UserRepository userRepository,
                           RoleService roleService,
                           PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleService = roleService;
        this.passwordEncoder = passwordEncoder;
    }


    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email);
        if (user == null) {
            throw new UsernameNotFoundException("User not found");
        }
        Hibernate.initialize(user.getRoles());
        return user;
    }

    @Transactional(readOnly = true)
    public List<User> findAllUsers() {
        List<User> users = userRepository.findAll();
        users.forEach(user -> Hibernate.initialize(user.getRoles())); // Важно!
        return users;
    }

    @Override
    @Transactional(readOnly = true) // Убедитесь, что метод транзакционный
    public User findUserById(Long id) {
        User user = userRepository.findById(id).orElse(null);
        if (user != null) {
            Hibernate.initialize(user.getRoles()); // Явно загружаем роли внутри сессии
        }
        return user;
    }

    @Override
    @Transactional
    public User createUser(User user, List<Long> roleIds) {
        if (existsByEmail(user.getEmail())) {
            throw new IllegalArgumentException("Email already exists");
        }

        if (roleIds == null || roleIds.isEmpty()) {
            throw new IllegalArgumentException("At least one role must be selected");
        }

        Set<Role> roles = new HashSet<>(roleService.findRolesByIds(roleIds));
        if (roles.isEmpty()) {
            throw new IllegalArgumentException("Invalid role IDs provided");
        }

        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setRoles(roles);
        return userRepository.save(user);
    }

    @Override
    @Transactional
    public User updateUser(Long id, User userDetails, List<Long> roleIds) {
        User existingUser = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        Set<Role> managedRoles = roleService.findRolesByIdIn(roleIds).stream()
                .map(role -> {
                    Role freshRole = roleService.findRoleById(role.getId());
                    if (freshRole == null) {
                        throw new IllegalArgumentException("Role not found: " + role.getId());
                    }
                    return freshRole;
                })
                .collect(Collectors.toSet());

        // Обновляем только необходимые поля
        existingUser.setFirstName(userDetails.getFirstName());
        existingUser.setLastName(userDetails.getLastName());
        existingUser.setEmail(userDetails.getEmail());
        existingUser.setAge(userDetails.getAge());

        if (userDetails.getPassword() != null && !userDetails.getPassword().isEmpty()) {
            existingUser.setPassword(passwordEncoder.encode(userDetails.getPassword()));
        }

        // Очищаем текущие роли и добавляем новые
        existingUser.getRoles().clear();
        existingUser.getRoles().addAll(managedRoles);

        // Сохраняем изменения
        return userRepository.save(existingUser);
    }

    @Override
    public void deleteUser(Long id) {
        userRepository.deleteById(id);
    }

    @Override
    public User findUserByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    @Override
    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }

    @Override
    public List<Long> getUserRoleIds(User user) {
        return user.getRoles().stream()
                .map(Role::getId)
                .collect(Collectors.toList());
    }

    @Override
    public String getPage(Model model, HttpSession session, Authentication auth) {
        if (Objects.isNull(auth)) {
            model.addAttribute("authenticatedName", session.getAttribute("authenticatedName"));
            session.removeAttribute("authenticatedName");

            model.addAttribute("authenticationException", session.getAttribute("authenticationException"));
            session.removeAttribute("authenticationException");


        }
        return "login-page";
    }

    @Override
    public void initializeDefaultAdmin() {
        if (!existsByEmail("admin@example.com")) {
            User admin = new User();
            admin.setFirstName("Admin");
            admin.setLastName("Adminov");
            admin.setEmail("admin@example.com");
            admin.setPassword(passwordEncoder.encode("admin"));
            admin.setAge(30);
            admin.setRoles(Set.of(
                    roleService.findRoleByName("ROLE_ADMIN"),
                    roleService.findRoleByName("ROLE_USER")
            ));
            userRepository.save(admin);
        }
    }
}