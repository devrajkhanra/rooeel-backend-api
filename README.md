# 🚀 Rooeel Enterprise Backend API

A production-grade, highly performant, secure NestJS API engineered for enterprise-class Project, User Lifecycle, and Dynamic Role-Based Access Control (RBAC) Management. This backend acts as the core orchestration layer for the Rooeel platform, offering robust RESTful services for multi-part binary S3 uploads, an exhaustive type-safe GraphQL API, secure JWT token rotation and caching, real-time password management, dynamic project schemas, and multi-layered database transactions.

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
    *   **GraphQL (Apollo Server v5 / NestJS Apollo v13)**: Core administrative, project, member, role, permission, task, and subtask mutations and queries.
    *   **REST**: Primary HTTP protocol optimized for multi-part binary S3 file uploads/deletions, request state changes, and session management.
*   **Security & Validation**: [Helmet](https://helmetjs.github.io/) for secure HTTP headers, standard CORS configuration, and [class-validator](https://github.com/typestack/class-validator) with strict data transformation pipes.

---

## 🗄️ Prisma Database Schema & Relations

The PostgreSQL database is organized into 12 tables, utilizing cascade deletion vectors and indexing to optimize query speed:

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
    }
    WorkOrderPdf {
        Int id PK
        Int projectId FK
        String fileKey
        String fileName
        Int uploadedBy FK
        DateTime createdAt
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
    Department {
        Int id PK
        Int projectId FK
        String name
        DateTime createdAt
        DateTime updatedAt
    }
    ProjectRole {
        Int id PK
        Int projectId FK
        String name UK
        DateTime createdAt
    }
    Permission {
        Int id PK
        Int projectRoleId FK
        Int departmentId FK
        String resource
        Boolean canView
        Boolean canCreate
        Boolean canEdit
        Boolean canDelete
        DateTime createdAt
        DateTime updatedAt
    }
    ProjectUser {
        Int id PK
        Int projectId FK
        Int userId FK
        Int projectRoleId FK
        Int departmentId FK
        DateTime assignedAt
    }
    Task {
        Int id PK
        Int projectId FK
        Int departmentId FK
        String title
        String description
        String status
        String type
        Json formSchema
        Json submissionData
        Int assignedTo FK
        DateTime createdAt
        DateTime updatedAt
    }
    SubTask {
        Int id PK
        Int taskId FK
        String title
        String description
        String status
        String type
        Json formSchema
        Json submissionData
        Int assignedTo FK
        DateTime createdAt
        DateTime updatedAt
    }

    Admin ||--o{ User : "creates"
    Admin ||--o{ Project : "creates"
    Admin ||--o{ UserRequest : "receives"
    Admin ||--o{ WorkOrderPdf : "uploads"
    User ||--o{ UserRequest : "submits"
    User ||--o{ ProjectUser : "assigned to"
    User ||--o{ Task : "assigned to"
    User ||--o{ SubTask : "assigned to"
    Project ||--o{ ProjectUser : "has members"
    Project ||--o{ Task : "has tasks"
    Project ||--o{ ProjectField : "defines fields"
    Project ||--o{ ProjectFieldValue : "stores values"
    Project ||--o{ WorkOrderPdf : "has work orders"
    Project ||--o{ Department : "has departments"
    Project ||--o{ ProjectRole : "defines roles"
    ProjectField ||--|| ProjectFieldValue : "has value"
    Department ||--o{ ProjectUser : "scopes"
    Department ||--o{ Task : "scopes"
    Department ||--o{ Permission : "bounds"
    ProjectRole ||--o{ ProjectUser : "grants"
    ProjectRole ||--o{ Permission : "holds"
    Task ||--o{ SubTask : "has subtasks"
```

### Table Definitions & Attributes

1.  **`Admin`**: Repositories for root platform operators. Can seed/create users and projects, and oversee the execution of change requests.
2.  **`User`**: Regular members on the platform. Associated with projects via a many-to-many model, can complete tasks, and must submit change requests for account modifications.
3.  **`RefreshToken`**: Session tracking table mapping cryptographically hashed tokens, expiry targets, and revocation timestamps for both admins and users.
4.  **`PasswordResetToken`**: Secure, 32-byte tokens generated with a 1-hour expiration window to govern unauthenticated password reset requests.
5.  **`UserRequest`**: Account modification request log (e.g. email updates, name changes, or password resets) linking users to their supervising admin.
6.  **`Project`**: High-level structural units created by admins. Associated with work orders, tasks, and dynamic client metadata.
7.  **`WorkOrderPdf`**: A versioned list of work order PDFs uploaded for a project. Backed by MinIO/S3 object keys.
8.  **`ProjectField`**: Dynamic configuration schema defining project fields (e.g., text inputs, date pickers, document uploads) on a per-project basis.
9.  **`ProjectFieldValue`**: Holds the corresponding values entered by admins or members for the dynamic project fields.
10. **`Department`**: Defines departmental scopes (e.g., "Civil", "Electrical", "Mechanical") within a project. Used to restrict task visibility.
11. **`ProjectRole`**: Dynamically configured roles created by admins on a per-project basis (e.g., "Site Manager", "Junior Engineer").
12. **`Permission`**: Dynamic mapping connecting a role and department to CRUD permissions (`view`, `create`, `edit`, `delete`) on specific resources (`WORK_ORDER`, `TASK`, `SUBTASK`, `DEPARTMENT`, `USER`).
13. **`ProjectUser`**: A junction table linking a user to a project with a dynamically selected project-specific role and department scope.
14. **`Task`**: Standard or Form-based work units assigned to projects and departments, supporting customized schemas for user inputs.
15. **`SubTask`**: Granular form-based or basic sub-units nested within a task, assigned to project users.

---

## 🔒 Security Architecture: REST & GraphQL Separation

To provide the absolute highest tier of application security, Rooeel splits authorization logic into distinct layers, handling binary S3 uploads and general data mutations separately:

```
                          ┌─────── REST Controllers ───────> [RestAuthGuard] + [RestAdminGuard]
                          │                                     - Handles Multipart uploads
                          │                                     - Inspects standard HTTP Context
[API Gateways] ───────────┤
                          │
                          └─────── GraphQL Resolvers ──────> [GqlUserGuard] + [ProjectPermissionGuard]
                                                                - Resolves GqlExecutionContext
                                                                - Fetches and verifies relations dynamically
```

### 1. REST Authentication & Scope Isolation
Because REST requests execute in standard HTTP contexts while GraphQL requests execute inside Apollo resolvers, applying a GQL guard on a REST controller throws runtime errors.
*   **`RestAuthGuard`**: Authenticates bearer tokens via standard HTTP context switching (`context.switchToHttp().getRequest()`). Used for REST endpoints like profile management.
*   **`RestAdminGuard`**: Verifies that the bearer token resolves to an administrative user (`role === 'admin'`). Mapped onto REST controllers like work-order uploads.

### 2. GraphQL Dynamic Relation Guard (`ProjectPermissionGuard`)
The `ProjectPermissionGuard` is a high-performance security guard that automatically resolves permission trees for non-admin users based on their dynamically assigned project-specific roles:
*   **Admin Bypass**: Administrators automatically bypass the guard with a `role === 'admin'` signature.
*   **Dynamic Relation Tracing**: If a query or mutation does not provide a direct `projectId`, the guard queries PostgreSQL dynamically to find the correct project parent:
    *   `fieldId` $\rightarrow$ Queries `ProjectField`
    *   `workOrderId` $\rightarrow$ Queries `WorkOrderPdf`
    *   `id` + `DEPARTMENT` resource $\rightarrow$ Queries `Department`
    *   `id` + `TASK` resource $\rightarrow$ Queries `Task`
    *   `id` + `SUBTASK` resource $\rightarrow$ Queries `SubTask` (nested join on `Task`)
    *   `taskId` $\rightarrow$ Queries `Task`
*   **Department Checking Strategy**: If a user's permission is scoped to a specific department, the guard validates that the user's active `ProjectUser.departmentId` matches the permission target before allowing task/subtask views or state submissions.

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
RESEND_API_KEY=re_RjoVAv7v_JbYgWY2j...
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

## 🛠️ Infrastructure & Deployment Operations

Rooeel includes both a streamlined **Local Development Setup** and an optimized, secure **Production Docker Setup**.

### 1. Local Development Setup (Hot-Reloading Containers)
This setup spins up Postgres, Redis, and MinIO in the background, allowing you to run NestJS locally on your machine with active file-watching:

```bash
# A. Start support services
docker-compose -f infrastructure/docker/docker-compose.yml up -d

# B. Install dependencies
npm install

# C. Apply schema migrations
npx prisma migrate dev

# D. Boot NestJS in watch mode
npm run start:dev
```

*   **PostgreSQL**: `localhost:5432`
*   **Redis**: `localhost:6379`
*   **MinIO Console**: `http://localhost:9001` (Creds: `minioadmin` / `minioadmin123`)

---

### 2. Multi-Stage Production Setup (Complete Build Isolation)
For production deployments, the backend is orchestrated via a high-performance **multi-stage docker build** which strips development packages and runs as a lean, unprivileged container:

```bash
# Start the full, production-ready stack in detached mode
docker-compose -f infrastructure/docker/docker-compose.prod.yml up -d --build
```

#### Production Docker Architecture (`docker-compose.prod.yml`)
*   **Lean Node Sandbox**: Utilizes `node:18-alpine` as a base layer.
*   **Multi-Stage Build**:
    *   *Stage 1 (Builder)*: Installs all dev dependencies, compiles TypeScript code to plain ES2022 inside `/dist`, generates Prisma bindings.
    *   *Stage 2 (Runner)*: Discards source files and builder dependencies, copy-pastes only `/dist`, `/node_modules` (pruned), and `/prisma`.
*   **Security Hardening**: Runs under an unprivileged `node` user account rather than root, locking down container exploits.
*   **Auto-Healing (Healthchecks)**:
    *   PostgreSQL and Redis include rigorous health probes (`pg_isready`, `redis-cli ping`) so the API service waits to start until data layers are fully hydrated and healthy.

---

## 🧬 Complete GraphQL Schema & Playground Reference

The GraphQL Playground is accessible at `http://localhost:<PORT>/graphql` when running in development mode.

### 1. Authentication Mutations

#### ➔ Admin Signup
Registers a new platform administrator and returns bearer session tokens:
```graphql
mutation {
  signupAdmin(input: {
    firstName: "Jane"
    lastName: "Doe"
    email: "jane@doe.com"
    password: "supersecurepassword123"
  }) {
    access_token
    refresh_token
    expiresIn
    admin {
      id
      email
    }
  }
}
```

#### ➔ Session Login
Authenticates administrators or standard users:
```graphql
mutation {
  login(input: {
    email: "jane@doe.com"
    password: "supersecurepassword123"
    role: "admin"
  }) {
    access_token
    expiresIn
  }
}
```

---

### 2. Administrative User Management

#### ➔ Create User
Allows administrators to register new users:
```graphql
mutation {
  createUser(input: {
    firstName: "John"
    lastName: "Smith"
    email: "john@smith.com"
    password: "userpassword123"
  }) {
    id
    firstName
    email
    createdBy
  }
}
```

#### ➔ Update User
Modifies user profile parameters:
```graphql
mutation {
  updateUser(id: 4, input: {
    firstName: "Johnny"
    lastName: "Smith"
  }) {
    id
    firstName
    lastName
  }
}
```

#### ➔ Delete User
Permanently deletes a user from the platform (cascades task cleanups):
```graphql
mutation {
  deleteUser(id: 4) {
    id
    email
    success
  }
}
```

---

### 3. Project Creation & Member Allocations

#### ➔ Create Project
Generates a new project with optional configuration values:
```graphql
mutation {
  createProject(input: {
    name: "Acme Infrastructure Build"
    description: "Multi-layered building pipeline"
    status: "active"
  }) {
    id
    name
    status
    createdBy
  }
}
```

#### ➔ Assign User to Project
Links a user to a project:
```graphql
mutation {
  assignUserToProject(projectId: 1, userId: 2) {
    id
    projectId
    userId
    role {
      name
    }
  }
}
```

#### ➔ Unassign User from Project
Removes a user's membership from a project:
```graphql
mutation {
  unassignUserFromProject(projectId: 1, userId: 2)
}
```

---

### 4. Dynamic Roles & Granular Scope Assignment

#### ➔ Define Dynamic Project Role
Creates a custom project role:
```graphql
mutation {
  createProjectRole(projectId: 1, name: "Junior Engineer") {
    id
    projectId
    name
  }
}
```

#### ➔ Set Role & Department Scope to User
Binds a member to a role and a specific department:
```graphql
mutation {
  setUserProjectRole(projectId: 1, userId: 2, roleId: 3) {
    id
    projectRoleId
  }
}

mutation {
  setUserProjectDepartment(projectId: 1, userId: 2, departmentId: 4) {
    id
    departmentId
  }
}
```

#### ➔ Configure Dynamic Permission Matrix
Upserts dynamic resource mappings to specific project roles:
```graphql
mutation {
  setRolePermission(input: {
    projectRoleId: 3
    departmentId: 4      # Nullable (Null = Project-wide permissions)
    resource: TASK
    canView: true
    canCreate: true
    canEdit: false
    canDelete: false
  }) {
    id
    resource
    canView
    canCreate
  }
}
```

---

### 5. Task & Form Submission Workflows

#### ➔ Create Task
Creates a standard or schema-based task under a project:
```graphql
mutation {
  createTask(input: {
    projectId: 1
    departmentId: 4
    title: "Verify Core Piping Structures"
    description: "Perform manual pressure validation"
    type: "form"
    formSchema: "{\"fields\": [{\"name\": \"pressureLevel\", \"type\": \"number\", \"label\": \"Pressure (PSI)\"}]}"
  }) {
    id
    title
    type
    status
  }
}
```

#### ➔ Submit Task Data (Form Submission)
Allows a scoped department user to complete form tasks:
```graphql
mutation {
  submitTaskData(taskId: 5, submissionData: "{\"pressureLevel\": 145}") {
    id
    status
    submissionData
  }
}
```

---

## 📝 Change Request Flow (Admin-Supervised Profiles)

Standard users (`role: 'user'`) cannot directly modify their profile variables (names, emails, passwords) to protect data integrity. They submit a formal **Change Request** that goes directly to their creator Admin's review pipeline:

```
[User Submits Request] ──> Status: 'pending' ──> [Admin Review]
                                                      ├─ Approve ──> Executes DB transaction, updates user profile.
                                                      └─ Reject  ──> Keeps user profile unmodified.
```

### 1. General Profile Request
```graphql
mutation {
  createChangeRequest(input: {
    requestType: "email"
    requestedValue: "newjohnny@smith.com"
  }) {
    id
    requestType
    currentValue
    requestedValue
    status
  }
}
```

### 2. Admin Decisions
```graphql
mutation {
  approveChangeRequest(id: 10) {
    id
    status
  }
}

mutation {
  rejectChangeRequest(id: 10) {
    id
    status
  }
}
```

### 3. Secure Admin-Managed Password Resets
For security, **plaintext passwords are never logged**. If a user requests a password reset, the admin triggers a secure generator mutation that sets the hashed bcrypt record in the database and returns the plain-text password to the administrator **exactly once**:

```graphql
mutation {
  generateTemporaryPassword(requestId: 12) {
    message
    generatedPassword   # DISPLAYED ONCE. NOT LOGGED ANYWHERE.
    userId
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
