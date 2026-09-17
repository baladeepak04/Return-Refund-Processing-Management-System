# SRS-29 §3.6.5: "Docker + Kubernetes; logistics partner pluggable;
# Razorpay refund API swappable."
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
# BuildKit cache mount: the Maven local repo now persists ACROSS builds and
# across differently-named project folders, instead of re-downloading every
# dependency from the internet on every single build (previously ~260s on
# every rebuild, even for a one-line code change).
RUN --mount=type=cache,target=/root/.m2 mvn -q -B dependency:go-offline
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -q -B clean package -DskipTests

FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
