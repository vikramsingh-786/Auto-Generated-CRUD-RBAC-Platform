# </> DuBuddy - Auto-Generated CRUD + RBAC Platform

DuBuddy is a low-code internal developer platform built with NestJS and Next.js. It empowers administrators to define data models directly from a web UI, which then automatically generates:
*   **CRUD REST APIs** for each model.
*   A dynamic **Admin Interface** for data management.
*   Granular **Role-Based Access Control (RBAC)** enforced on all operations.

This project fulfills the SDE assignment requirements by providing a modular, file-based system for rapid backend development.

## ✨ Key Features

-   **Visual Model Builder:** Define models, fields, types, and relations through an intuitive UI.
-   **File-Based Persistence:** When a model is published, its definition is saved as a `.json` file in the backend's `/models` directory, acting as a version-controllable source of truth.
-   **Dynamic API Generation:** REST endpoints (`POST`, `GET`, `PUT`, `DELETE`) are automatically registered and made available for each published model.
-   **Role-Based Access Control (RBAC):** Configure `Create`, `Read`, `Update`, and `Delete` permissions for each role (Admin, Manager, Viewer) on a per-model basis.
-   **Ownership Enforcement:** Secure `update` and `delete` operations by ensuring they can only be performed by the record's owner or an Admin.
-   **Dynamic Admin UI:** The frontend automatically renders data tables and forms based on the model definitions fetched from the backend.
-   **Authentication:** Secure JWT-based authentication for all users.
-   **Automated E2E Testing:** A complete end-to-end test suite to validate the core application flow, from authentication to RBAC-protected CRUD operations.

## 📸 Screenshots

Here is a walkthrough of the platform's user flow:

| Landing Page | Register & Login |
| :---: | :---: |
| ![Landing Page](path/to/your/landing-page-screenshot.png) | ![Register Page](path/to/your/register-page-screenshot.png) |
| **Dashboard** | **Visual Model Creator** |
| ![Dashboard](path/to/your/dashboard-screenshot.png) | ![Create Model Page](path/to/your/create-model-screenshot.png) |
| **Dynamic Data Management** | **Authentication Flow** |
| ![Product Data Page](path/to/your/product-data-screenshot.png) | ![Welcome Back Page](path/to/your/welcome-back-screenshot.png) |

## 💻 Tech Stack

| Category      | Technology                                    |
| ------------- | --------------------------------------------- |
| **Backend**   | Node.js, NestJS, TypeScript, Prisma ORM       |
| **Frontend**  | Next.js (React), TypeScript, Tailwind CSS     |
| **Database**  | PostgreSQL (managed with Docker)              |
| **Testing**   | Jest, Supertest                               |
| **Auth**      | JWT (JSON Web Tokens)                         |

## 🚀 Getting Started

Follow these instructions to get the project running on your local machine.

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18 or later recommended)
-   [Docker](https://www.docker.com/products/docker-desktop/) and Docker Desktop running

### 1. Database Setup (Docker)

First, set up a persistent PostgreSQL database using Docker.

1.  **Create a Docker Volume:** This command creates a permanent storage location for your database data.
    ```bash
    docker volume create pgdata
    ```

2.  **Run the PostgreSQL Container:** This command starts a Postgres container, connects it to the volume, and sets the password. **Replace `my_secure_password` with your own password.**
    ```bash
    docker run --name my-stable-postgre -e POSTGRES_PASSWORD=my_secure_password -p 5432:5432 -v pgdata:/var/lib/postgresql/data -d postgres
    ```

### 2. Backend Setup

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Create the environment file:**
    Create a file named `.env` in the `backend` directory and add the following, replacing the placeholder password with the one you used in the Docker command.

    ```env
    # backend/.env
    DATABASE_URL="postgresql://postgres:my_secure_password@localhost:5432/postgres?schema=public"
    JWT_SECRET="a-very-long-and-super-secret-string-for-jwt"
    ```

4.  **Create and Migrate the Database:**
    This command connects to your Docker container, creates a new database named `crud_platform`, and runs the initial migration to create the `User` table.
    ```bash
    npx prisma migrate dev --name init
    ```
    *(Note: The command will prompt you to create the database if it doesn't exist. It will use the `DATABASE_URL` from your `.env` file but will create a new DB named `crud_platform` as configured in our previous steps)*.

5.  **Run the backend server:**
    ```bash
    npm run start:dev
    ```
    The backend will be running at `http://localhost:4001`.

### 3. Frontend Setup

1.  **Open a new terminal** and navigate to the frontend directory:
    ```bash
    cd frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Create the environment file:**
    Create a file named `.env.local` in the `frontend` directory and add the following line:
    ```env
    # frontend/.env.local
    NEXT_PUBLIC_API_URL=http://localhost:4001
    ```

4.  **Run the frontend server:**
    ```bash
    npm run dev
    ```
    The frontend will be running at `http://localhost:3001`.

## ⚙️ How It Works & Usage

### 1. Creating an Admin User
After registering your first user, you must manually promote them to an 'Admin' to access all features.
1.  Connect to your Docker database: `docker exec -it my-stable-postgre psql -U postgres`
2.  Connect to the application database: `\c crud_platform`
3.  Run the update command: `UPDATE "User" SET role = 'Admin' WHERE email = 'your-email@example.com';`

### 2. File-Based CRUD
When an Admin creates a new model (e.g., "Product") and clicks "Publish":
-   The backend's `ModelDefinitionsService` validates the schema.
-   It generates and executes a `CREATE TABLE` SQL command to build the corresponding table in the database.
-   It writes the complete model definition to a new file at `backend/models/Product.json`.

### 3. Dynamic Endpoints
The `DynamicApiService` handles all CRUD operations using raw SQL queries built with `Prisma.sql` for security. The `DynamicApiController` exposes these services via parameterized routes (e.g., `GET /api/:modelName`), allowing the system to handle any model without new code.

### 4. RBAC Enforcement
All requests to `/api/*` are protected by two global guards:
-   **`JwtAuthGuard`:** Verifies the user's JWT and attaches their info (`sub`, `role`) to the request.
-   **`RbacGuard`:** Reads the `modelName` from the URL, fetches the corresponding `.json` file, and checks the `rbac` rules against the user's role and the requested action (GET, POST, etc.). It also performs an **ownership check** for `update` and `delete` operations if the user is not an Admin.

## 🧪 Running Tests

The project includes a full End-to-End (E2E) test suite that validates the core application flow.

1.  **Create a test environment file:**
    In the `backend` directory, create a file named `.env.test`. It should point to a separate test database.
    ```env
    # backend/.env.test
    DATABASE_URL="postgresql://postgres:my_secure_password@localhost:5432/crud_platform_test?schema=public"
    JWT_SECRET="a-very-long-and-super-secret-string-for-jwt"
    ```

2.  **Run the test command from the `backend` directory:**
    ```bash
    npm run test:e2e
    ```
    This command will automatically:
    -   Create the `crud_platform_test` database if it doesn't exist.
    -   Apply all migrations to the test database.
    -   Run the Jest test suite, which programmatically registers users, publishes a model, and tests the RBAC-protected CRUD endpoints.