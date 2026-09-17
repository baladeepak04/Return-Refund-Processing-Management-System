package com.returnflow.rrpms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class RrpmsBackendApplication {
    public static void main(String[] args) {
        SpringApplication.run(RrpmsBackendApplication.class, args);
    }
}
