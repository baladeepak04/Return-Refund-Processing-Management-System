package com.returnflow.rrpms.controller;

import com.returnflow.rrpms.dto.CreateUserRequest;
import com.returnflow.rrpms.dto.UpdateUserRequest;
import com.returnflow.rrpms.dto.UserResponse;
import com.returnflow.rrpms.entity.User;
import com.returnflow.rrpms.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final UserService userService;

    @GetMapping
    public List<UserResponse> list() {
        return userService.list().stream().map(UserResponse::from).toList();
    }

    @PostMapping
    public UserResponse create(@Valid @RequestBody CreateUserRequest request) {
        return UserResponse.from(userService.create(request));
    }

    @PutMapping("/{id}/disable")
    public UserResponse disable(@PathVariable UUID id) {
        return UserResponse.from(userService.setEnabled(id, false));
    }

    @PutMapping("/{id}/enable")
    public UserResponse enable(@PathVariable UUID id) {
        return UserResponse.from(userService.setEnabled(id, true));
    }

    @PutMapping("/{id}")
    public UserResponse update(@PathVariable UUID id, @Valid @RequestBody UpdateUserRequest request) {
        return UserResponse.from(userService.update(id, request));
    }

    @PutMapping("/{id}/vip")
    public UserResponse setVip(@PathVariable UUID id, @RequestParam boolean isVip) {
        return UserResponse.from(userService.setVip(id, isVip));
    }
}
