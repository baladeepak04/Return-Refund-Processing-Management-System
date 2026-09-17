package com.returnflow.rrpms.exception;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.web.bind.MissingServletRequestParameterException;

import static org.junit.jupiter.api.Assertions.*;

class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler handler;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
    }

    @Test
    void testHandleNotFound() {
        ProblemDetail pd = handler.handleNotFound(new NotFoundException("Return not found"));
        assertEquals(HttpStatus.NOT_FOUND.value(), pd.getStatus());
        assertEquals("Return not found", pd.getDetail());
    }

    @Test
    void testHandleDuplicate() {
        ProblemDetail pd = handler.handleDuplicate(new DuplicateReturnException("Order already refunded"));
        assertEquals(HttpStatus.CONFLICT.value(), pd.getStatus());
        assertEquals("Order already refunded", pd.getDetail());
    }

    @Test
    void testHandleQcNotCompleted() {
        ProblemDetail pd = handler.handleQcNotCompleted(new QcNotCompletedException("QC required"));
        assertEquals(HttpStatus.BAD_REQUEST.value(), pd.getStatus());
        assertEquals("QC required", pd.getDetail());
    }

    @Test
    void testHandleRefundAmountExceeded() {
        ProblemDetail pd = handler.handleRefundExceeded(new RefundAmountExceededException("Amount exceeded"));
        assertEquals(HttpStatus.BAD_REQUEST.value(), pd.getStatus());
        assertEquals("Amount exceeded", pd.getDetail());
    }

    @Test
    void testHandleReturnWindowClosed() {
        ProblemDetail pd = handler.handleWindowClosed(new ReturnWindowClosedException("Window closed"));
        assertEquals(HttpStatus.BAD_REQUEST.value(), pd.getStatus());
        assertEquals("Window closed", pd.getDetail());
    }

    @Test
    void testHandleNonReturnable() {
        ProblemDetail pd = handler.handleNonReturnable(new NonReturnableItemException("Non-returnable item"));
        assertEquals(HttpStatus.BAD_REQUEST.value(), pd.getStatus());
        assertEquals("Non-returnable item", pd.getDetail());
    }

    @Test
    void testHandleLogisticsFailure() {
        ProblemDetail pd = handler.handleLogisticsFailure(new LogisticsAPIException("Courier failure"));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE.value(), pd.getStatus());
        assertEquals("Courier failure", pd.getDetail());
    }

    @Test
    void testHandleFraudHold() {
        ProblemDetail pd = handler.handleFraudHold(new FraudHoldException("Fraud hold active"));
        assertEquals(HttpStatus.FORBIDDEN.value(), pd.getStatus());
        assertEquals("Fraud hold active", pd.getDetail());
    }

    @Test
    void testHandleOverrideNotPermitted() {
        ProblemDetail pd = handler.handleOverrideNotPermitted(new OverrideNotPermittedException("Override denied"));
        assertEquals(HttpStatus.FORBIDDEN.value(), pd.getStatus());
        assertEquals("Override denied", pd.getDetail());
    }

    @Test
    void testHandleQcEvidenceRequired() {
        ProblemDetail pd = handler.handleQcEvidenceRequired(new QcEvidenceRequiredException("Evidence required"));
        assertEquals(HttpStatus.BAD_REQUEST.value(), pd.getStatus());
        assertEquals("Evidence required", pd.getDetail());
    }

    @Test
    void testHandleBadCredentials() {
        ProblemDetail pd = handler.handleBadCredentials(new BadCredentialsException("Bad credentials"));
        assertEquals(HttpStatus.UNAUTHORIZED.value(), pd.getStatus());
    }

    @Test
    void testHandleDisabled() {
        ProblemDetail pd = handler.handleDisabled(new DisabledException("Account disabled"));
        assertEquals(HttpStatus.FORBIDDEN.value(), pd.getStatus());
    }

    @Test
    void testHandleMissingParam() {
        ProblemDetail pd = handler.handleMissingParam(new MissingServletRequestParameterException("param", "String"));
        assertEquals(HttpStatus.BAD_REQUEST.value(), pd.getStatus());
        assertTrue(pd.getDetail().contains("Missing required parameter: param"));
    }
}
