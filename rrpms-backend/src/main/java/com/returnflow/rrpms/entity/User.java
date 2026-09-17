package com.returnflow.rrpms.entity;

import com.returnflow.rrpms.enums.Role;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User {
    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    private String department;

    @Builder.Default
    private boolean enabled = true;

    private Instant lastLogin;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private com.returnflow.rrpms.enums.CommChannel preferredChannel = com.returnflow.rrpms.enums.CommChannel.SMS;

    @Builder.Default
    private boolean isVip = false;

    @Builder.Default
    private Instant createdAt = Instant.now();
}
