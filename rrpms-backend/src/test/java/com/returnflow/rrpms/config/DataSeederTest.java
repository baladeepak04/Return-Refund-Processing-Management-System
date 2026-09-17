package com.returnflow.rrpms.config;

import com.returnflow.rrpms.entity.ReturnPolicy;
import com.returnflow.rrpms.entity.User;
import com.returnflow.rrpms.repository.ReturnPolicyRepository;
import com.returnflow.rrpms.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DataSeederTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private ReturnPolicyRepository returnPolicyRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private DataSeeder dataSeeder;

    @Test
    void testSeedsWhenEmpty() {
        when(userRepository.count()).thenReturn(0L);
        when(returnPolicyRepository.count()).thenReturn(0L);
        when(passwordEncoder.encode("Password123!")).thenReturn("hashedPassword");

        dataSeeder.run();

        verify(userRepository, times(6)).save(any(User.class));
        verify(returnPolicyRepository, times(4)).save(any(ReturnPolicy.class));
    }

    @Test
    void testDoesNotSeedWhenAlreadyPopulated() {
        when(userRepository.count()).thenReturn(6L);
        when(returnPolicyRepository.count()).thenReturn(4L);

        dataSeeder.run();

        verify(userRepository, never()).save(any(User.class));
        verify(returnPolicyRepository, never()).save(any(ReturnPolicy.class));
    }
}
