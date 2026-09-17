package com.returnflow.rrpms.config;

import com.returnflow.rrpms.entity.ReturnPolicy;
import com.returnflow.rrpms.entity.User;
import com.returnflow.rrpms.enums.PolicyEntityType;
import com.returnflow.rrpms.enums.Role;
import com.returnflow.rrpms.repository.ReturnPolicyRepository;
import com.returnflow.rrpms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final ReturnPolicyRepository returnPolicyRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.count() == 0) {
            String hash = passwordEncoder.encode("Password123!");

            userRepository.save(User.builder().name("Priya Sharma").email("priya@example.com").role(Role.CUSTOMER).department("—").passwordHash(hash).enabled(true).build());
            userRepository.save(User.builder().name("Rahul Verma").email("rahul.support@returnflow.io").role(Role.CUSTOMER_SUPPORT).department("Customer Support").passwordHash(hash).enabled(true).build());
            userRepository.save(User.builder().name("Deepak Nair").email("deepak.qc@returnflow.io").role(Role.WAREHOUSE_QC).department("Warehouse").passwordHash(hash).enabled(true).build());
            userRepository.save(User.builder().name("Kavita Iyer").email("kavita.finance@returnflow.io").role(Role.FINANCE).department("Finance").passwordHash(hash).enabled(true).build());
            userRepository.save(User.builder().name("Sunita Reddy").email("sunita.supplier@returnflow.io").role(Role.SUPPLIER_MANAGER).department("Operations").passwordHash(hash).enabled(true).build());
            userRepository.save(User.builder().name("Arjun Mehta").email("admin@returnflow.io").role(Role.ADMIN).department("Platform").passwordHash(hash).enabled(true).build());
        }

        if (returnPolicyRepository.count() == 0) {
            returnPolicyRepository.save(ReturnPolicy.builder()
                    .name("Electronics")
                    .entityType(PolicyEntityType.CATEGORY)
                    .entityRef("Electronics")
                    .returnWindowDays(7)
                    .freeReturn(false)
                    .exchangeEligible(true)
                    .effectiveFrom(LocalDate.now().minusYears(1))
                    .active(true)
                    .build());

            returnPolicyRepository.save(ReturnPolicy.builder()
                    .name("Apparel")
                    .entityType(PolicyEntityType.CATEGORY)
                    .entityRef("Apparel")
                    .returnWindowDays(30)
                    .freeReturn(true)
                    .exchangeEligible(true)
                    .effectiveFrom(LocalDate.now().minusYears(1))
                    .active(true)
                    .build());

            returnPolicyRepository.save(ReturnPolicy.builder()
                    .name("Food")
                    .entityType(PolicyEntityType.CATEGORY)
                    .entityRef("Food")
                    // "Food (non-returnable)" — the schema has no dedicated
                    // boolean for this, so a 0-day window is the honest way
                    // to represent it: the eligibility check in
                    // ReturnRequestService (order.deliveryDate + window)
                    // closes the window on the delivery date itself,
                    // blocking initiation the same way a true
                    // non-returnable flag would.
                    .returnWindowDays(0)
                    .freeReturn(false)
                    .exchangeEligible(false)
                    .effectiveFrom(LocalDate.now().minusYears(1))
                    .active(true)
                    .build());

            returnPolicyRepository.save(ReturnPolicy.builder()
                    .name("Platform Default")
                    .entityType(PolicyEntityType.PLATFORM)
                    .returnWindowDays(30)
                    .freeReturn(true)
                    .exchangeEligible(true)
                    .effectiveFrom(LocalDate.now().minusYears(1))
                    .active(true)
                    .build());
        }
    }
}
