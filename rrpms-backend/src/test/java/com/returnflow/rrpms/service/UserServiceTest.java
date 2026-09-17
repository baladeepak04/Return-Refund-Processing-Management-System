package com.returnflow.rrpms.service;

import com.returnflow.rrpms.dto.CreateUserRequest;
import com.returnflow.rrpms.dto.UpdateUserRequest;
import com.returnflow.rrpms.entity.User;
import com.returnflow.rrpms.enums.CommChannel;
import com.returnflow.rrpms.enums.Role;
import com.returnflow.rrpms.exception.NotFoundException;
import com.returnflow.rrpms.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @InjectMocks private UserService userService;

    @Test
    void create_hashesPassword_neverStoresPlainText() {
        when(passwordEncoder.encode("plainPassword123")).thenReturn("$2a$10$hashedvalue");
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CreateUserRequest req = new CreateUserRequest("Priya Sharma", "priya@rrpms.com", Role.CUSTOMER, null, "plainPassword123");
        User result = userService.create(req);

        assertThat(result.getPasswordHash()).isEqualTo("$2a$10$hashedvalue");
        assertThat(result.getPasswordHash()).isNotEqualTo("plainPassword123");
        assertThat(result.isEnabled()).isTrue();
    }

    @Test
    void setEnabled_toggles_existingUser() {
        UUID id = UUID.randomUUID();
        User user = User.builder().id(id).enabled(true).build();
        when(userRepository.findById(id)).thenReturn(java.util.Optional.of(user));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        User result = userService.setEnabled(id, false);

        assertThat(result.isEnabled()).isFalse();
    }

    @Test
    void setEnabled_throwsNotFound_whenMissing() {
        UUID id = UUID.randomUUID();
        when(userRepository.findById(id)).thenReturn(java.util.Optional.empty());

        assertThatThrownBy(() -> userService.setEnabled(id, false)).isInstanceOf(NotFoundException.class);
    }

    @Test
    void update_changesNameRoleDepartment_leavesEmailUntouched() {
        UUID id = UUID.randomUUID();
        User user = User.builder().id(id).name("Old Name").email("keep@rrpms.com").role(Role.CUSTOMER).build();
        when(userRepository.findById(id)).thenReturn(java.util.Optional.of(user));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UpdateUserRequest req = new UpdateUserRequest("New Name", Role.CUSTOMER_SUPPORT, "Support");
        User result = userService.update(id, req);

        assertThat(result.getName()).isEqualTo("New Name");
        assertThat(result.getRole()).isEqualTo(Role.CUSTOMER_SUPPORT);
        assertThat(result.getEmail()).isEqualTo("keep@rrpms.com");
    }

    @Test
    void setPreferredChannel_updatesChannel() {
        UUID id = UUID.randomUUID();
        User user = User.builder().id(id).preferredChannel(CommChannel.SMS).build();
        when(userRepository.findById(id)).thenReturn(java.util.Optional.of(user));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        User result = userService.setPreferredChannel(id, CommChannel.WHATSAPP);

        assertThat(result.getPreferredChannel()).isEqualTo(CommChannel.WHATSAPP);
    }
}
