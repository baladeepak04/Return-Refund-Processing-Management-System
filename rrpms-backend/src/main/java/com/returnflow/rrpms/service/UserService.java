package com.returnflow.rrpms.service;

import com.returnflow.rrpms.dto.CreateUserRequest;
import com.returnflow.rrpms.dto.UpdateUserRequest;
import com.returnflow.rrpms.entity.User;
import com.returnflow.rrpms.exception.NotFoundException;
import com.returnflow.rrpms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public List<User> list() {
        return userRepository.findAll();
    }

    public User create(CreateUserRequest req) {
        User user = User.builder()
                .name(req.name())
                .email(req.email())
                .role(req.role())
                .department(req.department())
                .passwordHash(passwordEncoder.encode(req.password()))
                .enabled(true)
                .build();
        return userRepository.save(user);
    }

    public User setEnabled(UUID id, boolean enabled) {
        User user = userRepository.findById(id).orElseThrow(() -> new NotFoundException("User not found: " + id));
        user.setEnabled(enabled);
        return userRepository.save(user);
    }

    public User update(UUID id, UpdateUserRequest req) {
        User user = userRepository.findById(id).orElseThrow(() -> new NotFoundException("User not found: " + id));
        user.setName(req.name());
        user.setRole(req.role());
        user.setDepartment(req.department());
        return userRepository.save(user);
    }

    public User setPreferredChannel(UUID id, com.returnflow.rrpms.enums.CommChannel channel) {
        User user = userRepository.findById(id).orElseThrow(() -> new NotFoundException("User not found: " + id));
        user.setPreferredChannel(channel);
        return userRepository.save(user);
    }

    public User setVip(UUID id, boolean isVip) {
        User user = userRepository.findById(id).orElseThrow(() -> new NotFoundException("User not found: " + id));
        user.setVip(isVip);
        return userRepository.save(user);
    }
}
