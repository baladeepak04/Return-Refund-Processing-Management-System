package com.returnflow.rrpms.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.Map;

@Service
public class JwtService {

    @Value("${app.jwt.secret}")
    private String secret;

    @Value("${app.jwt.expiry-seconds}")
    private long expirySeconds;

    private SecretKey key() {
        return Keys.hmacShaKeyFor(secret.getBytes());
    }

    public String generateToken(String subjectEmail, Map<String, Object> claims) {
        Date now = new Date();
        Date exp = new Date(now.getTime() + expirySeconds * 1000);
        return Jwts.builder()
                .claims(claims)
                .subject(subjectEmail)
                .issuedAt(now)
                .expiration(exp)
                .signWith(key(), Jwts.SIG.HS512)
                .compact();
    }

    public Claims parseClaims(String token) {
        return Jwts.parser().verifyWith(key()).build().parseSignedClaims(token).getPayload();
    }

    public String extractEmail(String token) {
        return parseClaims(token).getSubject();
    }

    public boolean isValid(String token) {
        try {
            Claims c = parseClaims(token);
            return c.getExpiration().after(new Date());
        } catch (Exception e) {
            return false;
        }
    }
}
