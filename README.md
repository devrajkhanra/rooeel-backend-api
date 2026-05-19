# 🚀 Rooeel Enterprise Backend API

A production-grade, highly performant, secure NestJS API engineered for enterprise-class Project and User Lifecycle Management. This backend acts as the core orchestration layer for the Rooeel platform, offering robust RESTful services, secure JWT token rotation and caching, real-time password management, dynamic project schemas, and multi-layered database transactions.

---

## 🏛️ Architectural Foundations & Tech Stack

Rooeel is built on top of a modern, resilient service architecture:

*   **Core Framework**: [NestJS (v11.x)](https://nestjs.com/) — A progressive Node.js framework for building efficient, reliable, and scalable enterprise applications, designed with TypeScript at its core.
*   **Database ORM**: [Prisma ORM (v5.9.1)](https://www.prisma.io/) — A type-safe and database-agnostic query builder, enabling rapid iteration and complete structural safety.
*   **Primary Database**: [PostgreSQL (v15-alpine)](https://www.postgresql.org/) — Relational data model for handling complex transactions, structured tables, cascade deletes, and composite indexes.
*   **Caching & Blacklisting Layer**: [Redis (v7-alpine)](https://redis.io/) — Serves as a global state cache and high-speed token blacklisting engine during user logout sequences.
*   **Email Client**: [Resend API](https://resend.com/) — Multi-channel transactional email provider used to trigger secure password reset links and notifications.
*   **S3-Compatible Cloud Storage**: [MinIO](https://min.io/) — High-performance object storage used for storing project-associated PDFs and work orders locally (interchangeable with AWS S3 in production).
*   **API Protocols**:
    *   **REST**: Primary HTTP protocol for user accounts, requests, and project management.
    *   **GraphQL (Apollo Server v5 / NestJS Apollo v13)**: Exposes a high-performance GraphQL schema (currently supporting an API health resolver) for hybrid operations.
*   **Security & Validation**: [Helmet](https://helmetjs.github.io/) for secure HTTP headers, standard CORS configuration, and [class-validator](https://github.com/typestack/class-validator) with strict data transformation pipes.

---

## 🗄️ Prisma Database Schema & Relations

The PostgreSQL database is organized into 10 key tables, utilizing cascade deletion vectors and indexing to optimize query speed:

```mermaid
erDiagram
    Admin {
        Int id PK
        String firstName
        String lastName
        String email UK
        String password
        DateTime createdAt
    }
    User {
        Int id PK
        String firstName
        String lastName
        String email UK
        String password
        DateTime createdAt
        Int createdBy FK
    }
    PasswordResetToken {
        Int id PK
        String email
        String token UK
        DateTime expiresAt
        DateTime usedAt
        DateTime createdAt
    }
    UserRequest {
        Int id PK
        Int userId FK
        Int adminId FK
        String requestType
        String currentValue
        String requestedValue
        String status
        DateTime createdAt
        DateTime updatedAt
    }
    Project {
        Int id PK
        String name
        String description
        String status
        Int createdBy FK
        DateTime createdAt
        DateTime updatedAt
        String workOrderPdf
    }
    ProjectField {
        Int id PK
        Int projectId FK
        String name
        String label
        String fieldType
        Json options
        Boolean required
        Int sortOrder
        DateTime createdAt
    }
    ProjectFieldValue {
        Int id PK
        Int fieldId FK
        Int projectId FK
        String value
        DateTime createdAt
        DateTime updatedAt
    }
    ProjectUser {
        Int id PK
        Int projectId FK
        Int userId FK
        String role
        DateTime assignedAt
    }
    Task {
        Int id PK
        String title
        String description
        String status
        String type
        Json formSchema
        Json submissionData
        Int projectId FK
        Int assignedTo FK
        DateTime createdAt
        DateTime updatedAt
    }
    RefreshToken {
        Int id PK
        String token UK
        Int userId
        String userType
        DateTime expiresAt
        DateTime revokedAt
        DateTime createdAt
        DateTime updatedAt
    }

    Admin ||--o{ User : "creates"
    Admin ||--o{ Project : "creates"
    Admin ||--o{ UserRequest : "receives"
    User ||--o{ UserRequest : "submits"
    User ||--o{ ProjectUser : "assigned to"
    User ||--o{ Task : "assigned to"
    Project ||--o{ ProjectUser : "has members"
    Project ||--o{ Task : "has tasks"
    Project ||--o{ ProjectField : "defines fields"
    Project ||--o{ ProjectFieldValue : "stores values"
    ProjectField ||--|| ProjectFieldValue : "has value"
```

### Table Definitions & Attributes

1.  **`Admin`**: Repositories for root platform operators. Can seed/create users and projects, and oversee the execution of change requests.
2.  **`User`**: Regular members on the platform. Associated with projects via a many-to-many model, can complete tasks, and must submit change requests for account modifications.
3.  **`RefreshToken`**: Session tracking table mapping cryptographically hashed tokens, expiry targets, and revocation timestamps for both admins and users.
4.  **`PasswordResetToken`**: Secure, 32-byte tokens generated with a 1-hour expiration window to govern unauthenticated password reset requests.
5.  **`UserRequest`**: Account modification request log (e.g. email updates, name changes, or password resets) linking users to their supervising admin.
6.  **`Project`**: High-level structural units created by admins. Associated with work orders, tasks, and dynamic client metadata.
7.  **`ProjectField`**: Dynamic configuration schema defining project fields (e.g., text inputs, date pickers, document uploads) on a per-project basis.
8.  **`ProjectFieldValue`**: Holds the corresponding values entered by admins or members for the dynamic project fields.
9.  **`ProjectUser`**: A many-to-many junction table assigning roles (`member`, `manager`) and permissions within individual projects.
10. **`Task`**: Standard or Form-based work units assigned to projects and users, supporting customized schemas for direct user submission inputs.

---

## ⚙️ Configuration & Environment Variables (`.env`)

To run the application, copy `.env.example` to `.env` and configure the following parameters:

```env
# ── App Environment ─────────────────────────────────────────
NODE_ENV=development             # Choices: 'development', 'production', 'test'
PORT=5000                        # Application port (Defaults to 3000 if empty)
ENABLE_HTTP_LOGGING=true         # Toggle REST endpoint transaction console outputs

# ── Cryptography & JWT Settings ──────────────────────────────
# Generate a secure 64-byte key using: openssl rand -hex 64
JWT_SECRET=change_me_to_a_strong_random_secret
JWT_ACCESS_EXPIRY=15m            # Short-lived access token validity (e.g. '15m', '30m')
JWT_REFRESH_EXPIRY=7d            # Refresh token lifetime (e.g. '7d', '14d')

# ── Primary Database (PostgreSQL) ───────────────────────────
# Connection string syntax: postgresql://<user>:<password>@<host>:<port>/<db>
DATABASE_URL=postgresql://rooeel:rooeel_pass@localhost:5432/rooeel_db

# Root DB environment (Used by PostgreSQL docker container at launch)
POSTGRES_USER=rooeel
POSTGRES_PASSWORD=rooeel_pass
POSTGRES_DB=rooeel_db

# ── Cache Layer (Redis) ─────────────────────────────────────
REDIS_HOST=localhost             # Redis host name (Use "redis" in Docker network)
REDIS_PORT=6379                  # Redis server port
REDIS_PASSWORD=change_me_redis_pass
REDIS_TTL=300                    # Global caching time-to-live (in seconds)

# ── Transactional Email (Resend) ──────────────────────────
RESEND_API_KEY=re_RjoVAv7v_JbYgWY2jNw7nMaZBESHQWBVf
RESEND_FROM_NAME=Rooeel Support
RESEND_FROM_EMAIL=onboarding@resend.dev

# ── Platform Hosts ─────────────────────────────────────────
FRONTEND_URL=http://localhost:3000

# ── S3 Storage Configuration (MinIO / AWS S3) ───────────────
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin123
MINIO_ENDPOINT=localhost:9000    # Use "minio:9000" inside Docker networks
MINIO_BUCKET=rooeel              # Destination S3 bucket name
USE_MINIO=true                   # Set to false to divert assets to AWS S3 in production
```

---

## 🛠️ Installation & Infrastructure Setup

Ensure you have [Node.js (v18+)](https://nodejs.org/), [Docker Desktop](https://www.docker.com/), and [npm](https://www.npmjs.com/) installed on your machine.

### 1. Launch Services (Postgres, Redis, MinIO)
Rooeel provides a docker-compose setup to bootstrap all persistent dependencies locally. Run the following command from the root folder:

```bash
docker-compose -f infrastructure/docker/docker-compose.yml up -d
```
*   **PostgreSQL** will bind to `localhost:5432`
*   **Redis** will bind to `localhost:6379`
*   **MinIO S3 Server** API binds to `localhost:9000` (Web Console accessible at `http://localhost:9001`)
*   *Note*: The container `rooeel-minio-setup` runs immediately after MinIO boots to automatically verify, create, and expose the default `rooeel` bucket.

### 2. Install Project Dependencies
```bash
npm install
```

### 3. Database Initialization & Schema Synchronization
Synchronize your local PostgreSQL database with the Prisma schema and run migrations:

```bash
npx prisma migrate dev
```

### 4. Running the API

```bash
# Development (with active file-watching and live reload)
npm run start:dev

# Debug mode (runs development server with inspector listener active)
npm run start:debug

# Build the optimized production bundle
npm run build

# Start the compiled production build
npm run start:prod
```

---

## 🔒 Session Security & Auth Token Rotation

Rooeel uses a strict, state-of-the-art **JWT Token Rotation & Revocation** model:

```
[Login] ────> Issue Access Token (Bearer in Header, 15m expiry)
         └──> Issue Refresh Token (Secure, HTTP-only Cookie, 7d expiry)
```

1.  **Access Token**: Packed with the user's `userId`, `email`, `role`, and a unique transaction `jti` identifier. Passed in the client request header: `Authorization: Bearer <token>`.
2.  **Refresh Token**: Saved inside a secure, `HttpOnly`, `SameSite: Lax` cookie (`refreshToken`). The token string is hashed via SHA-256 and verified against database records.
3.  **Rotation on Refresh (`POST /auth/refresh`)**:
    *   Client requests a new access token.
    *   System invalidates/revokes the current Refresh Token in the database.
    *   A fresh set of tokens (new Access and Refresh tokens) is issued, continuing the security lifecycle.
4.  **Logout Blacklisting (`POST /auth/logout`)**:
    *   To prevent reuse of intercepted active tokens before they expire naturally, logouts trigger a **Redis Caching Blacklist** workflow.
    *   The JWT token's `jti` and signature are blacklisted in Redis with a TTL matching the token's remaining time-to-live.
    *   If a request contains a blacklisted token, the global `JwtAuthGuard` immediately throws a `401 Unauthorized` exception.

---

## 📝 Change Request & Password Lifecycle Flow

Regular users (`role: 'user'`) cannot directly modify their account values (e.g., name, email, password) to prevent unauthorized profile alterations. They must submit a formal **Change Request** that is assigned to their creator Admin for verification.

### 1. General Field Update Flow
```
User (Patch /user/me/profile) ──> Create "pending" Request ──> Admin Approves ──> Database User Table Updates
```
*   **Step A**: User submits a change request via `POST /api/v1/request`.
*   **Step B**: A record is created in `UserRequest` containing the user's current value and the requested value, marked as `status: 'pending'`.
*   **Step C**: The admin retrieves pending requests via `GET /api/v1/request/admin`.
*   **Step D**: The admin reviews the request:
    *   If **Approved** (`PATCH /request/:id/approve`): The backend executes a database transaction that updates the user's account with the new value and sets the request status to `approved`.
    *   If **Rejected** (`PATCH /request/:id/reject`): The request status updates to `rejected` and the user's account remains unmodified.

### 2. Password Modification & Forgot Password Flows

To maintain high security, **passwords are never stored in the request log, even in hashed format**. Instead, they follow specific programmatic workflows:

```
Flow A: User Password Reset (Forgot Password)
User (forgot-password) ──> Secure PasswordResetToken ──> Email Link ──> Direct Secure Update

Flow B: Admin-Managed Password Generation
User (Create request) ──> Request queued ──> Admin (generate-password) ──> Plaintext returned ONCE ──> Shared manually
```

#### Flow A: Secure Link Reset (Self-Service)
1.  **Request Link**: The user provides their email to `POST /api/v1/password-reset/forgot-password`.
2.  **Generate Token**: System creates a cryptographically secure `PasswordResetToken` linked to the email with a 1-hour expiration and triggers an email via **Resend** with a link containing the unique token: `http://localhost:3000/reset-password?token=<token>`.
3.  **Execute Update**: The user enters a new password, which is submitted to `POST /api/v1/password-reset/reset`. The system hashes the password using `bcrypt`, updates the user's account, and invalidates the token.

#### Flow B: Admin-Managed Password Reset (Assigned Reset)
1.  **Request Reset**: A user requests a password change by creating a request of type `'password'` or `'password_reset'` (via `POST /api/v1/request`).
    *   *Note*: For authenticated password changes, they must submit their `currentPassword` which is immediately verified against the database.
2.  **Admin Review**: The request appears in the Admin's queue with `requestedValue` set to `[HIDDEN]` for privacy.
3.  **Secure Generation**: The admin triggers `POST /api/v1/request/:id/generate-password`.
4.  **One-Time Payload**: The system generates a strong, secure random password, hashes it using `bcrypt` to update the user's record, and returns the **plain-text password to the admin exactly once**.
5.  **Secure Share**: The admin copies the plain-text password and shares it with the user. It is never displayed or returned in any API payload again.

---

## 📦 High-Performance Cloud Storage Architecture (S3 / MinIO)

Rooeel implements a robust S3-compatible object storage layer via the `StorageService` to govern physical project assets (such as work orders or document uploads).

### Dynamic Storage Providers
```
          ┌────────────── USE_MINIO=true ───────────────> Local MinIO (Dev)
          │                                                - Endpoint: localhost:9000
          │                                                - forcePathStyle: true
[StorageService]
          │
          └───────────── USE_MINIO=false ──────────────> Production AWS S3
                                                           - Endpoint: s3.amazonaws.com
                                                           - IAM Role or Env credentials
```

*   **MinIO (Local Dev)**: Leveraged to replicate full cloud behaviors on developers' local machines. When `USE_MINIO=true`, the service routes payloads directly to local ports using path-style routing (`forcePathStyle: true`).
*   **AWS S3 (Production)**: When `USE_MINIO=false`, the client drops local path overrides and routes uploads securely to global AWS S3 buckets using standard sub-domain endpoints. It resolves IAM roles or env configurations automatically.
*   **URL Generation**: The system dynamically handles URL rendering. While inside the backend, files are resolved via local Docker bridge endpoints, `StorageService.getFileUrl()` generates clean external browser URLs (e.g., swapping `minio:9000` with `localhost:9000`) so administrative browsers can load documents natively.

---

## 📋 Comprehensive API Specification

All REST endpoint requests and responses are structured in JSON format. The base URL for all endpoints is:
`http://localhost:<PORT>/api/v1` (e.g., `http://localhost:5000/api/v1`).

---

### 1. Authentication Module (`/auth`)

#### ➔ `POST /auth/signup`
*   **Description**: Registers a new administrator on the platform. Automatically validates password rules and email uniqueness, generates authorization tokens, and establishes a secure session.
*   **Authorization**: Public / Unauthenticated
*   **Request Body (`SignupDto`)**:
    ```json
    {
      "firstName": "Jane",      // String, MinLength(3), Required
      "lastName": "Doe",        // String, MinLength(3), Required
      "email": "jane@doe.com",  // String, IsEmail(), Required
      "password": "supersecret" // String, MinLength(6), Required
    }
    ```
*   **Success Response** (`201 Created`):
    ```json
    {
      "access_token": "eyJhbGciOi...",
      "refresh_token": "eyJhbGciOi...",
      "expiresIn": 900,
      "admin": {
        "id": 1,
        "firstName": "Jane",
        "lastName": "Doe",
        "email": "jane@doe.com"
      }
    }
    ```
*   **Common Errors**:
    *   `400 Bad Request`: Validation failure (e.g., password too short, email invalid).
    *   `409 Conflict`: Admin email already exists in the database.

---

#### ➔ `POST /auth/login`
*   **Description**: Authenticates a user or administrator based on the provided credentials and role. Issues a secure access token in the response body and sets the refresh token in an HTTP-only cookie.
*   **Authorization**: Public / Unauthenticated
*   **Request Body (`LoginDto`)**:
    ```json
    {
      "email": "jane@doe.com",  // String, IsEmail(), Required
      "password": "supersecret", // String, Required
      "role": "admin"            // String, IsIn(['admin', 'user']), Required
    }
    ```
*   **Headers Set**:
    *   `Set-Cookie: refreshToken=eyJhbGci...; HttpOnly; SameSite=Lax; Max-Age=604800` (Secure flag set in production)
*   **Success Response** (`200 OK`):
    ```json
    {
      "access_token": "eyJhbGciOi...",
      "expiresIn": 900
    }
    ```
*   **Common Errors**:
    *   `401 Unauthorized`: Invalid credentials (incorrect password, account does not exist, or role mismatch).

---

#### ➔ `POST /auth/refresh`
*   **Description**: Rotates active authentication credentials by validating the refresh token stored in the request cookies. Invalidates the old refresh token and returns a new session pair.
*   **Authorization**: Public (Implicitly authenticated via request cookie)
*   **Cookies Required**:
    *   `refreshToken`: `<JWT Refresh Token>`
*   **Headers Set**:
    *   `Set-Cookie: refreshToken=eyJhbGci...; HttpOnly; SameSite=Lax; Max-Age=604800`
*   **Success Response** (`200 OK`):
    ```json
    {
      "access_token": "eyJhbGciOi...",
      "expiresIn": 900
    }
    ```
*   **Common Errors**:
    *   `401 Unauthorized`: Refresh token not found, invalid, expired, or previously revoked.

---

#### ➔ `POST /auth/logout`
*   **Description**: Terminates the current session. Blacklists the access token in Redis and revokes all refresh tokens linked to the user's ID in the database.
*   **Authorization**: Requires JWT Bearer Token (`JwtAuthGuard`)
*   **Success Response** (`200 OK`):
    ```json
    {
      "message": "Logout successful"
    }
    ```

---

#### ➔ `POST /auth/user/login`
*   **Description**: Dedicated login endpoint specifically for platform users (`role: 'user'`). Sets the refresh token cookie and returns a JSON payload containing the access token.
*   **Authorization**: Public / Unauthenticated
*   **Request Body (`LoginDto`)**:
    ```json
    {
      "email": "user@rooeel.com",
      "password": "userpass",
      "role": "user"
    }
    ```
*   **Success Response** (`200 OK`):
    ```json
    {
      "access_token": "eyJhbGciOi...",
      "expiresIn": 900
    }
    ```
*   **Common Errors**:
    *   `401 Unauthorized`: Authentication failed.

---

#### ➔ `POST /auth/user/logout`
*   **Description**: Dedicated logout endpoint for platform users (`role: 'user'`). Clears cookies and blacklists the user's access token in Redis.
*   **Authorization**: Requires JWT Bearer Token (`JwtAuthGuard`)
*   **Success Response** (`200 OK`):
    ```json
    {
      "message": "Logout successful"
    }
    ```

---

### 2. User Module (`/user`)

#### ➔ `POST /user`
*   **Description**: Creates a new user account linked to the authenticated administrator.
*   **Authorization**: Requires Admin JWT (`AdminGuard`)
*   **Request Body (`CreateUserDto` / `SignupDto`)**:
    ```json
    {
      "firstName": "Mark",
      "lastName": "Spencer",
      "email": "mark@spencer.com",
      "password": "securepassword123"
    }
    ```
*   **Success Response** (`201 Created`):
    ```json
    {
      "id": 4,
      "firstName": "Mark",
      "lastName": "Spencer",
      "email": "mark@spencer.com",
      "createdBy": 1,
      "createdAt": "2026-05-18T12:00:00.000Z"
    }
    ```
*   **Common Errors**:
    *   `403 Forbidden`: Authenticated user is not an administrator.
    *   `409 Conflict`: User with this email already exists.

---

#### ➔ `GET /user`
*   **Description**: Retrieves a list of all user accounts registered on the platform.
*   **Authorization**: Requires Admin JWT (`AdminGuard`)
*   **Success Response** (`200 OK`):
    ```json
    [
      {
        "id": 4,
        "firstName": "Mark",
        "lastName": "Spencer",
        "email": "mark@spencer.com",
        "createdBy": 1,
        "createdAt": "2026-05-18T12:00:00.000Z"
      }
    ]
    ```

---

#### ➔ `GET /user/:id`
*   **Description**: Retrieves details for a specific user account by ID.
*   **Authorization**: Requires Admin JWT (`AdminGuard`)
*   **Path Parameters**:
    *   `id`: Integer ID of the target user
*   **Success Response** (`200 OK`):
    ```json
    {
      "id": 4,
      "firstName": "Mark",
      "lastName": "Spencer",
      "email": "mark@spencer.com",
      "createdBy": 1,
      "createdAt": "2026-05-18T12:00:00.000Z"
    }
    ```
*   **Common Errors**:
    *   `404 Not Found`: User with the specified ID does not exist.

---

#### ➔ `PATCH /user/:id`
*   **Description**: Updates user account information (fields are optional).
*   **Authorization**: Requires Admin JWT (`AdminGuard`)
*   **Path Parameters**:
    *   `id`: Integer ID of the target user
*   **Request Body (`UpdateUserDto`)**:
    ```json
    {
      "firstName": "Markus",
      "lastName": "Spencer",
      "email": "markus@spencer.com"
    }
    ```
*   **Success Response** (`200 OK`):
    ```json
    {
      "id": 4,
      "firstName": "Markus",
      "lastName": "Spencer",
      "email": "markus@spencer.com",
      "createdBy": 1
    }
    ```

---

#### ➔ `PATCH /user/me/profile`
*   **Description**: Allows an authenticated user to request an update to their own profile details.
*   **Authorization**: Requires User JWT (`UserGuard`)
*   **Request Body (`UpdateUserDto`)**:
    ```json
    {
      "firstName": "Marky",
      "lastName": "Spencer"
    }
    ```
*   **Success Response** (`200 OK`):
    ```json
    {
      "id": 4,
      "firstName": "Marky",
      "lastName": "Spencer",
      "email": "mark@spencer.com"
    }
    ```

---

#### ➔ `PATCH /user/me/change-password`
*   **Description**: Allows a user to change their password directly. Requires verification of their current password.
*   **Authorization**: Requires User JWT (`UserGuard`)
*   **Request Body**:
    ```json
    {
      "currentPassword": "oldpassword123", // String, Required
      "newPassword": "newsecurepassword123" // String, MinLength(8), Required
    }
    ```
*   **Success Response** (`200 OK`):
    ```json
    {
      "message": "Password changed successfully"
    }
    ```
*   **Common Errors**:
    *   `400 Bad Request`: Current password is incorrect or new password validation failed.

---

#### ➔ `DELETE /user/:id`
*   **Description**: Deletes a user account from the system. Cascades to clean up all associated project allocations and task assignments.
*   **Authorization**: Requires Admin JWT (`AdminGuard`)
*   **Path Parameters**:
    *   `id`: Integer ID of the user to delete
*   **Success Response** (`200 OK`):
    ```json
    {
      "id": 4,
      "email": "mark@spencer.com",
      "message": "User deleted successfully"
    }
    ```

---

#### ➔ `PATCH /user/:id/reset-password`
*   **Description**: Allows an administrator to reset a user's password directly.
*   **Authorization**: Requires Admin JWT (`AdminGuard`)
*   **Path Parameters**:
    *   `id`: Integer ID of the target user
*   **Request Body (`ResetPasswordDto`)**:
    ```json
    {
      "password": "temporaryAdminResetPassword1!" // String, MinLength(8), Required
    }
    ```
*   **Success Response** (`200 OK`):
    ```json
    {
      "message": "Password reset successfully by admin",
      "userId": 4
    }
    ```

---

### 3. Project Module (`/project`)

> [!IMPORTANT]
> The entire `/project` route controller is locked down. Every endpoint requires both **JWT Authentication** and **Admin Privileges** (`JwtAuthGuard`, `AdminGuard`).

---

#### ➔ `POST /project`
*   **Description**: Creates a new project in the system. The project is associated with the authenticated administrator who created it.
*   **Request Body (`CreateProjectDto`)**:
    ```json
    {
      "name": "Acme Construction Site",     // String, Required
      "description": "Dynamic infrastructure project", // String, Optional
      "status": "active"                     // Optional (Choices: 'active', 'inactive', 'completed', 'planning', 'on-hold', 'cancelled', 'on-review', 'pending', 'rejected')
    }
    ```
*   **Success Response** (`201 Created`):
    ```json
    {
      "id": 12,
      "name": "Acme Construction Site",
      "description": "Dynamic infrastructure project",
      "status": "active",
      "createdBy": 1,
      "createdAt": "2026-05-18T12:00:00.000Z",
      "admin": {
        "id": 1,
        "firstName": "Jane",
        "lastName": "Doe",
        "email": "jane@doe.com"
      }
    }
    ```

---

#### ➔ `GET /project`
*   **Description**: Retrieves all projects, including the count of assigned users and tasks for each project.
*   **Success Response** (`200 OK`):
    ```json
    [
      {
        "id": 12,
        "name": "Acme Construction Site",
        "description": "Dynamic infrastructure project",
        "status": "active",
        "createdBy": 1,
        "_count": {
          "users": 3,
          "tasks": 12
        }
      }
    ]
    ```

---

#### ➔ `GET /project/:id`
*   **Description**: Retrieves details for a specific project, including assigned admin metadata, active user memberships, and dynamic custom fields.
*   **Path Parameters**:
    *   `id`: Integer ID of the target project
*   **Success Response** (`200 OK`):
    ```json
    {
      "id": 12,
      "name": "Acme Construction Site",
      "description": "Dynamic infrastructure project",
      "status": "active",
      "createdBy": 1,
      "admin": {
        "id": 1,
        "firstName": "Jane",
        "lastName": "Doe"
      },
      "users": [
        {
          "id": 5,
          "role": "manager",
          "user": {
            "id": 4,
            "firstName": "Mark",
            "lastName": "Spencer",
            "email": "mark@spencer.com"
          }
        }
      ],
      "fields": [
        {
          "id": 1,
          "projectId": 12,
          "name": "siteAddress",
          "label": "Site Address",
          "fieldType": "text",
          "required": true,
          "sortOrder": 1
        }
      ]
    }
    ```

---

#### ➔ `PATCH /project/:id`
*   **Description**: Updates basic details for a specific project.
*   **Path Parameters**:
    *   `id`: Integer ID of the target project
*   **Request Body (`UpdateProjectDto`)**:
    ```json
    {
      "name": "Acme Urban Construction",
      "status": "planning"
    }
    ```
*   **Success Response** (`200 OK`):
    ```json
    {
      "id": 12,
      "name": "Acme Urban Construction",
      "description": "Dynamic infrastructure project",
      "status": "planning",
      "createdBy": 1
    }
    ```

---

#### ➔ `DELETE /project/:id`
*   **Description**: Deletes a project. Cascades to clean up all linked `ProjectUsers` memberships, `Tasks`, and dynamic `FieldValues`.
*   **Path Parameters**:
    *   `id`: Integer ID of the project to delete
*   **Success Response** (`200 OK`):
    ```json
    {
      "id": 12,
      "name": "Acme Urban Construction",
      "message": "Project deleted successfully"
    }
    ```

---

#### ➔ `POST /project/:id/work-order`
*   **Description**: Uploads a work order PDF file using S3/MinIO. If an old PDF exists, it is permanently deleted from the object storage to optimize space.
*   **Headers**: `Content-Type: multipart/form-data`
*   **Path Parameters**:
    *   `id`: Integer ID of the target project
*   **Request Body**:
    *   `file`: Binary PDF file attachment (Multipart form-data)
*   **Success Response** (`201 Created`):
    ```json
    {
      "id": 12,
      "name": "Acme Construction Site",
      "description": "Dynamic infrastructure project",
      "status": "active",
      "createdBy": 1,
      "workOrderPdf": "work-orders/d290f1ee-6c54-4b01-90e6-d701748f0851.pdf",
      "workOrderUrl": "http://localhost:9000/rooeel/work-orders/d290f1ee-6c54-4b01-90e6-d701748f0851.pdf"
    }
    ```

---

#### ➔ `DELETE /project/:id/work-order`
*   **Description**: Deletes a project's work order PDF from storage and clears the reference column in the PostgreSQL database.
*   **Path Parameters**:
    *   `id`: Integer ID of the target project
*   **Success Response** (`200 OK`):
    ```json
    {
      "success": true
    }
    ```

---

#### ➔ `GET /project/:id/fields`
*   **Description**: Retrieves all dynamic custom fields and metadata defined for the project, sorted by display orders. Includes current values.
*   **Path Parameters**:
    *   `id`: Integer ID of the target project
*   **Success Response** (`200 OK`):
    ```json
    [
      {
        "id": 1,
        "projectId": 12,
        "name": "siteAddress",
        "label": "Site Address",
        "fieldType": "text",
        "options": null,
        "required": true,
        "sortOrder": 1,
        "createdAt": "2026-05-18T12:00:00.000Z",
        "value": {
          "id": 1,
          "fieldId": 1,
          "projectId": 12,
          "value": "123 Main St, New York, NY",
          "createdAt": "2026-05-18T12:00:00.000Z",
          "updatedAt": "2026-05-18T12:05:00.000Z"
        }
      }
    ]
    ```

---

#### ➔ `POST /project/:id/fields`
*   **Description**: Appends a new custom dynamic field structure to the project.
*   **Path Parameters**:
    *   `id`: Integer ID of the target project
*   **Request Body**:
    ```json
    {
      "name": "siteAddress",
      "label": "Site Address",
      "fieldType": "text",      // Choices: 'text', 'number', 'date', 'select', 'textarea', 'file'
      "required": true,
      "sortOrder": 1,
      "options": null           // Array of options, e.g. [{"value": "opt1", "label": "Option 1"}]
    }
    ```
*   **Success Response** (`201 Created`):
    ```json
    {
      "id": 1,
      "projectId": 12,
      "name": "siteAddress",
      "label": "Site Address",
      "fieldType": "text",
      "options": null,
      "required": true,
      "sortOrder": 1,
      "createdAt": "2026-05-18T12:00:00.000Z"
    }
    ```

---

#### ➔ `DELETE /project/:id/fields/:fieldId`
*   **Description**: Deletes a dynamic field from the project layout. Cascades to automatically delete the field value.
*   **Path Parameters**:
    *   `id`: Integer ID of the target project
    *   `fieldId`: Integer ID of the dynamic field to delete
*   **Success Response** (`200 OK`):
    ```json
    {
      "id": 1,
      "projectId": 12,
      "name": "siteAddress"
    }
    ```

---

#### ➔ `POST /project/:id/fields/:fieldId/value`
*   **Description**: Saves or modifies the input value for a dynamic project field. Resolves as an upsert transaction.
*   **Path Parameters**:
    *   `id`: Integer ID of the target project
    *   `fieldId`: Integer ID of the dynamic field
*   **Request Body**:
    ```json
    {
      "value": "123 Main St, New York, NY"
    }
    ```
*   **Success Response** (`201 Created`):
    ```json
    {
      "id": 1,
      "fieldId": 1,
      "projectId": 12,
      "value": "123 Main St, New York, NY",
      "createdAt": "2026-05-18T12:00:00.000Z",
      "updatedAt": "2026-05-18T12:05:00.000Z"
    }
    ```

---

#### ➔ `GET /project/:id/users`
*   **Description**: Retrieves a list of all user memberships and roles assigned within this specific project.
*   **Path Parameters**:
    *   `id`: Integer ID of the target project
*   **Success Response** (`200 OK`):
    ```json
    [
      {
        "id": 5,
        "projectId": 12,
        "userId": 4,
        "role": "manager",
        "assignedAt": "2026-05-18T12:00:00.000Z",
        "user": {
          "id": 4,
          "firstName": "Mark",
          "lastName": "Spencer",
          "email": "mark@spencer.com"
        }
      }
    ]
    ```

---

#### ➔ `POST /project/:id/users`
*   **Description**: Assigns a user to the project with a custom role.
*   **Path Parameters**:
    *   `id`: Integer ID of the target project
*   **Request Body**:
    ```json
    {
      "userId": 4,
      "role": "manager" // Optional, defaults to "member"
    }
    ```
*   **Success Response** (`201 Created`):
    ```json
    {
      "id": 5,
      "projectId": 12,
      "userId": 4,
      "role": "manager",
      "assignedAt": "2026-05-18T12:00:00.000Z",
      "user": {
        "id": 4,
        "firstName": "Mark",
        "lastName": "Spencer",
        "email": "mark@spencer.com"
      }
    }
    ```

---

#### ➔ `DELETE /project/:id/users/:userId`
*   **Description**: Unassigns a user from the project, revoking their project memberships.
*   **Path Parameters**:
    *   `id`: Integer ID of the target project
    *   `userId`: Integer ID of the user to unassign
*   **Success Response** (`200 OK`):
    ```json
    {
      "id": 5,
      "projectId": 12,
      "userId": 4,
      "role": "manager"
    }
    ```

---

#### ➔ `GET /project/:id/tasks`
*   **Description**: Lists all basic or form-based tasks defined within the project, including assignee profile details.
*   **Path Parameters**:
    *   `id`: Integer ID of the target project
*   **Success Response** (`200 OK`):
    ```json
    [
      {
        "id": 1,
        "title": "Excavate Foundation",
        "description": "Prepare excavation and frame boundary",
        "status": "pending",
        "type": "basic",
        "formSchema": null,
        "submissionData": null,
        "projectId": 12,
        "assignedTo": 4,
        "createdAt": "2026-05-18T12:00:00.000Z",
        "updatedAt": "2026-05-18T12:00:00.000Z",
        "assignee": {
          "id": 4,
          "firstName": "Mark",
          "lastName": "Spencer",
          "email": "mark@spencer.com"
        }
      }
    ]
    ```

---

#### ➔ `POST /project/:id/tasks`
*   **Description**: Creates a new task in the project (can support basic text descriptions or customized dynamic form schemas).
*   **Path Parameters**:
    *   `id`: Integer ID of the target project
*   **Request Body**:
    ```json
    {
      "title": "Excavate Foundation",
      "description": "Prepare excavation and frame boundary",
      "status": "pending",        // Choices: 'pending', 'accepted', 'in-progress', 'done'
      "type": "basic",            // Choices: 'basic', 'form'
      "formSchema": null,         // Optional JSON schema for structured form submissions
      "assignedTo": 4             // Optional Integer userId of assignee
    }
    ```
*   **Success Response** (`201 Created`):
    ```json
    {
      "id": 1,
      "title": "Excavate Foundation",
      "description": "Prepare excavation and frame boundary",
      "status": "pending",
      "type": "basic",
      "formSchema": null,
      "submissionData": null,
      "projectId": 12,
      "assignedTo": 4,
      "createdAt": "2026-05-18T12:00:00.000Z",
      "updatedAt": "2026-05-18T12:00:00.000Z",
      "assignee": {
        "id": 4,
        "firstName": "Mark",
        "lastName": "Spencer",
        "email": "mark@spencer.com"
      }
    }
    ```

---

#### ➔ `DELETE /project/:id/tasks/:taskId`
*   **Description**: Deletes a specific task.
*   **Path Parameters**:
    *   `id`: Integer ID of the target project
    *   `taskId`: Integer ID of the task to delete
*   **Success Response** (`200 OK`):
    ```json
    {
      "id": 1,
      "title": "Excavate Foundation"
    }
    ```

---

### 4. Change Requests Module (`/request`)

---

#### ➔ `POST /request`
*   **Description**: Allows an authenticated user to submit a change request for their account profile.
*   **Authorization**: Requires User JWT (`UserGuard`)
*   **Request Body (`CreateRequestDto`)**:
    ```json
    {
      "requestType": "email",          // String (Choices: 'firstName', 'lastName', 'email', 'password', 'password_reset'), Required
      "requestedValue": "new@email.com", // String, Required for non-password types
      "currentPassword": "userpass"    // String, Required only for 'password' change type
    }
    ```
*   **Success Response** (`201 Created`):
    ```json
    {
      "id": 101,
      "userId": 4,
      "adminId": 1,
      "requestType": "email",
      "currentValue": "mark@spencer.com",
      "requestedValue": "new@email.com",
      "status": "pending",
      "createdAt": "2026-05-18T12:00:00.000Z"
    }
    ```

---

#### ➔ `POST /request/forgot-password`
*   **Description**: Public endpoint to request a password reset. System automatically identifies the user's assigned administrator, generates a secure temporary password, hashes and updates the user's account, and sends it directly to their email via Resend.
*   **Authorization**: Public / Unauthenticated
*   **Request Body (`ForgotPasswordDto`)**:
    ```json
    {
      "email": "user@rooeel.com"
    }
    ```
*   **Success Response** (`201 Created`):
    ```json
    {
      "message": "If an account exists with this email, a temporary password has been sent."
    }
    ```
*   *Security Note*: Always returns a success message (even if the email is not registered) to prevent user email enumeration.

---

#### ➔ `GET /request`
*   **Description**: Retrieves a list of all change requests submitted by the authenticated user.
*   **Authorization**: Requires User JWT (`UserGuard`)
*   **Success Response** (`200 OK`):
    ```json
    [
      {
        "id": 101,
        "requestType": "email",
        "currentValue": "mark@spencer.com",
        "requestedValue": "new@email.com",
        "status": "pending",
        "admin": {
          "id": 1,
          "firstName": "Jane",
          "lastName": "Doe"
        }
      }
    ]
    ```

---

#### ➔ `GET /request/admin`
*   **Description**: Retrieves all change requests assigned to the authenticated administrator.
*   **Authorization**: Requires Admin JWT (`AdminGuard`)
*   **Success Response** (`200 OK`):
    ```json
    [
      {
        "id": 101,
        "requestType": "email",
        "currentValue": "mark@spencer.com",
        "requestedValue": "new@email.com",
        "status": "pending",
        "user": {
          "id": 4,
          "firstName": "Mark",
          "lastName": "Spencer",
          "email": "mark@spencer.com"
        }
      }
    ]
    ```

---

#### ➔ `GET /request/:id`
*   **Description**: Retrieves details for a specific change request.
*   **Authorization**: Public (Can be viewed by both users and admins)
*   **Path Parameters**:
    *   `id`: Integer ID of the target request
*   **Success Response** (`200 OK`):
    ```json
    {
      "id": 101,
      "userId": 4,
      "adminId": 1,
      "requestType": "email",
      "currentValue": "mark@spencer.com",
      "requestedValue": "new@email.com",
      "status": "pending",
      "user": {
        "id": 4,
        "firstName": "Mark",
        "lastName": "Spencer"
      },
      "admin": {
        "id": 1,
        "firstName": "Jane",
        "lastName": "Doe"
      }
    }
    ```

---

#### ➔ `POST /request/:id/generate-password`
*   **Description**: Generates a secure, cryptographically random temporary password for a pending password request. Updates the user's hashed record and returns the plain-text password to the administrator **exactly once**.
*   **Authorization**: Requires Admin JWT (`AdminGuard`)
*   **Path Parameters**:
    *   `id`: Integer ID of the pending `password` or `password_reset` request
*   **Success Response** (`200 OK`):
    ```json
    {
      "message": "Password generated and applied successfully. Share this password with the user — it will not be shown again.",
      "generatedPassword": "t3Mp_PaSsWoRD_k9#x1L",
      "requestId": 102,
      "userId": 4
    }
    ```
*   **Common Errors**:
    *   `400 Bad Request`: Request is already processed, or is not a password-type request.
    *   `403 Forbidden`: Admin attempts to manage a request from a user assigned to a different administrator.

---

#### ➔ `PATCH /request/:id/approve`
*   **Description**: Approves a pending request and applies the new value directly to the user's account. Cannot be used for password-type requests (which must use the `/generate-password` endpoint).
*   **Authorization**: Requires Admin JWT (`AdminGuard`)
*   **Path Parameters**:
    *   `id`: Integer ID of the request to approve
*   **Success Response** (`200 OK`):
    ```json
    {
      "id": 101,
      "requestType": "email",
      "status": "approved",
      "updatedAt": "2026-05-18T12:05:00.000Z"
    }
    ```

---

#### ➔ `PATCH /request/:id/reject`
*   **Description**: Rejects a pending request. The request status updates to `rejected` and the user's account remains unmodified.
*   **Authorization**: Requires Admin JWT (`AdminGuard`)
*   **Path Parameters**:
    *   `id`: Integer ID of the request to reject
*   **Success Response** (`200 OK`):
    ```json
    {
      "id": 101,
      "requestType": "email",
      "status": "rejected",
      "updatedAt": "2026-05-18T12:05:00.000Z"
    }
    ```

---

### 5. Password Reset Module (`/password-reset`)

---

#### ➔ `POST /password-reset/forgot-password`
*   **Description**: Requests a self-service password reset. Generates a secure `PasswordResetToken` in the database and sends a password reset link to the user's email via Resend.
*   **Authorization**: Public / Unauthenticated
*   **Request Body (`ForgotPasswordDto`)**:
    ```json
    {
      "email": "user@rooeel.com"
    }
    ```
*   **Success Response** (`200 OK`):
    ```json
    {
      "message": "If an account exists with this email, a password reset link has been sent."
    }
    ```

---

#### ➔ `POST /password-reset/reset`
*   **Description**: Resets a user's password using a valid, unexpired reset token.
*   **Authorization**: Public / Unauthenticated
*   **Request Body (`ResetPasswordDto`)**:
    ```json
    {
      "token": "4a7b8e...",             // String, Secure Token, Required
      "newPassword": "newsecurepassword123" // String, MinLength(8), Required
    }
    ```
*   **Success Response** (`200 OK`):
    ```json
    {
      "message": "Password has been reset successfully. You can now log in with your new password."
    }
    ```
*   **Common Errors**:
    *   `400 Bad Request`: Token has expired or was already used.
    *   `404 Not Found`: Invalid reset token or user account not found.

---

### 6. Admin Module (`/admin`)

#### ➔ `GET /admin`
*   **Description**: Retrieves a list of all administrators registered on the platform.
*   **Authorization**: Public / Unauthenticated
*   **Success Response** (`200 OK`):
    ```json
    [
      {
        "id": 1,
        "firstName": "Jane",
        "lastName": "Doe",
        "email": "jane@doe.com"
      }
    ]
    ```

---

#### ➔ `GET /admin/:id`
*   **Description**: Retrieves details for a specific administrator by ID.
*   **Authorization**: Public / Unauthenticated
*   **Path Parameters**:
    *   `id`: Integer ID of the target admin
*   **Success Response** (`200 OK`):
    ```json
    {
      "id": 1,
      "firstName": "Jane",
      "lastName": "Doe",
      "email": "jane@doe.com",
      "createdAt": "2026-05-18T10:00:00.000Z"
    }
    ```

---

#### ➔ `PATCH /admin/:id`
*   **Description**: Updates details for a specific administrator (fields are optional).
*   **Authorization**: Public / Unauthenticated
*   **Path Parameters**:
    *   `id`: Integer ID of the target admin
*   **Request Body (`UpdateAdminDto`)**:
    ```json
    {
      "firstName": "Janet",
      "email": "janet@doe.com"
    }
    ```
*   **Success Response** (`200 OK`):
    ```json
    {
      "id": 1,
      "firstName": "Janet",
      "lastName": "Doe",
      "email": "janet@doe.com"
    }
    ```

---

#### ➔ `DELETE /admin/:id`
*   **Description**: Deletes an administrator account. Cascades to clean up all associated users and project metadata.
*   **Authorization**: Public / Unauthenticated
*   **Path Parameters**:
    *   `id`: Integer ID of the admin to delete
*   **Success Response** (`200 OK`):
    ```json
    {
      "id": 1,
      "email": "jane@doe.com",
      "message": "Admin deleted successfully"
    }
    ```

---

### 7. Base Core API (`/`)

#### ➔ `GET /`
*   **Description**: Simple API healthcheck endpoint.
*   **Authorization**: Public / Unauthenticated
*   **Success Response** (`200 OK`):
    ```text
    Hello World!
    ```

---

## 🧬 GraphQL Service

In addition to REST, Rooeel exposes a GraphQL playground at `http://localhost:<PORT>/graphql`. The schema is auto-generated into `src/schema.gql` on application bootstrap.

### ➔ Query: `healthCheck`
*   **Description**: Quick validation to verify that the Apollo GraphQL engine is active.
*   **Request**:
    ```graphql
    query {
      healthCheck
    }
    ```
*   **Response**:
    ```json
    {
      "data": {
        "healthCheck": "GraphQL API is active and running!"
      }
    }
    ```

---

## 🧪 Testing Suite

Rooeel includes unit tests and E2E test suites using [Jest](https://jestjs.io/) and [Supertest](https://github.com/ladjs/supertest).

```bash
# Run all unit tests
npm run test

# Run unit tests in watch mode
npm run test:watch

# Execute End-to-End (E2E) integration test suites
npm run test:e2e

# Generate test coverage reports
npm run test:cov
```

---

## ⚖️ License

Rooeel is licensed under the terms of the private/proprietary license (UNLICENSED). All rights reserved.
