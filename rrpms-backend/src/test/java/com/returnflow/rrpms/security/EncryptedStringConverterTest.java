package com.returnflow.rrpms.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class EncryptedStringConverterTest {

    private EncryptedStringConverter converter;
    private final String testSecret = "cnJwbXMtZGV2LWFlczI1Ni1rZXktMzJieXRlcyEhISE=";

    @BeforeEach
    void setUp() {
        converter = new EncryptedStringConverter(testSecret);
    }

    @Test
    void testEncryptDecryptRoundTrip() {
        String plainText = "HDFC0001234:987654321012";
        String encrypted = converter.convertToDatabaseColumn(plainText);

        assertNotNull(encrypted);
        assertNotEquals(plainText, encrypted);

        String decrypted = converter.convertToEntityAttribute(encrypted);
        assertEquals(plainText, decrypted);
    }

    @Test
    void testNullValues() {
        assertNull(converter.convertToDatabaseColumn(null));
        assertNull(converter.convertToEntityAttribute(null));
    }

    @Test
    void testInvalidDecryptionThrows() {
        assertThrows(IllegalStateException.class, () -> converter.convertToEntityAttribute("not-valid-base64-or-ciphertext"));
    }
}
