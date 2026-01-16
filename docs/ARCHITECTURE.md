# Architecture

## 1. Higher-Level Architecture
For current visual representation of the architecture, see [Architecture Diagrams](https://excalidraw.com/#json=961xLA-qtPACm-XM2kW2D,dl8hw5alZnTMN4kQWS9Wig).

---

## 2. Tech Stack
### Backend

| **Category**          | **Technology & Purpose**                                                                                                                                                                                                                                              |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Language**          | **Golang** – Chosen for simplicity, high performance, and built-in support for concurrency.                                                                                                                                                                           |
| **Framework**         | **[Fiber](https://gofiber.io/)** – A fast, Express-inspired web framework for Go.                                                                                                                                                                                     |
| **Database**          | - **[PostgreSQL](https://www.postgresql.org/docs/current/)** – Reliable relational database for transactional and complex queries.<br>- **[Docker](https://www.docker.com/)** – Containerized environment for development and testing.                                |
| **ORM**               | **[Bun](https://bun.uptrace.dev/)** – Simplifies database querying and interactions.                                                                                                                                                                                  |
| **Migrations**        | **[Goose](https://pressly.github.io/goose/)** – Supports database schema migrations with up, down, and specific-hash migration commands.                                                                                                                              |
| **Authorization**     | **JSON Web Tokens (JWT)** – Stateless and standardized authorization, compatible across multiple client applications.                                                                                                                                                 |
| **API Doc** | **[Scalar](https://scalar.com/)** – Provides clear and maintainable API documentation.                                                                                                                                                                                |
| **External Services** | - **[AWS S3](https://docs.aws.amazon.com/AmazonS3/latest/API/Welcome.html)** – Storage and management of images.<br>- **[Expo Push Service](https://docs.expo.dev/push-notifications/sending-notifications/)** – Sending push notifications to users. |

### Frontend
| **Category**                | **Technology & Purpose**                                                                                                                                              |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Language**                | **TypeScript** – Ensures type safety and reduces runtime errors.                                                                                                      |
| **Framework**               | **[React Native](https://reactnative.dev/docs/environment-setup)** with **[Expo](https://docs.expo.dev/guides/overview/)** – For building cross-platform mobile apps. |
| **Authentication**          | **[Supabase Auth](https://supabase.com/docs/guides/auth)** – Handles user authentication securely and efficiently.                                                    |
| **Styling**                 | **[Nativewind](https://www.nativewind.dev/)** – Tailwind CSS-inspired utility-first styling for React Native.                                                         |
| **Design System**           | **[Restyle](https://shopify.github.io/restyle/fundamentals/)** – A theming and styling system for reusable, consistent UI components.                                 |
| **Server State Management** | **[TanStack Query](https://tanstack.com/query/latest/docs/framework/react/quick-start)** – Simplifies API calls, caching, and handling loading/error states.          |
| **Client State Management** | **[Zustand](https://zustand-demo.pmnd.rs/)** – Lightweight and flexible state management.                                                                             |
| **API Client Generation**   | **[Kubb](https://kubb.dev/)** – Auto-generates typed API clients, Zod schemas and React Query hooks from OpenAPI/Swagger specs.                                       |
| **Validation**              | **[Zod](https://zod.dev/)** – Type-safe schema validation for forms and API requests.                                                                                 |             |

---

## 3. Repository Structure
### Backend

```
backend/
├── cmd/                 
│   └── main.go          # Entry point of the application
├── docs/                # API documentation
├── internal/            
│   ├── config/          # Application configuration and environment setup
│   ├── controllers/     # API route handlers
│   ├── database/        # Database connection and setup
│   ├── errs/            # Custom error types and error handling utilities
│   ├── migrations/      # Database migration files
│   ├── models/          # Database entity definitions and schemas
│   ├── repository/      # Data access layer (queries and repositories)
│   ├── server/          # Building and configuring the server
│   │   ├── middlewares/ # Custom middleware (logging, authorization, compression, etc.)
│   │   └── routers/     # API route definitions
│   ├── services/        # Business logic and service layer
│   ├── tests/           # Tests and testkit
│   └── utilities/       # Helper functions and reusable utilities
```
-----

### Frontend

```
frontend/
├── api/                 # API calls to backend endpoints
├── app/                 # Expo Router file-based routing
│   ├── (app)/           # Protected app routes (requires authentication)
│   ├── (auth)/          # Authentication routes (login, register, forgot password)
│   └── _layout.tsx      # Root layout with providers
├── assets/              # Static assets (images, fonts, svgs, icons)
├── auth/                # Authentication service and Supabase client
├── constants/           # Constants and configuration values
├── contexts/            # React contexts (user context, etc.)
├── design-system/       # UI components and theming
│   ├── base/            # Base components (Box, Text, Button)
│   ├── components/      # Composed components
│   ├── config/          # Theme config (colors, spacing, typography)
│   └── variants/        # Component variants (button, avatar)
├── hooks/               # Custom React hooks
├── types/               # TypeScript type definitions
└── utilities/           # Helper functions
```

---

## 4. Infrastructure & Configuration

- We use **[Doppler](https://www.doppler.com/)** to manage secrets. This eliminates the need for local `.env` files. Updates propagate automatically to all team members, keeping environments in sync without anyone needing to manually share sensitive information.
- We use **[Pulumi](https://www.pulumi.com/) to manage cloud infrastructure in TypeScript, giving us version control for infrastructure. Changes to resources are fully versioned and reproducible, and adding something like a new S3 bucket only needs us to specify bucket name and running Pulumi, much easier than navigating the console.

---

## 5. Automated Workflows

### Continuous Integration (CI)

Every pull request is automatically checked to ensure code reliability, security, and style consistency. Key tools include:

* **Dependabot**, which keeps dependencies up to date for security and compatibility.
* **CodeQL**, performing static code analysis to detect vulnerabilities and code quality issues.
* **Linters and Formatters**, ensuring consistent coding standards and uniform style.
* **Automated Tests**, covering unit, integration, and mock scenarios to prevent regressions and verify functionality.

### Continuous Deployment (CD)

Our deployment pipeline ensures that releases are safe, repeatable, and consistent across environments.

* **Data Layer**: PostgreSQL hosted on **Supabase**, offering managed databases with authentication, backups, and monitoring.
* **Backend**: Containerized with **Docker** and deployed to **DigitalOcean**, guaranteeing identical runtime environments from development to production.
* **Frontend**: Built with Expo and deployed to TestFlight for iOS beta testing.