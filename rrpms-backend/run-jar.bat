@echo off
set "JAVA_HOME=D:\jdk-21"
set "PATH=D:\jdk-21\bin;%PATH%"
echo Starting RRPMS Backend from pre-built JAR...
java -jar target\rrpms-backend-1.0.0.jar %*
