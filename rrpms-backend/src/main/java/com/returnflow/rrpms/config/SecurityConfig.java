package com.returnflow.rrpms.config;

import com.returnflow.rrpms.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            // BUG FIX: with no AuthenticationEntryPoint configured, Spring
            // Security's stateless-API default is Http403ForbiddenEntryPoint
            // — meaning EVERY auth failure (missing token, expired token,
            // malformed token) came back as 403, never 401. The frontend's
            // axios interceptor only auto-logs-out on 401, so an expired
            // session silently fell through to whatever generic "could not
            // load" message each screen happened to show, with no path back
            // to the login page. Explicit entry point below always returns
            // 401 for a genuine authentication failure so that recovery
            // path actually fires.
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(authenticationEntryPoint())
                .accessDeniedHandler((request, response, accessDeniedException) -> {
                    response.setStatus(org.springframework.http.HttpStatus.FORBIDDEN.value());
                    response.setContentType(org.springframework.http.MediaType.APPLICATION_PROBLEM_JSON_VALUE);
                    response.getWriter().write("{\"type\":\"about:blank\",\"title\":\"Forbidden\",\"status\":403,\"detail\":\"Access Denied\"}");
                })
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers("/api/v1/events/**").permitAll()
                .requestMatchers("/api/v1/webhooks/**").permitAll()
                .requestMatchers("/actuator/health").permitAll()
                .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**").permitAll()

                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/policies/**", "/api/v1/returns/policies").authenticated()
                .requestMatchers("/api/v1/policies/**").hasRole("ADMIN")

                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/returns/overrides").hasRole("ADMIN")

                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/returns/fraud-queue").hasAnyRole("ADMIN", "CUSTOMER_SUPPORT")
                .requestMatchers(org.springframework.http.HttpMethod.PUT, "/api/v1/fraud/*/blacklist").hasRole("ADMIN")
                .requestMatchers("/api/v1/fraud/**").hasAnyRole("ADMIN", "CUSTOMER_SUPPORT")

                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/returns", "/api/v1/returns/**")
                    .hasAnyRole("CUSTOMER", "CUSTOMER_SUPPORT", "ADMIN", "WAREHOUSE_QC", "FINANCE")
                .requestMatchers(org.springframework.http.HttpMethod.PUT, "/api/v1/returns/*/override").hasAnyRole("CUSTOMER_SUPPORT", "ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.PUT, "/api/v1/returns/*/pickup/picked-up",
                        "/api/v1/returns/*/pickup/in-transit", "/api/v1/returns/*/pickup/delivered",
                        "/api/v1/returns/*/pickup/failed", "/api/v1/returns/*/dropoff")
                    .hasAnyRole("CUSTOMER_SUPPORT", "ADMIN", "WAREHOUSE_QC")
                .requestMatchers("/api/v1/returns", "/api/v1/returns/**").hasAnyRole("CUSTOMER", "CUSTOMER_SUPPORT", "ADMIN")

                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/v1/qc/**").hasAnyRole("WAREHOUSE_QC", "ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/qc/**").hasAnyRole("WAREHOUSE_QC", "ADMIN", "CUSTOMER_SUPPORT", "FINANCE", "CUSTOMER")

                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/v1/refunds/**").hasAnyRole("FINANCE", "ADMIN", "CUSTOMER_SUPPORT")
                .requestMatchers(org.springframework.http.HttpMethod.PUT, "/api/v1/refunds/*/approve",
                        "/api/v1/refunds/*/reject", "/api/v1/refunds/*/credited").hasAnyRole("FINANCE", "ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/refunds/**").hasAnyRole("FINANCE", "ADMIN", "CUSTOMER_SUPPORT", "CUSTOMER")

                .requestMatchers("/api/v1/communications/**").hasAnyRole("ADMIN", "CUSTOMER_SUPPORT", "CUSTOMER", "WAREHOUSE_QC", "FINANCE", "SUPPLIER_MANAGER")

                .requestMatchers("/api/v1/restock/**", "/api/v1/liquidation/**").hasAnyRole("ADMIN", "WAREHOUSE_QC")

                .requestMatchers("/api/v1/rtm/**", "/api/v1/supplier-returns/**").hasAnyRole("SUPPLIER_MANAGER", "ADMIN")

                .requestMatchers("/api/v1/analytics/**").hasAnyRole("ADMIN", "FINANCE", "CUSTOMER_SUPPORT", "WAREHOUSE_QC")

                // Admin & Support user lookup
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/admin/users", "/api/v1/admin/users/**").hasAnyRole("ADMIN", "CUSTOMER_SUPPORT")
                .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")

                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public AuthenticationEntryPoint authenticationEntryPoint() {
        return (request, response, authException) -> {
            response.setStatus(org.springframework.http.HttpStatus.UNAUTHORIZED.value());
            response.setContentType("application/json");
            response.getWriter().write(
                    "{\"status\":401,\"detail\":\"Session expired or invalid — please log in again.\"}");
        };
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of(allowedOrigins.split(",")));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
