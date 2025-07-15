package ru.kata.spring.boot_security.demo.service;

import org.springframework.lang.Nullable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.ui.Model;
import ru.kata.spring.boot_security.demo.model.User;

import javax.servlet.http.HttpSession;
import java.util.List;

public interface UserService extends UserDetailsService {
    List<User> findAllUsers();
    User findUserById(Long id);
    User createUser(User user, List<Long> roleIds);
    User updateUser(Long id, User user, List<Long> roleIds);
    void deleteUser(Long id);
    User findUserByEmail(String email);
    boolean existsByEmail(String email);
    void initializeDefaultAdmin();
    List<Long> getUserRoleIds(User user);

    String getPage(Model model, HttpSession session, @Nullable Authentication auth);
}