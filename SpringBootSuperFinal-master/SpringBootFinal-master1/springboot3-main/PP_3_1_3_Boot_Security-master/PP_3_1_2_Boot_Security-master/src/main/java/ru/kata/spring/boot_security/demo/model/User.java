package ru.kata.spring.boot_security.demo.model;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import javax.persistence.*;
import javax.validation.constraints.*;
import java.util.*;
import java.util.stream.Collectors;

@Entity
@Table(name = "users")
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotEmpty(message = "First name should not be empty")
    @Size(min = 2, max = 30, message = "First name should be between 2 and 30 characters")
    @Column(nullable = false)
    private String firstName;

    @NotEmpty(message = "Last name should not be empty")
    @Size(min = 2, max = 30, message = "Last name should be between 2 and 30 characters")
    @Column(nullable = false)
    private String lastName;

    @NotEmpty(message = "Email should not be empty")
    @Email(message = "Email should be valid")
    @Column(unique = true, nullable = false)
    private String email;

    @NotEmpty(message = "Password should not be empty")
    @Column(nullable = false)
    @Size(min = 5, message = "Пароль должен содержать минимум 5 символов")
    private String password;


    @Min(value = 0, message = "Age should not be less than 0")
    @Max(value = 150, message = "Age should not be greater than 150")
    @Column(nullable = false)
    private Integer age;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "users_roles",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "role_id"))
    private Set<Role> roles;

    // Конструкторы
    public User() {
        this.roles = new HashSet<>();
    }

    public User(String firstName, String lastName, String email,
                String password, Integer age, Set<Role> roles) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.password = password;
        this.age = age;
        this.roles = roles;
    }

    // Геттеры и сеттеры
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }


    @Override
    public String getUsername() { return email;}

    public String getEmail() { return email;}
    public void setEmail(String email) {
        this.email = email;
    }

    @Override
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }

    public Set<Role> getRoles() { return roles; }

    public void setRoles(Set<Role> newRoles) {
        this.roles.clear();
        if (newRoles != null) {
            this.roles.addAll(newRoles);
        }
    }


    // UserDetails методы
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return roles;
    }

    @Override
    public boolean isAccountNonExpired() { return true; }

    @Override
    public boolean isAccountNonLocked() { return true; }

    @Override
    public boolean isCredentialsNonExpired() { return true; }

    @Override
    public boolean isEnabled() { return true; }


    public void addRole(Role role) {
        if (roles == null) {
            roles = new HashSet<>();
        }
        roles.add(role);
    }


    @Transient
    private List<Long> roleIds; // Добавленное поле


    @Transient
    public List<Long> getRoleIds() {
        return this.roleIds != null ? this.roleIds : new ArrayList<>();
    }

    @Transient
    public void setRoleIds(List<Long> roleIds) {
        this.roleIds = roleIds;
    }



    @Override
    public String toString() {
        return "User{" +
                "id=" + id +
                ", firstName='" + firstName + '\'' +
                ", lastName='" + lastName + '\'' +
                ", email='" + email + '\'' +
                ", password='[PROTECTED]'" +
                ", age=" + age +
                ", roles=" + roles +
                '}';
    }

}
