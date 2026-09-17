package com.returnflow.rrpms.exception;

public class RefundAmountExceededException extends RuntimeException {
    public RefundAmountExceededException(String message) { super(message); }
}
