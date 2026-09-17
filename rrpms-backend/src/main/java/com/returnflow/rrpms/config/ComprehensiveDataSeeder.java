package com.returnflow.rrpms.config;

import com.returnflow.rrpms.entity.*;
import com.returnflow.rrpms.enums.*;
import com.returnflow.rrpms.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Slf4j
@Component
@Order(2)
@RequiredArgsConstructor
public class ComprehensiveDataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final ReturnPolicyRepository returnPolicyRepository;
    private final CustomerReturnStatsRepository customerReturnStatsRepository;
    private final ReturnRequestRepository returnRequestRepository;
    private final ReturnItemRepository returnItemRepository;
    private final PickupRepository pickupRepository;
    private final QcInspectionRepository qcInspectionRepository;
    private final RestockedItemRepository restockedItemRepository;
    private final RefundRepository refundRepository;
    private final LiquidationBatchRepository liquidationBatchRepository;
    private final RtmBatchRepository rtmBatchRepository;
    private final SupplierReturnRepository supplierReturnRepository;
    private final FraudFlagRepository fraudFlagRepository;
    private final ReturnCommunicationRepository returnCommunicationRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        // Idempotency check: only run full population once, but backfill any null refund_amount or product_name
        if (returnRequestRepository.count() > 10) {
            backfillExistingReturns();
            log.info("Comprehensive data already populated (found {} returns). Skipping seed.", returnRequestRepository.count());
            return;
        }

        log.info("Starting comprehensive data seeding for realistic demo environment...");

        // 1. Seed additional Policies (Category & Seller policies)
        Map<String, ReturnPolicy> policies = seedPolicies();

        // 2. Seed realistic Users (Customers, Support, QC, Finance, Supplier Manager)
        Map<String, User> users = seedUsers();

        // 3. Seed Customer Return Stats for all customers
        seedCustomerStats(users);

        // 4. Seed Returns with Items, Pickups, QC Inspections, Restocks, Refunds, Communications
        seedReturnsAndWorkflows(policies, users);

        // 5. Seed Liquidation Batches
        seedLiquidationBatches();

        // 6. Seed RTM Batches and Supplier Returns
        seedRtmAndSupplierReturns(users);

        log.info("Comprehensive data seeding completed successfully! Populated real database tables.");
    }

    private Map<String, ReturnPolicy> seedPolicies() {
        Map<String, ReturnPolicy> policyMap = new HashMap<>();
        returnPolicyRepository.findAll().forEach(p -> policyMap.put(p.getName(), p));

        List<ReturnPolicy> newPolicies = List.of(
                ReturnPolicy.builder()
                        .name("Footwear")
                        .entityType(PolicyEntityType.CATEGORY)
                        .entityRef("Footwear")
                        .returnWindowDays(15)
                        .freeReturn(true)
                        .exchangeEligible(true)
                        .effectiveFrom(LocalDate.now().minusYears(1))
                        .active(true)
                        .build(),
                ReturnPolicy.builder()
                        .name("Luxury Watches")
                        .entityType(PolicyEntityType.CATEGORY)
                        .entityRef("Luxury Watches")
                        .returnWindowDays(7)
                        .freeReturn(false)
                        .exchangeEligible(true)
                        .effectiveFrom(LocalDate.now().minusYears(1))
                        .active(true)
                        .build(),
                ReturnPolicy.builder()
                        .name("Home & Kitchen")
                        .entityType(PolicyEntityType.CATEGORY)
                        .entityRef("Home & Kitchen")
                        .returnWindowDays(10)
                        .freeReturn(true)
                        .exchangeEligible(true)
                        .effectiveFrom(LocalDate.now().minusYears(1))
                        .active(true)
                        .build(),
                ReturnPolicy.builder()
                        .name("Beauty & Personal Care")
                        .entityType(PolicyEntityType.CATEGORY)
                        .entityRef("Beauty & Personal Care")
                        .returnWindowDays(0)
                        .freeReturn(false)
                        .exchangeEligible(false)
                        .effectiveFrom(LocalDate.now().minusYears(1))
                        .active(true)
                        .build(),
                ReturnPolicy.builder()
                        .name("Sports & Fitness")
                        .entityType(PolicyEntityType.CATEGORY)
                        .entityRef("Sports & Fitness")
                        .returnWindowDays(14)
                        .freeReturn(true)
                        .exchangeEligible(true)
                        .effectiveFrom(LocalDate.now().minusYears(1))
                        .active(true)
                        .build(),
                ReturnPolicy.builder()
                        .name("Books & Media")
                        .entityType(PolicyEntityType.CATEGORY)
                        .entityRef("Books & Media")
                        .returnWindowDays(7)
                        .freeReturn(true)
                        .exchangeEligible(false)
                        .effectiveFrom(LocalDate.now().minusYears(1))
                        .active(true)
                        .build(),
                ReturnPolicy.builder()
                        .name("Apple Authorised Store")
                        .entityType(PolicyEntityType.SELLER)
                        .entityRef("Apple Distribution India")
                        .returnWindowDays(14)
                        .freeReturn(false)
                        .exchangeEligible(true)
                        .effectiveFrom(LocalDate.now().minusYears(1))
                        .active(true)
                        .build(),
                ReturnPolicy.builder()
                        .name("Nike Flagship Store")
                        .entityType(PolicyEntityType.SELLER)
                        .entityRef("Nike Retail India")
                        .returnWindowDays(30)
                        .freeReturn(true)
                        .exchangeEligible(true)
                        .effectiveFrom(LocalDate.now().minusYears(1))
                        .active(true)
                        .build()
        );

        for (ReturnPolicy p : newPolicies) {
            if (!policyMap.containsKey(p.getName())) {
                ReturnPolicy saved = returnPolicyRepository.save(p);
                policyMap.put(saved.getName(), saved);
            }
        }
        return policyMap;
    }

    private Map<String, User> seedUsers() {
        Map<String, User> userMap = new HashMap<>();
        userRepository.findAll().forEach(u -> userMap.put(u.getEmail(), u));
        String hash = passwordEncoder.encode("Password123!");

        List<User> newUsers = List.of(
                // Customers
                User.builder().name("Aarav Patel").email("aarav.patel@example.com").role(Role.CUSTOMER).department("—").passwordHash(hash).preferredChannel(CommChannel.WHATSAPP).isVip(true).enabled(true).build(),
                User.builder().name("Neha Gupta").email("neha.gupta@example.com").role(Role.CUSTOMER).department("—").passwordHash(hash).preferredChannel(CommChannel.SMS).isVip(false).enabled(true).build(),
                User.builder().name("Vikram Malhotra").email("vikram.malhotra@example.com").role(Role.CUSTOMER).department("—").passwordHash(hash).preferredChannel(CommChannel.EMAIL).isVip(true).enabled(true).build(),
                User.builder().name("Ananya Sen").email("ananya.sen@example.com").role(Role.CUSTOMER).department("—").passwordHash(hash).preferredChannel(CommChannel.WHATSAPP).isVip(false).enabled(true).build(),
                User.builder().name("Rohan Joshi").email("rohan.joshi@example.com").role(Role.CUSTOMER).department("—").passwordHash(hash).preferredChannel(CommChannel.SMS).isVip(false).enabled(true).build(),
                User.builder().name("Pooja Hegde").email("pooja.hegde@example.com").role(Role.CUSTOMER).department("—").passwordHash(hash).preferredChannel(CommChannel.EMAIL).isVip(false).enabled(true).build(),
                User.builder().name("Aditya Rao").email("aditya.rao@example.com").role(Role.CUSTOMER).department("—").passwordHash(hash).preferredChannel(CommChannel.WHATSAPP).isVip(false).enabled(true).build(),
                User.builder().name("Sneha Kulkarni").email("sneha.k@example.com").role(Role.CUSTOMER).department("—").passwordHash(hash).preferredChannel(CommChannel.SMS).isVip(true).enabled(true).build(),
                User.builder().name("Karthik Raman").email("karthik.raman@example.com").role(Role.CUSTOMER).department("—").passwordHash(hash).preferredChannel(CommChannel.EMAIL).isVip(false).enabled(true).build(),
                User.builder().name("Meera Nambiar").email("meera.nambiar@example.com").role(Role.CUSTOMER).department("—").passwordHash(hash).preferredChannel(CommChannel.WHATSAPP).isVip(false).enabled(true).build(),
                User.builder().name("Siddharth Deshmukh").email("sid.deshmukh@example.com").role(Role.CUSTOMER).department("—").passwordHash(hash).preferredChannel(CommChannel.SMS).isVip(false).enabled(true).build(),
                User.builder().name("Divya Sundaram").email("divya.s@example.com").role(Role.CUSTOMER).department("—").passwordHash(hash).preferredChannel(CommChannel.EMAIL).isVip(true).enabled(true).build(),

                // Support staff
                User.builder().name("Fatima Sheikh").email("fatima.support@returnflow.io").role(Role.CUSTOMER_SUPPORT).department("Customer Support").passwordHash(hash).enabled(true).build(),
                User.builder().name("Rajesh Kumar").email("rajesh.support@returnflow.io").role(Role.CUSTOMER_SUPPORT).department("Customer Support").passwordHash(hash).enabled(true).build(),

                // QC Specialists
                User.builder().name("Manoj Tiwari").email("manoj.qc@returnflow.io").role(Role.WAREHOUSE_QC).department("Warehouse QC").passwordHash(hash).enabled(true).build(),
                User.builder().name("Praveen Yadav").email("praveen.qc@returnflow.io").role(Role.WAREHOUSE_QC).department("Warehouse QC").passwordHash(hash).enabled(true).build(),

                // Finance Managers
                User.builder().name("Sanjay Singhania").email("sanjay.finance@returnflow.io").role(Role.FINANCE).department("Finance & Accounts").passwordHash(hash).enabled(true).build(),
                User.builder().name("Anuradha Roy").email("anuradha.finance@returnflow.io").role(Role.FINANCE).department("Finance & Accounts").passwordHash(hash).enabled(true).build(),

                // Supplier Manager
                User.builder().name("Harish Kapoor").email("harish.supplier@returnflow.io").role(Role.SUPPLIER_MANAGER).department("Vendor Operations").passwordHash(hash).enabled(true).build()
        );

        for (User u : newUsers) {
            if (!userMap.containsKey(u.getEmail())) {
                User saved = userRepository.save(u);
                userMap.put(saved.getEmail(), saved);
            }
        }
        return userMap;
    }

    private void seedCustomerStats(Map<String, User> users) {
        Map<String, int[]> statsData = Map.ofEntries(
                Map.entry("priya@example.com", new int[]{35, 3, 1, 0}),
                Map.entry("aarav.patel@example.com", new int[]{24, 3, 1, 0}),
                Map.entry("neha.gupta@example.com", new int[]{32, 9, 4, 0}),
                Map.entry("vikram.malhotra@example.com", new int[]{40, 4, 0, 0}),
                Map.entry("ananya.sen@example.com", new int[]{15, 8, 5, 1}),
                Map.entry("rohan.joshi@example.com", new int[]{28, 11, 6, 1}),
                Map.entry("pooja.hegde@example.com", new int[]{12, 2, 1, 0}),
                Map.entry("aditya.rao@example.com", new int[]{9, 5, 3, 1}),
                Map.entry("sneha.k@example.com", new int[]{35, 2, 0, 0}),
                Map.entry("karthik.raman@example.com", new int[]{19, 4, 1, 0}),
                Map.entry("meera.nambiar@example.com", new int[]{22, 7, 3, 0}),
                Map.entry("sid.deshmukh@example.com", new int[]{14, 8, 4, 1}),
                Map.entry("divya.s@example.com", new int[]{45, 3, 1, 0})
        );

        for (var entry : statsData.entrySet()) {
            User user = users.get(entry.getKey());
            if (user != null && customerReturnStatsRepository.findByCustomerId(user.getId()).isEmpty()) {
                int totalOrders = entry.getValue()[0];
                int totalReturns = entry.getValue()[1];
                int mindChange = entry.getValue()[2];
                boolean isFlagged = entry.getValue()[3] == 1;
                BigDecimal rate = totalOrders > 0
                        ? BigDecimal.valueOf((double) totalReturns / totalOrders * 100).setScale(2, java.math.RoundingMode.HALF_UP)
                        : BigDecimal.ZERO;

                customerReturnStatsRepository.save(CustomerReturnStats.builder()
                        .customerId(user.getId())
                        .totalOrders(totalOrders)
                        .totalReturns(totalReturns)
                        .returnRate(rate)
                        .mindChangeReturns(mindChange)
                        .isFlagged(isFlagged)
                        .build());
            }
        }
    }

    private void seedReturnsAndWorkflows(Map<String, ReturnPolicy> policies, Map<String, User> users) {
        User priya = users.get("priya@example.com");
        User aarav = users.get("aarav.patel@example.com");
        User neha = users.get("neha.gupta@example.com");
        User vikram = users.get("vikram.malhotra@example.com");
        User ananya = users.get("ananya.sen@example.com");
        User rohan = users.get("rohan.joshi@example.com");
        User pooja = users.get("pooja.hegde@example.com");
        User aditya = users.get("aditya.rao@example.com");
        User sneha = users.get("sneha.k@example.com");
        User karthik = users.get("karthik.raman@example.com");
        User meera = users.get("meera.nambiar@example.com");
        User sid = users.get("sid.deshmukh@example.com");
        User divya = users.get("divya.s@example.com");

        User qcDeepak = users.get("deepak.qc@returnflow.io");
        User qcManoj = users.get("manoj.qc@returnflow.io");
        User qcPraveen = users.get("praveen.qc@returnflow.io");

        ReturnPolicy electronics = policies.getOrDefault("Electronics", policies.get("Platform Default"));
        ReturnPolicy apparel = policies.getOrDefault("Apparel", policies.get("Platform Default"));
        ReturnPolicy footwear = policies.getOrDefault("Footwear", policies.get("Platform Default"));
        ReturnPolicy luxury = policies.getOrDefault("Luxury Watches", policies.get("Platform Default"));
        ReturnPolicy home = policies.getOrDefault("Home & Kitchen", policies.get("Platform Default"));
        ReturnPolicy sports = policies.getOrDefault("Sports & Fitness", policies.get("Platform Default"));
        ReturnPolicy nike = policies.getOrDefault("Nike Flagship Store", policies.get("Platform Default"));
        ReturnPolicy apple = policies.getOrDefault("Apple Authorised Store", policies.get("Platform Default"));

        Instant now = Instant.now();

        // Build list of return specifications:
        record ReturnSeedSpec(
                User customer,
                ReturnPolicy policy,
                ReturnType returnType,
                String reasonCode,
                ReturnStatus status,
                PreferredRefundMethod prefMethod,
                SalesChannel channel,
                int daysAgo,
                BigDecimal amount,
                String skuName,
                String skuCategory,
                String returnReason,
                String address,
                LogisticsPartner partner,
                PickupStatus pickupStatus,
                ConditionGrade grade,
                FunctionalTest funcTest,
                boolean complaintVal,
                Disposition disposition,
                String qcNotes,
                RestockType restockType,
                BigDecimal newPrice,
                RefundStatus refundStatus,
                Integer npsRating,
                String npsComment
        ) {}

        List<ReturnSeedSpec> specs = List.of(
                // 1. INITIATED (Fresh returns)
                new ReturnSeedSpec(aarav, apple, ReturnType.RETURN, "DEFECTIVE_PRODUCT", ReturnStatus.INITIATED, PreferredRefundMethod.ORIGINAL, SalesChannel.MOBILE_APP, 1, new BigDecimal("24999.00"), "Apple AirPods Max (Silver)", "Electronics", "Left ear cup audio balance distortion", "Villa 42, Palm Meadows, Whitefield, Bengaluru 560066", LogisticsPartner.DELHIVERY, null, null, null, false, null, null, null, null, null, null, null),
                new ReturnSeedSpec(neha, footwear, ReturnType.EXCHANGE, "WRONG_SIZE", ReturnStatus.INITIATED, PreferredRefundMethod.STORE_CREDIT, SalesChannel.WEB, 1, new BigDecimal("4299.00"), "Puma Nitro Elite Running Shoes (UK 6)", "Footwear", "Too narrow in toe box, need UK 7", "Flat 302, Green Glen Layout, Bellandur, Bengaluru 560103", LogisticsPartner.SHIPROCKET, null, null, null, false, null, null, null, null, null, null, null),
                new ReturnSeedSpec(pooja, home, ReturnType.RETURN, "COLOR_MISMATCH", ReturnStatus.INITIATED, PreferredRefundMethod.BANK_TRANSFER, SalesChannel.MARKETPLACE, 2, new BigDecimal("3490.00"), "Wonderchef Nutri-Blend Mixer Grinder (Ruby Red)", "Home & Kitchen", "Received Champagne Gold instead of Ruby Red", "House 12, Indiranagar 100 Feet Rd, Bengaluru 560038", LogisticsPartner.DELHIVERY, null, null, null, false, null, null, null, null, null, null, null),
                new ReturnSeedSpec(vikram, luxury, ReturnType.RETURN, "QUALITY_UNSATISFACTORY", ReturnStatus.INITIATED, PreferredRefundMethod.ORIGINAL, SalesChannel.WEB, 2, new BigDecimal("45000.00"), "Tissot PRX Powermatic 80 Automatic Watch", "Luxury Watches", "Clasp mechanism feels stiff and misaligned", "Apartment 1801, Lodha Bellissimo, Mahalaxmi, Mumbai 400011", LogisticsPartner.SHIPROCKET, null, null, null, false, null, null, null, null, null, null, null),

                // 2. PICKUP_SCHEDULED (Pickup assigned / scheduled)
                new ReturnSeedSpec(ananya, apparel, ReturnType.RETURN, "NOT_AS_DESCRIBED", ReturnStatus.PICKUP_SCHEDULED, PreferredRefundMethod.STORE_CREDIT, SalesChannel.MOBILE_APP, 3, new BigDecimal("2799.00"), "Zara Floral Embroidered Midi Dress (M)", "Apparel", "Fabric blend feels synthetic, not 100% linen as listed", "Flat 4B, Salt Lake Sector 2, Kolkata 700091", LogisticsPartner.DELHIVERY, PickupStatus.SCHEDULED, null, null, false, null, null, null, null, null, null, null),
                new ReturnSeedSpec(karthik, electronics, ReturnType.RETURN, "DEFECTIVE_PRODUCT", ReturnStatus.PICKUP_SCHEDULED, PreferredRefundMethod.BANK_TRANSFER, SalesChannel.WEB, 3, new BigDecimal("6499.00"), "Logitech MX Master 3S Wireless Performance Mouse", "Electronics", "Scroll wheel ratchet mechanism clicking intermittently", "14/2 Anna Salai, Teynampet, Chennai 600018", LogisticsPartner.SHIPROCKET, PickupStatus.AGENT_ASSIGNED, null, null, false, null, null, null, null, null, null, null),
                new ReturnSeedSpec(sneha, sports, ReturnType.EXCHANGE, "WRONG_SIZE", ReturnStatus.PICKUP_SCHEDULED, PreferredRefundMethod.STORE_CREDIT, SalesChannel.WEB, 4, new BigDecimal("5999.00"), "Garmin HRM-Pro Plus Heart Rate Chest Strap", "Sports & Fitness", "Chest band circumference too tight for training", "Villa 9, Kalyani Nagar, Pune 411006", LogisticsPartner.DELHIVERY, PickupStatus.SCHEDULED, null, null, false, null, null, null, null, null, null, null),
                new ReturnSeedSpec(divya, apparel, ReturnType.RETURN, "CHANGED_MIND", ReturnStatus.PICKUP_SCHEDULED, PreferredRefundMethod.ORIGINAL, SalesChannel.MARKETPLACE, 4, new BigDecimal("3899.00"), "FabIndia Handblock Printed Tussar Silk Dupatta", "Apparel", "Color does not match existing kurti set", "B-404, Ceebros Boulevard, OMR, Chennai 600097", LogisticsPartner.SHIPROCKET, PickupStatus.SCHEDULED, null, null, false, null, null, null, null, null, null, null),
                new ReturnSeedSpec(rohan, electronics, ReturnType.RETURN, "DAMAGED_IN_TRANSIT", ReturnStatus.PICKUP_SCHEDULED, PreferredRefundMethod.ORIGINAL, SalesChannel.MOBILE_APP, 4, new BigDecimal("12999.00"), "Bose SoundLink Revolve+ II Bluetooth Speaker", "Electronics", "Dented outer aluminum casing right out of transit box", "House 88, Sector 15, Noida 201301", LogisticsPartner.DELHIVERY, PickupStatus.AGENT_ASSIGNED, null, null, false, null, null, null, null, null, null, null),

                // 3. IN_TRANSIT (Picked up, moving to warehouse)
                new ReturnSeedSpec(aditya, electronics, ReturnType.RETURN, "DEFECTIVE_PRODUCT", ReturnStatus.IN_TRANSIT, PreferredRefundMethod.ORIGINAL, SalesChannel.WEB, 5, new BigDecimal("14999.00"), "Sennheiser Momentum 4 Wireless ANC Headphones", "Electronics", "Active noise cancellation creates loud clicking artifact in left driver", "Plot 104, Jubilee Hills Road 36, Hyderabad 500033", LogisticsPartner.DELHIVERY, PickupStatus.IN_TRANSIT, null, null, false, null, null, null, null, null, null, null),
                new ReturnSeedSpec(meera, footwear, ReturnType.EXCHANGE, "WRONG_SIZE", ReturnStatus.IN_TRANSIT, PreferredRefundMethod.STORE_CREDIT, SalesChannel.MOBILE_APP, 6, new BigDecimal("7499.00"), "Asics Gel-Kayano 30 Stability Running Shoes (UK 5.5)", "Footwear", "Arch support profile does not match foot shape", "Door 34, Panampilly Nagar, Kochi 682036", LogisticsPartner.SHIPROCKET, PickupStatus.IN_TRANSIT, null, null, false, null, null, null, null, null, null, null),
                new ReturnSeedSpec(sid, luxury, ReturnType.RETURN, "DEFECTIVE_PRODUCT", ReturnStatus.IN_TRANSIT, PreferredRefundMethod.BANK_TRANSFER, SalesChannel.WEB, 6, new BigDecimal("28500.00"), "Seiko Prospex Diver Automatic 200m", "Luxury Watches", "Crown does not screw down smoothly, thread resistance", "Flat 801, Nyati Serenity, Hadapsar, Pune 411028", LogisticsPartner.DELHIVERY, PickupStatus.IN_TRANSIT, null, null, false, null, null, null, null, null, null, null),

                // 4. RECEIVED (Arrived at warehouse, awaiting QC)
                new ReturnSeedSpec(priya, electronics, ReturnType.RETURN, "NOT_AS_DESCRIBED", ReturnStatus.RECEIVED, PreferredRefundMethod.ORIGINAL, SalesChannel.WEB, 7, new BigDecimal("3299.00"), "JBL Flip 6 Portable Waterproof Speaker (Ocean Blue)", "Electronics", "Advertised 12-hour battery life only lasted 3 hours on 50% volume", "Flat 402, Prestige Lakeside Habitat, Varthur, Bengaluru 560087", LogisticsPartner.SHIPROCKET, PickupStatus.DELIVERED_TO_WAREHOUSE, null, null, false, null, null, null, null, null, null, null),
                new ReturnSeedSpec(neha, home, ReturnType.RETURN, "DAMAGED_IN_TRANSIT", ReturnStatus.RECEIVED, PreferredRefundMethod.STORE_CREDIT, SalesChannel.MOBILE_APP, 7, new BigDecimal("4999.00"), "Philips Digital Airfryer 4.1L (Black)", "Home & Kitchen", "Exterior plastic hinge cracked during transit", "Flat 302, Green Glen Layout, Bellandur, Bengaluru 560103", LogisticsPartner.DELHIVERY, PickupStatus.DELIVERED_TO_WAREHOUSE, null, null, false, null, null, null, null, null, null, null),
                new ReturnSeedSpec(aarav, sports, ReturnType.RETURN, "QUALITY_UNSATISFACTORY", ReturnStatus.RECEIVED, PreferredRefundMethod.ORIGINAL, SalesChannel.MARKETPLACE, 8, new BigDecimal("8999.00"), "Yonex Astrox 99 Pro Badminton Racket (4U/G5)", "Sports & Fitness", "Frame shaft stiffness differs from genuine Japanese retail specs", "Villa 42, Palm Meadows, Whitefield, Bengaluru 560066", LogisticsPartner.SHIPROCKET, PickupStatus.DELIVERED_TO_WAREHOUSE, null, null, false, null, null, null, null, null, null, null),

                // 5. QC_IN_PROGRESS (Currently being inspected by warehouse team)
                new ReturnSeedSpec(vikram, electronics, ReturnType.RETURN, "DEFECTIVE_PRODUCT", ReturnStatus.QC_IN_PROGRESS, PreferredRefundMethod.ORIGINAL, SalesChannel.WEB, 9, new BigDecimal("18999.00"), "Marshall Acton III Bluetooth Home Speaker (Black)", "Electronics", "Bluetooth audio cuts out when within 2 meters of router", "Apartment 1801, Lodha Bellissimo, Mahalaxmi, Mumbai 400011", LogisticsPartner.DELHIVERY, PickupStatus.DELIVERED_TO_WAREHOUSE, null, null, false, null, null, null, null, null, null, null),
                new ReturnSeedSpec(ananya, footwear, ReturnType.RETURN, "DEFECTIVE_PRODUCT", ReturnStatus.QC_IN_PROGRESS, PreferredRefundMethod.STORE_CREDIT, SalesChannel.MOBILE_APP, 9, new BigDecimal("6999.00"), "Adidas Ultraboost Light Running Shoes (Core Black, UK 7)", "Footwear", "Outsole Continental rubber separating at heel collar", "Flat 4B, Salt Lake Sector 2, Kolkata 700091", LogisticsPartner.SHIPROCKET, PickupStatus.DELIVERED_TO_WAREHOUSE, null, null, false, null, null, null, null, null, null, null),

                // 6. QC_DONE (Inspected, dispositions assigned: RESTOCK, RTM, LIQUIDATE)
                new ReturnSeedSpec(pooja, apparel, ReturnType.RETURN, "CHANGED_MIND", ReturnStatus.QC_DONE, PreferredRefundMethod.STORE_CREDIT, SalesChannel.WEB, 10, new BigDecimal("3299.00"), "Marks & Spencer Linen Rich Relaxed Blazer (Navy, UK 10)", "Apparel", "Customer changed mind on styling", "House 12, Indiranagar 100 Feet Rd, Bengaluru 560038", LogisticsPartner.DELHIVERY, PickupStatus.DELIVERED_TO_WAREHOUSE, ConditionGrade.MINT, FunctionalTest.PASS, true, Disposition.RESTOCK_NEW, "Tags attached, original hanger and dust bag present. Mint condition.", RestockType.NEW, new BigDecimal("3299.00"), null, null, null),
                new ReturnSeedSpec(karthik, electronics, ReturnType.RETURN, "DEFECTIVE_PRODUCT", ReturnStatus.QC_DONE, PreferredRefundMethod.BANK_TRANSFER, SalesChannel.WEB, 11, new BigDecimal("7999.00"), "Sony WF-1000XM5 True Wireless Earbuds (Black)", "Electronics", "Right earbud fails pairing intermittently", "14/2 Anna Salai, Teynampet, Chennai 600018", LogisticsPartner.SHIPROCKET, PickupStatus.DELIVERED_TO_WAREHOUSE, ConditionGrade.FAIR, FunctionalTest.FAIL, true, Disposition.RTM, "Bluetooth LE transceiver defect confirmed under vendor test suite. Assigned for vendor RTM batch.", null, null, null, null, null),
                new ReturnSeedSpec(rohan, electronics, ReturnType.RETURN, "DAMAGED_IN_TRANSIT", ReturnStatus.QC_DONE, PreferredRefundMethod.ORIGINAL, SalesChannel.MOBILE_APP, 12, new BigDecimal("11499.00"), "Harman Kardon Onyx Studio 8 Portable Speaker", "Electronics", "Woofer dome punctured during transit", "House 88, Sector 15, Noida 201301", LogisticsPartner.DELHIVERY, PickupStatus.DELIVERED_TO_WAREHOUSE, ConditionGrade.DAMAGED, FunctionalTest.FAIL, true, Disposition.LIQUIDATE, "Acoustic chamber seal broken. Exterior grill bent. Designated for liquidation salvage auction.", null, null, null, null, null),
                new ReturnSeedSpec(sneha, footwear, ReturnType.RETURN, "WRONG_SIZE", ReturnStatus.QC_DONE, PreferredRefundMethod.STORE_CREDIT, SalesChannel.WEB, 12, new BigDecimal("5499.00"), "Nike Air Max 270 (Triple White, UK 6)", "Footwear", "Wrong size ordered", "Villa 9, Kalyani Nagar, Pune 411006", LogisticsPartner.SHIPROCKET, PickupStatus.DELIVERED_TO_WAREHOUSE, ConditionGrade.MINT, FunctionalTest.PASS, true, Disposition.RESTOCK_NEW, "Unworn, factory tissue and silica gel packet present. Clean outsoles.", RestockType.NEW, new BigDecimal("5499.00"), null, null, null),
                new ReturnSeedSpec(meera, home, ReturnType.RETURN, "DEFECTIVE_PRODUCT", ReturnStatus.QC_DONE, PreferredRefundMethod.ORIGINAL, SalesChannel.MOBILE_APP, 13, new BigDecimal("8499.00"), "Morphy Richards 24-Litre Convection Microwave Oven", "Home & Kitchen", "Magnetron overheating and shutting down after 3 minutes", "Door 34, Panampilly Nagar, Kochi 682036", LogisticsPartner.DELHIVERY, PickupStatus.DELIVERED_TO_WAREHOUSE, ConditionGrade.GOOD, FunctionalTest.FAIL, true, Disposition.RTM, "Electronics controller fault. Packaging intact. Forwarded to Morphy Richards vendor return pool.", null, null, null, null, null),

                // 7. REFUND_INITIATED (QC passed, refund queued / pending approval / processing)
                new ReturnSeedSpec(aarav, luxury, ReturnType.RETURN, "QUALITY_UNSATISFACTORY", ReturnStatus.REFUND_INITIATED, PreferredRefundMethod.BANK_TRANSFER, SalesChannel.WEB, 14, new BigDecimal("65000.00"), "Rado Captain Cook Automatic Watch (Green Dial)", "Luxury Watches", "Dial index luminescence weaker than advertised spec", "Villa 42, Palm Meadows, Whitefield, Bengaluru 560066", LogisticsPartner.SHIPROCKET, PickupStatus.DELIVERED_TO_WAREHOUSE, ConditionGrade.MINT, FunctionalTest.PASS, true, Disposition.RESTOCK_NEW, "High-value watch verified with warranty booklet and chronometer cert.", RestockType.NEW, new BigDecimal("65000.00"), RefundStatus.PENDING, null, null),
                new ReturnSeedSpec(divya, electronics, ReturnType.RETURN, "DEFECTIVE_PRODUCT", ReturnStatus.REFUND_INITIATED, PreferredRefundMethod.ORIGINAL, SalesChannel.WEB, 15, new BigDecimal("12499.00"), "Kindle Oasis 32GB Champagne Gold (Waterproof)", "Electronics", "Micro-flicker on 4th LED backlight bar", "B-404, Ceebros Boulevard, OMR, Chennai 600097", LogisticsPartner.DELHIVERY, PickupStatus.DELIVERED_TO_WAREHOUSE, ConditionGrade.GOOD, FunctionalTest.FAIL, true, Disposition.RESTOCK_REFURB, "Display repaired, recalibrated to factory brightness. Graded as Certified Refurbished.", RestockType.REFURBISHED, new BigDecimal("9999.00"), RefundStatus.PROCESSING, null, null),
                new ReturnSeedSpec(neha, apparel, ReturnType.RETURN, "COLOR_MISMATCH", ReturnStatus.REFUND_INITIATED, PreferredRefundMethod.STORE_CREDIT, SalesChannel.MOBILE_APP, 16, new BigDecimal("4599.00"), "Biba Embroidered Anarkali Suit Set (Rust Orange, 38)", "Apparel", "Rust shade appears maroon under standard room lighting", "Flat 302, Green Glen Layout, Bellandur, Bengaluru 560103", LogisticsPartner.SHIPROCKET, PickupStatus.DELIVERED_TO_WAREHOUSE, ConditionGrade.MINT, FunctionalTest.PASS, true, Disposition.RESTOCK_NEW, "Original tags intact, flawless condition.", RestockType.NEW, new BigDecimal("4599.00"), RefundStatus.INITIATED, null, null),

                // 8. REFUNDED (Completed successfully, customer feedback submitted)
                new ReturnSeedSpec(priya, electronics, ReturnType.RETURN, "DEFECTIVE_PRODUCT", ReturnStatus.REFUNDED, PreferredRefundMethod.ORIGINAL, SalesChannel.WEB, 20, new BigDecimal("8499.00"), "Sony WH-1000XM4 Wireless Noise-Cancelling Headphones", "Electronics", "Left ear cup audio intermittently silent", "Flat 402, Prestige Lakeside Habitat, Varthur, Bengaluru 560087", LogisticsPartner.SHIPROCKET, PickupStatus.DELIVERED_TO_WAREHOUSE, ConditionGrade.GOOD, FunctionalTest.FAIL, true, Disposition.RTM, "Component defect confirmed on audio analyzer.", null, null, RefundStatus.CREDITED, 10, "Seamless return experience! Pickup agent was punctual and the refund was credited instantly."),
                new ReturnSeedSpec(vikram, nike, ReturnType.RETURN, "WRONG_SIZE", ReturnStatus.REFUNDED, PreferredRefundMethod.ORIGINAL, SalesChannel.MOBILE_APP, 24, new BigDecimal("8995.00"), "Nike Invincible 3 Road Running Shoes (UK 10)", "Footwear", "Too narrow in the midfoot", "Apartment 1801, Lodha Bellissimo, Mahalaxmi, Mumbai 400011", LogisticsPartner.DELHIVERY, PickupStatus.DELIVERED_TO_WAREHOUSE, ConditionGrade.MINT, FunctionalTest.PASS, true, Disposition.RESTOCK_NEW, "Unworn, original box and laces in mint condition.", RestockType.NEW, new BigDecimal("8995.00"), RefundStatus.CREDITED, 9, "Quick inspection and money back to credit card in 2 business days. Very satisfied."),
                new ReturnSeedSpec(ananya, home, ReturnType.RETURN, "DAMAGED_IN_TRANSIT", ReturnStatus.REFUNDED, PreferredRefundMethod.STORE_CREDIT, SalesChannel.MARKETPLACE, 28, new BigDecimal("6200.00"), "Prestige Deluxe Alpha Stainless Steel Pressure Cooker 5.5L", "Home & Kitchen", "Gasket release rim dented during delivery", "Flat 4B, Salt Lake Sector 2, Kolkata 700091", LogisticsPartner.DELHIVERY, PickupStatus.DELIVERED_TO_WAREHOUSE, ConditionGrade.FAIR, FunctionalTest.FAIL, true, Disposition.LIQUIDATE, "Pressure release rim damaged. Scrapped for metals liquidation.", null, null, RefundStatus.CREDITED, 8, "Good support resolution, store credit was handy to order a replacement."),
                new ReturnSeedSpec(karthik, sports, ReturnType.RETURN, "DEFECTIVE_PRODUCT", ReturnStatus.REFUNDED, PreferredRefundMethod.BANK_TRANSFER, SalesChannel.WEB, 32, new BigDecimal("14200.00"), "Fitbit Sense 2 Advanced Health & Fitness Smartwatch", "Sports & Fitness", "Skin temperature sensor failing diagnostics", "14/2 Anna Salai, Teynampet, Chennai 600018", LogisticsPartner.SHIPROCKET, PickupStatus.DELIVERED_TO_WAREHOUSE, ConditionGrade.GOOD, FunctionalTest.FAIL, true, Disposition.RTM, "Sensor failure verified. Returned to distributor batch pool.", null, null, RefundStatus.CREDITED, 7, "Inspection took slightly longer than 48 hours, but customer support kept me updated."),
                new ReturnSeedSpec(pooja, footwear, ReturnType.RETURN, "CHANGED_MIND", ReturnStatus.REFUNDED, PreferredRefundMethod.STORE_CREDIT, SalesChannel.MOBILE_APP, 36, new BigDecimal("3799.00"), "Catwalk Leather Strappy Block Heels (Rose Gold, 38)", "Footwear", "Heel height too high for daily office wear", "House 12, Indiranagar 100 Feet Rd, Bengaluru 560038", LogisticsPartner.DELHIVERY, PickupStatus.DELIVERED_TO_WAREHOUSE, ConditionGrade.MINT, FunctionalTest.PASS, true, Disposition.RESTOCK_NEW, "Mint condition, tags and protection film on sole intact.", RestockType.NEW, new BigDecimal("3799.00"), RefundStatus.CREDITED, 9, "Love the hassle-free returns policy! Instant wallet credit allowed me to pick another pair immediately."),
                new ReturnSeedSpec(rohan, electronics, ReturnType.RETURN, "QUALITY_UNSATISFACTORY", ReturnStatus.REFUNDED, PreferredRefundMethod.BANK_TRANSFER, SalesChannel.WEB, 40, new BigDecimal("5499.00"), "Boat Stone 1500 40W Bluetooth Party Speaker", "Electronics", "Bass distortion at 70%+ volume level", "House 88, Sector 15, Noida 201301", LogisticsPartner.SHIPROCKET, PickupStatus.DELIVERED_TO_WAREHOUSE, ConditionGrade.FAIR, FunctionalTest.PASS, true, Disposition.RESTOCK_REFURB, "Tuned and firmware re-flashed. Approved for Grade-B refurbished listing.", RestockType.REFURBISHED, new BigDecimal("3999.00"), RefundStatus.CREDITED, 5, "Bank transfer took almost 6 business days after warehouse arrival. Could be faster."),
                new ReturnSeedSpec(sid, electronics, ReturnType.RETURN, "NOT_AS_DESCRIBED", ReturnStatus.REFUNDED, PreferredRefundMethod.ORIGINAL, SalesChannel.MOBILE_APP, 45, new BigDecimal("2999.00"), "Fire-Boltt Invogue Smartwatch with Bluetooth Calling", "Electronics", "Display resolution noticeably grainier than product promotional render", "Flat 801, Nyati Serenity, Hadapsar, Pune 411028", LogisticsPartner.DELHIVERY, PickupStatus.DELIVERED_TO_WAREHOUSE, ConditionGrade.GOOD, FunctionalTest.PASS, true, Disposition.RESTOCK_REFURB, "Cleaned and repackaged. Approved as refurbished inventory.", RestockType.REFURBISHED, new BigDecimal("2199.00"), RefundStatus.CREDITED, 6, "Process was okay. Return pickup boy arrived 3 hours after scheduled slot."),

                // 9. EXCHANGE_DISPATCHED (Exchange order shipped to customer)
                new ReturnSeedSpec(aarav, nike, ReturnType.EXCHANGE, "WRONG_SIZE", ReturnStatus.EXCHANGE_DISPATCHED, PreferredRefundMethod.STORE_CREDIT, SalesChannel.MOBILE_APP, 18, new BigDecimal("10995.00"), "Nike ZoomX Vaporfly Next% 3 (White/Jade, UK 9)", "Footwear", "Requested exchange for UK 9.5", "Villa 42, Palm Meadows, Whitefield, Bengaluru 560066", LogisticsPartner.DELHIVERY, PickupStatus.DELIVERED_TO_WAREHOUSE, ConditionGrade.MINT, FunctionalTest.PASS, true, Disposition.RESTOCK_NEW, "Pristine condition, exchange approved immediately under VIP policy.", RestockType.NEW, new BigDecimal("10995.00"), null, 10, "Express VIP exchange is phenomenal! Replacement pair was delivered within 48 hours."),
                new ReturnSeedSpec(sneha, apparel, ReturnType.EXCHANGE, "COLOR_MISMATCH", ReturnStatus.EXCHANGE_DISPATCHED, PreferredRefundMethod.STORE_CREDIT, SalesChannel.WEB, 22, new BigDecimal("4990.00"), "W for Woman Silk Blend Layered Kurta Set (Size 36)", "Apparel", "Requested exchange for Teal Blue shade", "Villa 9, Kalyani Nagar, Pune 411006", LogisticsPartner.SHIPROCKET, PickupStatus.DELIVERED_TO_WAREHOUSE, ConditionGrade.MINT, FunctionalTest.PASS, true, Disposition.RESTOCK_NEW, "Clean, intact garment. Exchange order dispatched.", RestockType.NEW, new BigDecimal("4990.00"), null, 9, "Super convenient exchange. The delivery agent handed over the new size and picked up the return together."),

                // 10. CANCELLED / CLOSED
                new ReturnSeedSpec(divya, home, ReturnType.RETURN, "CHANGED_MIND", ReturnStatus.CANCELLED, PreferredRefundMethod.ORIGINAL, SalesChannel.WEB, 15, new BigDecimal("1899.00"), "Borosil Glass Lunch Box Set of 4 (Olive Bag)", "Home & Kitchen", "Customer decided to keep the product as gift", "B-404, Ceebros Boulevard, OMR, Chennai 600097", LogisticsPartner.SHIPROCKET, null, null, null, false, null, null, null, null, null, null, null),
                new ReturnSeedSpec(aditya, footwear, ReturnType.RETURN, "DEFECTIVE_PRODUCT", ReturnStatus.CANCELLED, PreferredRefundMethod.BANK_TRANSFER, SalesChannel.MOBILE_APP, 20, new BigDecimal("2499.00"), "Red Tape Men Casual Sneaker Shoes (White, UK 8)", "Footwear", "Customer retained item after support resolution", "Plot 104, Jubilee Hills Road 36, Hyderabad 500033", LogisticsPartner.DELHIVERY, null, null, null, false, null, null, null, null, null, null, null)
        );

        int counter = 100;
        User[] qcTeam = new User[]{qcDeepak, qcManoj, qcPraveen};

        for (ReturnSeedSpec spec : specs) {
            counter++;
            UUID orderId = UUID.nameUUIDFromBytes(("ORDER-DEMO-" + counter).getBytes());
            UUID skuId = UUID.nameUUIDFromBytes(("SKU-" + spec.skuName).getBytes());
            UUID orderLineId = UUID.nameUUIDFromBytes(("ORDER-LINE-" + counter).getBytes());

            Instant returnInitiated = now.minus(spec.daysAgo, ChronoUnit.DAYS);

            boolean isOverride = counter == 103 || counter == 108;
            String overrideReason = counter == 103
                    ? "Customer hospitalized during standard 7-day return window; approved by support lead as a one-time courtesy exception "
                    : counter == 108
                    ? "Transit courier delayed delivery scan by 4 days; customer initiated return within 48h of actual physical receipt"
                    : null;

            // Create and save ReturnRequest
            ReturnRequest returnReq = ReturnRequest.builder()
                    .orderId(orderId)
                    .customerId(spec.customer.getId())
                    .returnType(spec.returnType)
                    .reasonCode(spec.reasonCode)
                    .status(spec.status)
                    .preferredRefundMethod(spec.prefMethod)
                    .policy(spec.policy)
                    .initiatedAt(returnInitiated)
                    .salesChannel(spec.channel)
                    .supportOverride(isOverride)
                    .supportOverrideReason(overrideReason)
                    .bankAccountNumber(spec.prefMethod == PreferredRefundMethod.BANK_TRANSFER ? "98231405" + (1000 + counter) : null)
                    .bankIfsc(spec.prefMethod == PreferredRefundMethod.BANK_TRANSFER ? "HDFC000" + (1000 + (counter % 50)) : null)
                    .priceDifferenceAmount(spec.returnType == ReturnType.EXCHANGE ? new BigDecimal("500.00") : null)
                    .customerPaysDifference(spec.returnType == ReturnType.EXCHANGE ? Boolean.FALSE : null)
                    .satisfactionRating(spec.npsRating)
                    .satisfactionComment(spec.npsComment)
                    .satisfactionSubmittedAt(spec.npsRating != null ? returnInitiated.plus(3, ChronoUnit.DAYS) : null)
                    .refundAmount(spec.amount)
                    .build();

            ReturnRequest savedReturn = returnRequestRepository.save(returnReq);

            // ReturnItem
            ReturnItem returnItem = ReturnItem.builder()
                    .returnRequest(savedReturn)
                    .orderLineId(orderLineId)
                    .skuId(skuId)
                    .quantity(1)
                    .returnReason(spec.returnReason)
                    .evidenceUrls(List.of(
                            "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80",
                            "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80"
                    ))
                    .exchangeSkuId(spec.returnType == ReturnType.EXCHANGE ? UUID.nameUUIDFromBytes(("EXCHANGE-SKU-" + counter).getBytes()) : null)
                    .productName(spec.skuName)
                    .build();
            returnItemRepository.save(returnItem);

            // Pickup (if scheduled or beyond)
            if (spec.pickupStatus != null) {
                Pickup pickup = Pickup.builder()
                        .returnRequest(savedReturn)
                        .logisticsPartner(spec.partner)
                        .awbNumber((spec.partner == LogisticsPartner.SHIPROCKET ? "SR-" : "DEL-") + (88000000 + counter))
                        .pickupDate(returnInitiated.atZone(java.time.ZoneOffset.UTC).toLocalDate().plusDays(1))
                        .pickupSlot(counter % 2 == 0 ? "09:00 AM - 01:00 PM" : "02:00 PM - 06:00 PM")
                        .status(spec.pickupStatus)
                        .pickupOtp(String.format("%06d", 100000 + (counter * 73) % 900000))
                        .pickupAddress(spec.address)
                        .grnNumber(spec.pickupStatus == PickupStatus.DELIVERED_TO_WAREHOUSE ? "GRN-WH-2026-" + String.format("%04d", counter) : null)
                        .build();
                pickupRepository.save(pickup);
            }

            // QC Inspection (if inspected)
            QcInspection savedQc = null;
            if (spec.grade != null && spec.disposition != null) {
                User inspector = qcTeam[counter % qcTeam.length];
                QcInspection qc = QcInspection.builder()
                        .returnRequest(savedReturn)
                        .inspector(inspector)
                        .conditionGrade(spec.grade)
                        .functionalTest(spec.funcTest)
                        .complaintValidated(spec.complaintVal)
                        .disposition(spec.disposition)
                        .notes(spec.qcNotes)
                        .images(List.of(
                                "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&q=80",
                                "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&q=80"
                        ))
                        .inspectedAt(returnInitiated.plus(2, ChronoUnit.DAYS))
                        .build();
                savedQc = qcInspectionRepository.save(qc);

                // Restocked Item (if disposition is RESTOCK_NEW or RESTOCK_REFURB)
                if (spec.restockType != null) {
                    boolean highValue = spec.newPrice.compareTo(new BigDecimal("5000.00")) > 0;
                    RestockedItem restockedItem = RestockedItem.builder()
                            .qcInspection(savedQc)
                            .skuId(skuId)
                            .quantity(1)
                            .restockType(spec.restockType)
                            .newListingPrice(spec.newPrice)
                            .supervisorApprovalRequired(highValue)
                            .approved(true)
                            .warrantyExpiresAt(spec.restockType == RestockType.REFURBISHED ? LocalDate.now().plusDays(90) : null)
                            .restockedAt(returnInitiated.plus(3, ChronoUnit.DAYS))
                            .build();
                    restockedItemRepository.save(restockedItem);
                }
            }

            // Refund (if refund status specified)
            if (spec.refundStatus != null) {
                boolean approvalReq = spec.amount.compareTo(new BigDecimal("5000.00")) > 0;
                RefundMethod rMethod = spec.prefMethod == PreferredRefundMethod.STORE_CREDIT ? RefundMethod.STORE_CREDIT
                        : spec.prefMethod == PreferredRefundMethod.BANK_TRANSFER ? RefundMethod.BANK_TRANSFER
                        : RefundMethod.ORIGINAL_METHOD;

                Instant credAt = spec.refundStatus == RefundStatus.CREDITED ? returnInitiated.plus(3, ChronoUnit.DAYS) : null;

                Refund refund = Refund.builder()
                        .returnRequest(savedReturn)
                        .amount(spec.amount)
                        .method(rMethod)
                        .status(spec.refundStatus)
                        .approvalRequired(approvalReq)
                        .approved(approvalReq ? Boolean.TRUE : null)
                        .razorpayRefundId(spec.refundStatus == RefundStatus.CREDITED ? "rfnd_rzp_" + (99000000 + counter) : null)
                        .initiatedAt(returnInitiated.plus(2, ChronoUnit.DAYS))
                        .creditedAt(credAt)
                        .build();
                refundRepository.save(refund);
            }

            // Return Communications (Audit trail of notifications)
            seedCommunicationsForReturn(savedReturn, returnInitiated);
        }

        // Also seed Fraud Flags for flagged customers and suspicious returns
        seedFraudFlags(users);
    }

    private void seedCommunicationsForReturn(ReturnRequest ret, Instant initiated) {
        CommChannel channel = ret.getSalesChannel() == SalesChannel.MOBILE_APP ? CommChannel.WHATSAPP
                : ret.getSalesChannel() == SalesChannel.WEB ? CommChannel.SMS : CommChannel.EMAIL;

        // Initiation event
        returnCommunicationRepository.save(ReturnCommunication.builder()
                .returnRequest(ret)
                .eventType("RETURN_INITIATED")
                .channel(channel)
                .sentAt(initiated)
                .status(CommStatus.DELIVERED)
                .build());

        // Subsequent lifecycle events depending on status
        if (ret.getStatus() != ReturnStatus.INITIATED && ret.getStatus() != ReturnStatus.CANCELLED) {
            returnCommunicationRepository.save(ReturnCommunication.builder()
                    .returnRequest(ret)
                    .eventType("PICKUP_SCHEDULED")
                    .channel(channel)
                    .sentAt(initiated.plus(4, ChronoUnit.HOURS))
                    .status(CommStatus.DELIVERED)
                    .build());
        }

        if (List.of(ReturnStatus.RECEIVED, ReturnStatus.QC_IN_PROGRESS, ReturnStatus.QC_DONE,
                ReturnStatus.REFUND_INITIATED, ReturnStatus.REFUNDED, ReturnStatus.EXCHANGE_DISPATCHED).contains(ret.getStatus())) {
            returnCommunicationRepository.save(ReturnCommunication.builder()
                    .returnRequest(ret)
                    .eventType("RECEIVED_AT_WAREHOUSE")
                    .channel(channel)
                    .sentAt(initiated.plus(36, ChronoUnit.HOURS))
                    .status(CommStatus.DELIVERED)
                    .build());
        }

        if (List.of(ReturnStatus.QC_DONE, ReturnStatus.REFUND_INITIATED, ReturnStatus.REFUNDED).contains(ret.getStatus())) {
            returnCommunicationRepository.save(ReturnCommunication.builder()
                    .returnRequest(ret)
                    .eventType("QC_PASSED")
                    .channel(channel)
                    .sentAt(initiated.plus(48, ChronoUnit.HOURS))
                    .status(CommStatus.DELIVERED)
                    .build());
        }

        if (ret.getStatus() == ReturnStatus.REFUNDED) {
            returnCommunicationRepository.save(ReturnCommunication.builder()
                    .returnRequest(ret)
                    .eventType("REFUND_CREDITED")
                    .channel(channel)
                    .sentAt(initiated.plus(72, ChronoUnit.HOURS))
                    .status(CommStatus.DELIVERED)
                    .build());
        }
    }

    private void seedFraudFlags(Map<String, User> users) {
        User ananya = users.get("ananya.sen@example.com");
        User rohan = users.get("rohan.joshi@example.com");
        User aditya = users.get("aditya.rao@example.com");
        User sid = users.get("sid.deshmukh@example.com");

        if (ananya != null) {
            fraudFlagRepository.save(FraudFlag.builder()
                    .customerId(ananya.getId())
                    .flagType("EXCESSIVE_RETURN_RATE")
                    .status(FraudFlagStatus.OPEN)
                    .riskScore(86)
                    .returnCount(8)
                    .returnRatePercent(new BigDecimal("53.33"))
                    .flaggedAt(Instant.now().minus(4, ChronoUnit.DAYS))
                    .build());
        }

        if (rohan != null) {
            fraudFlagRepository.save(FraudFlag.builder()
                    .customerId(rohan.getId())
                    .flagType("SUSPICIOUS_WARDROBING")
                    .status(FraudFlagStatus.INVESTIGATING)
                    .riskScore(78)
                    .returnCount(11)
                    .returnRatePercent(new BigDecimal("39.28"))
                    .flaggedAt(Instant.now().minus(6, ChronoUnit.DAYS))
                    .build());
        }

        if (aditya != null) {
            fraudFlagRepository.save(FraudFlag.builder()
                    .customerId(aditya.getId())
                    .flagType("MISSING_SERIAL_NUMBER")
                    .status(FraudFlagStatus.OPEN)
                    .riskScore(92)
                    .returnCount(5)
                    .returnRatePercent(new BigDecimal("55.55"))
                    .flaggedAt(Instant.now().minus(2, ChronoUnit.DAYS))
                    .build());
        }

        if (sid != null) {
            fraudFlagRepository.save(FraudFlag.builder()
                    .customerId(sid.getId())
                    .flagType("FREQUENT_EMPTY_BOX_CLAIM")
                    .status(FraudFlagStatus.CONFIRMED)
                    .riskScore(95)
                    .returnCount(8)
                    .returnRatePercent(new BigDecimal("57.14"))
                    .flaggedAt(Instant.now().minus(12, ChronoUnit.DAYS))
                    .build());
            fraudFlagRepository.save(FraudFlag.builder()
                    .customerId(sid.getId())
                    .flagType("MULTIPLE_ACCOUNTS_SAME_ADDRESS")
                    .status(FraudFlagStatus.CLEARED)
                    .riskScore(64)
                    .returnCount(8)
                    .returnRatePercent(new BigDecimal("57.14"))
                    .flaggedAt(Instant.now().minus(25, ChronoUnit.DAYS))
                    .build());
        }
    }

    private void seedLiquidationBatches() {
        LocalDate today = LocalDate.now();

        List<LiquidationBatch> batches = List.of(
                LiquidationBatch.builder()
                        .partnerName("SurplusHub B2B Auctions Pvt Ltd")
                        .batchDate(today.minusDays(3))
                        .status(LiquidationStatus.PREPARED)
                        .payoutAmount(new BigDecimal("22500.00"))
                        .writtenOff(false)
                        .itemsJson("[{\"sku\":\"Harman Kardon Onyx 8\",\"qty\":3,\"cond\":\"DAMAGED\"},{\"sku\":\"Sony Soundbar Subwoofer\",\"qty\":2,\"cond\":\"DAMAGED\"}]")
                        .build(),
                LiquidationBatch.builder()
                        .partnerName("Greencell Eco-Recyclers Salvage")
                        .batchDate(today.minusDays(8))
                        .status(LiquidationStatus.DISPATCHED)
                        .payoutAmount(new BigDecimal("38400.00"))
                        .writtenOff(false)
                        .itemsJson("[{\"sku\":\"Prestige Alpha Pressure Cooker\",\"qty\":6,\"cond\":\"FAIR\"},{\"sku\":\"Morphy Richards Oven Casing\",\"qty\":4,\"cond\":\"DAMAGED\"}]")
                        .build(),
                LiquidationBatch.builder()
                        .partnerName("CleanEarth Certified E-Waste Disposal")
                        .batchDate(today.minusDays(15))
                        .status(LiquidationStatus.SETTLED)
                        .payoutAmount(BigDecimal.ZERO)
                        .writtenOff(true)
                        .writeOffAmount(new BigDecimal("18200.00"))
                        .certificateNumber("CERT-EW-2026-0819")
                        .itemsJson("[{\"sku\":\"Swollen Lithium Battery Packs\",\"qty\":12,\"cond\":\"UNUSABLE\"},{\"sku\":\"Cracked LCD Panels\",\"qty\":5,\"cond\":\"UNUSABLE\"}]")
                        .build(),
                LiquidationBatch.builder()
                        .partnerName("QuickSalvage Liquidators India")
                        .batchDate(today.minusDays(22))
                        .status(LiquidationStatus.SETTLED)
                        .payoutAmount(new BigDecimal("54600.00"))
                        .writtenOff(false)
                        .itemsJson("[{\"sku\":\"Apparel Customer Overstock Box\",\"qty\":45,\"cond\":\"FAIR\"},{\"sku\":\"Footwear Display Samples\",\"qty\":20,\"cond\":\"FAIR\"}]")
                        .build(),
                LiquidationBatch.builder()
                        .partnerName("EcoBattery Safe Hazardous Scrap")
                        .batchDate(today.minusDays(30))
                        .status(LiquidationStatus.SETTLED)
                        .payoutAmount(BigDecimal.ZERO)
                        .writtenOff(true)
                        .writeOffAmount(new BigDecimal("9450.00"))
                        .certificateNumber("CERT-EW-2026-0742")
                        .itemsJson("[{\"sku\":\"Damaged Powerbanks 20000mAh\",\"qty\":18,\"cond\":\"UNUSABLE\"}]")
                        .build(),
                LiquidationBatch.builder()
                        .partnerName("National Industrial Auctioneers")
                        .batchDate(today.minusDays(4))
                        .status(LiquidationStatus.RECEIVED)
                        .payoutAmount(new BigDecimal("31200.00"))
                        .writtenOff(false)
                        .itemsJson("[{\"sku\":\"Returned Small Appliances Lot\",\"qty\":15,\"cond\":\"FAIR\"}]")
                        .build()
        );

        liquidationBatchRepository.saveAll(batches);
    }

    private void seedRtmAndSupplierReturns(Map<String, User> users) {
        LocalDate today = LocalDate.now();

        UUID sonyId = UUID.nameUUIDFromBytes("SUPPLIER-SONY".getBytes());
        UUID samsungId = UUID.nameUUIDFromBytes("SUPPLIER-SAMSUNG".getBytes());
        UUID pumaId = UUID.nameUUIDFromBytes("SUPPLIER-PUMA".getBytes());
        UUID boatId = UUID.nameUUIDFromBytes("SUPPLIER-BOAT".getBytes());
        UUID appleId = UUID.nameUUIDFromBytes("SUPPLIER-APPLE".getBytes());

        // 1. RtmBatches
        RtmBatch sonyBatch = rtmBatchRepository.save(RtmBatch.builder()
                .supplierId(sonyId)
                .supplierName("Sony India Pvt Ltd")
                .status(RtmBatchStatus.DISPATCHED)
                .dispatchDate(today.minusDays(5))
                .awbNumber("DEL-RTM-882910")
                .creditNoteValue(new BigDecimal("48999.00"))
                .itemsJson("[{\"item\":\"Sony WF-1000XM5\",\"qty\":4,\"value\":31996.00},{\"item\":\"Sony WH-1000XM4\",\"qty\":2,\"value\":17003.00}]")
                .disputed(false)
                .build());

        RtmBatch samsungBatch = rtmBatchRepository.save(RtmBatch.builder()
                .supplierId(samsungId)
                .supplierName("Samsung Electronics India")
                .status(RtmBatchStatus.SETTLED)
                .dispatchDate(today.minusDays(18))
                .awbNumber("SR-RTM-441920")
                .creditNoteValue(new BigDecimal("76500.00"))
                .itemsJson("[{\"item\":\"Samsung Galaxy Buds2 Pro\",\"qty\":6,\"value\":53994.00},{\"item\":\"Samsung Wireless Trio Pad\",\"qty\":5,\"value\":22506.00}]")
                .disputed(false)
                .build());

        RtmBatch boatBatch = rtmBatchRepository.save(RtmBatch.builder()
                .supplierId(boatId)
                .supplierName("Boat Lifestyle (Imagine Marketing)")
                .status(RtmBatchStatus.RECEIVED_BY_SUPPLIER)
                .dispatchDate(today.minusDays(8))
                .awbNumber("DEL-RTM-339182")
                .creditNoteValue(new BigDecimal("29800.00"))
                .itemsJson("[{\"item\":\"Boat Airdopes 441\",\"qty\":12,\"value\":17988.00},{\"item\":\"Boat Stone 1500\",\"qty\":3,\"value\":11812.00}]")
                .disputed(true)
                .disputeNotes("Vendor contesting warranty claim on 2 units of Stone 1500 citing external water damage beyond IPX rating.")
                .build());

        RtmBatch pumaBatch = rtmBatchRepository.save(RtmBatch.builder()
                .supplierId(pumaId)
                .supplierName("Puma Sports India")
                .status(RtmBatchStatus.ACCUMULATED)
                .creditNoteValue(new BigDecimal("34500.00"))
                .itemsJson("[{\"item\":\"Puma Nitro Elite Running Shoes\",\"qty\":5,\"value\":21495.00},{\"item\":\"Puma Slipstream Retro\",\"qty\":3,\"value\":13005.00}]")
                .disputed(false)
                .build());

        RtmBatch appleBatch = rtmBatchRepository.save(RtmBatch.builder()
                .supplierId(appleId)
                .supplierName("Apple Distribution India")
                .status(RtmBatchStatus.ACCUMULATED)
                .creditNoteValue(new BigDecimal("98000.00"))
                .itemsJson("[{\"item\":\"Apple AirPods Pro 2nd Gen\",\"qty\":4,\"value\":98000.00}]")
                .disputed(false)
                .build());

        // 2. SupplierReturns (Individual unbatched and batched items for Supplier Portal)
        List<SupplierReturn> supplierReturns = List.of(
                // ACCUMULATED (Ready to be batched by supplier manager)
                SupplierReturn.builder()
                        .supplierId(sonyId)
                        .supplierName("Sony India Pvt Ltd")
                        .product("Sony LinkBuds S Noise-Cancelling Earbuds")
                        .quantity(2)
                        .value(new BigDecimal("21990.00"))
                        .conditionGrade(ConditionGrade.FAIR)
                        .disposition(Disposition.RTM)
                        .status(RtmBatchStatus.ACCUMULATED)
                        .build(),
                SupplierReturn.builder()
                        .supplierId(sonyId)
                        .supplierName("Sony India Pvt Ltd")
                        .product("Sony WH-CH720N Wireless Over-Ear Headphones")
                        .quantity(3)
                        .value(new BigDecimal("29970.00"))
                        .conditionGrade(ConditionGrade.GOOD)
                        .disposition(Disposition.RTM)
                        .status(RtmBatchStatus.ACCUMULATED)
                        .build(),
                SupplierReturn.builder()
                        .supplierId(samsungId)
                        .supplierName("Samsung Electronics India")
                        .product("Samsung Galaxy Watch 5 (44mm Bluetooth)")
                        .quantity(2)
                        .value(new BigDecimal("35998.00"))
                        .conditionGrade(ConditionGrade.FAIR)
                        .disposition(Disposition.RTM)
                        .status(RtmBatchStatus.ACCUMULATED)
                        .build(),
                SupplierReturn.builder()
                        .supplierId(pumaId)
                        .supplierName("Puma Sports India")
                        .product("Puma Velocity Nitro 2 Running Shoes")
                        .quantity(4)
                        .value(new BigDecimal("23996.00"))
                        .conditionGrade(ConditionGrade.GOOD)
                        .disposition(Disposition.RTM)
                        .status(RtmBatchStatus.ACCUMULATED)
                        .build(),
                SupplierReturn.builder()
                        .supplierId(boatId)
                        .supplierName("Boat Lifestyle (Imagine Marketing)")
                        .product("Boat Nirvana Ion ANC TWS Earbuds")
                        .quantity(8)
                        .value(new BigDecimal("19992.00"))
                        .conditionGrade(ConditionGrade.FAIR)
                        .disposition(Disposition.RTM)
                        .status(RtmBatchStatus.ACCUMULATED)
                        .build(),
                SupplierReturn.builder()
                        .supplierId(appleId)
                        .supplierName("Apple Distribution India")
                        .product("Apple Magic Keyboard with Touch ID")
                        .quantity(2)
                        .value(new BigDecimal("29000.00"))
                        .conditionGrade(ConditionGrade.GOOD)
                        .disposition(Disposition.RTM)
                        .status(RtmBatchStatus.ACCUMULATED)
                        .build(),

                // BATCHED items linked to the created batches
                SupplierReturn.builder()
                        .supplierId(sonyId)
                        .supplierName("Sony India Pvt Ltd")
                        .product("Sony WF-1000XM5 Earbuds (Black)")
                        .quantity(4)
                        .value(new BigDecimal("31996.00"))
                        .conditionGrade(ConditionGrade.FAIR)
                        .disposition(Disposition.RTM)
                        .rtmBatch(sonyBatch)
                        .status(RtmBatchStatus.DISPATCHED)
                        .build(),
                SupplierReturn.builder()
                        .supplierId(samsungId)
                        .supplierName("Samsung Electronics India")
                        .product("Samsung Galaxy Buds2 Pro")
                        .quantity(6)
                        .value(new BigDecimal("53994.00"))
                        .conditionGrade(ConditionGrade.GOOD)
                        .disposition(Disposition.RTM)
                        .rtmBatch(samsungBatch)
                        .status(RtmBatchStatus.SETTLED)
                        .build(),
                SupplierReturn.builder()
                        .supplierId(boatId)
                        .supplierName("Boat Lifestyle (Imagine Marketing)")
                        .product("Boat Stone 1500 40W Speaker")
                        .quantity(3)
                        .value(new BigDecimal("11812.00"))
                        .conditionGrade(ConditionGrade.FAIR)
                        .disposition(Disposition.RTM)
                        .rtmBatch(boatBatch)
                        .status(RtmBatchStatus.RECEIVED_BY_SUPPLIER)
                        .build(),
                SupplierReturn.builder()
                        .supplierId(pumaId)
                        .supplierName("Puma Sports India")
                        .product("Puma Nitro Elite Marathon Shoes")
                        .quantity(5)
                        .value(new BigDecimal("21495.00"))
                        .conditionGrade(ConditionGrade.GOOD)
                        .disposition(Disposition.RTM)
                        .rtmBatch(pumaBatch)
                        .status(RtmBatchStatus.ACCUMULATED)
                        .build(),
                SupplierReturn.builder()
                        .supplierId(appleId)
                        .supplierName("Apple Distribution India")
                        .product("Apple AirPods Pro 2nd Gen USB-C")
                        .quantity(4)
                        .value(new BigDecimal("98000.00"))
                        .conditionGrade(ConditionGrade.GOOD)
                        .disposition(Disposition.RTM)
                        .rtmBatch(appleBatch)
                        .status(RtmBatchStatus.ACCUMULATED)
                        .build()
        );

        supplierReturnRepository.saveAll(supplierReturns);
    }

    private void backfillExistingReturns() {
        List<ReturnRequest> returns = returnRequestRepository.findAll();
        for (ReturnRequest r : returns) {
            boolean modified = false;
            String cat = r.getPolicy() != null ? r.getPolicy().getName() : "";

            if (r.getRefundAmount() == null) {
                if ("Footwear".equalsIgnoreCase(cat)) r.setRefundAmount(new BigDecimal("4299.00"));
                else if ("Luxury Watches".equalsIgnoreCase(cat)) r.setRefundAmount(new BigDecimal("45000.00"));
                else if ("Home & Kitchen".equalsIgnoreCase(cat)) r.setRefundAmount(new BigDecimal("4999.00"));
                else if ("Sports & Fitness".equalsIgnoreCase(cat)) r.setRefundAmount(new BigDecimal("5999.00"));
                else if ("Apparel".equalsIgnoreCase(cat)) r.setRefundAmount(new BigDecimal("2799.00"));
                else if ("Electronics".equalsIgnoreCase(cat)) r.setRefundAmount(new BigDecimal("8499.00"));
                else if ("Beauty & Personal Care".equalsIgnoreCase(cat)) r.setRefundAmount(new BigDecimal("1850.00"));
                else if ("Books & Media".equalsIgnoreCase(cat)) r.setRefundAmount(new BigDecimal("899.00"));
                else r.setRefundAmount(new BigDecimal("3499.00"));
                modified = true;
            }

            if (r.getItems() != null) {
                for (ReturnItem item : r.getItems()) {
                    if (item.getProductName() == null || item.getProductName().isBlank()) {
                        String pName;
                        if ("Footwear".equalsIgnoreCase(cat)) pName = "Puma Nitro Elite Running Shoes (UK 7)";
                        else if ("Luxury Watches".equalsIgnoreCase(cat)) pName = "Tissot PRX Powermatic 80 Automatic Watch";
                        else if ("Home & Kitchen".equalsIgnoreCase(cat)) pName = "Philips Digital Airfryer 4.1L (Rapid Air)";
                        else if ("Sports & Fitness".equalsIgnoreCase(cat)) pName = "Garmin HRM-Pro Plus Heart Rate Strap";
                        else if ("Apparel".equalsIgnoreCase(cat)) pName = "Ralph Lauren Classic Fit Oxford Cotton Shirt";
                        else if ("Electronics".equalsIgnoreCase(cat)) pName = "Apple AirPods Max (Silver)";
                        else if ("Beauty & Personal Care".equalsIgnoreCase(cat)) pName = "Forest Essentials Ayurvedic Facial Care";
                        else if ("Books & Media".equalsIgnoreCase(cat)) pName = "The Psychology of Money (Hardcover)";
                        else pName = "Nike Air Zoom Pegasus Running Shoes";

                        item.setProductName(pName);
                        returnItemRepository.save(item);
                    }
                }
            }

            if (modified) {
                returnRequestRepository.save(r);
            }

            // Ensure every non-exchange return has a real Refund entity in refundRepository
            if (r.getReturnType() != ReturnType.EXCHANGE && r.getStatus() != ReturnStatus.CANCELLED && r.getStatus() != ReturnStatus.CLOSED) {
                if (refundRepository.findByReturnRequestId(r.getId()).isEmpty()) {
                    RefundMethod rMethod = r.getPreferredRefundMethod() == PreferredRefundMethod.STORE_CREDIT ? RefundMethod.STORE_CREDIT
                            : r.getPreferredRefundMethod() == PreferredRefundMethod.BANK_TRANSFER ? RefundMethod.BANK_TRANSFER
                            : RefundMethod.ORIGINAL_METHOD;
                    BigDecimal amt = r.getRefundAmount() != null && r.getRefundAmount().compareTo(BigDecimal.ZERO) > 0
                            ? r.getRefundAmount() : new BigDecimal("2499.00");
                    boolean approvalReq = amt.compareTo(new BigDecimal("5000.00")) > 0;
                    RefundStatus rStatus = r.getStatus() == ReturnStatus.REFUNDED ? RefundStatus.CREDITED : RefundStatus.PENDING;
                    Instant initAt = r.getInitiatedAt() != null ? r.getInitiatedAt() : Instant.now();
                    Refund autoRefund = Refund.builder()
                            .returnRequest(r)
                            .amount(amt)
                            .method(rMethod)
                            .status(rStatus)
                            .approvalRequired(approvalReq)
                            .initiatedAt(initAt)
                            .build();
                    refundRepository.save(autoRefund);
                }
            }
        }

        // Reset demo customer Priya's stats and clear automated velocity flags so standard returns are not blocked by fraud hold
        userRepository.findByEmail("priya@example.com").ifPresent(priya -> {
            customerReturnStatsRepository.findByCustomerId(priya.getId()).ifPresent(stats -> {
                stats.setTotalOrders(35);
                stats.setTotalReturns(3);
                stats.setReturnRate(new BigDecimal("8.57"));
                stats.setFlagged(false);
                customerReturnStatsRepository.save(stats);
            });
            fraudFlagRepository.findByCustomerId(priya.getId()).forEach(flag -> {
                if ("RETURN_RATE_THRESHOLD".equals(flag.getFlagType()) && flag.getStatus() == FraudFlagStatus.OPEN) {
                    flag.setStatus(FraudFlagStatus.CLEARED);
                    fraudFlagRepository.save(flag);
                }
            });
        });
    }
}
