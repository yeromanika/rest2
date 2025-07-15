package ru.kata.spring.boot_security.demo.service;

import ru.kata.spring.boot_security.demo.model.Role;
import java.util.List;
import java.util.Set;

public interface RoleService {
    List<Role> findAllRoles();
    Role findRoleById(Long id);
    Set<Role> findRolesByIds(List<Long> ids);
    Role saveRole(Role role);
    Role findRoleByName(String name);
    Set<Role> findRolesByIdIn(List<Long> ids);
    void initializeDefaultRoles();
}