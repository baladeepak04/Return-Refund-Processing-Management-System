package com.returnflow.rrpms.controller;

import com.returnflow.rrpms.entity.User;
import com.returnflow.rrpms.enums.CommChannel;
import com.returnflow.rrpms.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users/me")
@RequiredArgsConstructor
public class UserPreferenceController {

    private final UserService userService;

    @PutMapping("/preferred-channel")
    public User setPreferredChannel(@AuthenticationPrincipal User principal, @RequestParam CommChannel channel) {
        return userService.setPreferredChannel(principal.getId(), channel);
    }
}
