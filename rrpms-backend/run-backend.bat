@echo off
set "JAVA_HOME=D:\jdk-21"
set "PATH=D:\jdk-21\bin;%PATH%"
echo Starting RRPMS Backend with Java 21...
mvn spring-boot:run %*
