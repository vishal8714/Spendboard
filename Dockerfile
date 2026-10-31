# ---------- Stage 1: build the React app ----------
FROM node:22-alpine AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---------- Stage 2: build the Spring Boot jar ----------
# The Java version here must match the toolchain version in build.gradle
FROM eclipse-temurin:25-jdk AS backend
WORKDIR /app
COPY ExpenseTracker/gradlew ExpenseTracker/settings.gradle ExpenseTracker/build.gradle ./
COPY ExpenseTracker/gradle gradle
RUN sed -i 's/\r$//' gradlew && chmod +x gradlew
RUN ./gradlew dependencies --no-daemon > /dev/null
COPY ExpenseTracker/src src
COPY --from=frontend /frontend/dist src/main/resources/static
RUN ./gradlew bootJar -x test --no-daemon

# ---------- Stage 3: the image that actually runs ----------
FROM eclipse-temurin:25-jre
WORKDIR /app
COPY --from=backend /app/build/libs/*.jar app.jar
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"
ENV SPRING_PROFILES_ACTIVE=prod
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]