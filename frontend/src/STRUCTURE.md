# Frontend source structure

The frontend follows a feature-first structure. Domain-specific code stays
inside `features`, while application bootstrapping and genuinely reusable code
live in the shared top-level folders.

```text
src/
|-- app/
|   |-- providers/       # Application-wide providers
|   `-- router/          # Route definitions and route guards
|-- assets/              # Images, fonts, and other bundled assets
|-- components/
|   |-- feedback/        # Loading, empty, and error states
|   |-- layout/          # Shared navigation and shell components
|   `-- ui/              # Reusable presentational primitives
|-- config/              # Typed application and environment configuration
|-- features/
|   |-- auth/            # Sign-in, session state, and access control
|   |-- crm/             # Leads, activities, and test drives
|   |-- dashboard/       # Dashboard-specific UI and pages
|   |-- inventory/       # Vehicle inventory workflows
|   |-- platform/        # Platform administration
|   |-- sales/           # Offers, reservations, and sales
|   |-- tenancy/         # Tenants and locations
|   `-- users/           # User administration
|-- hooks/               # Reusable cross-feature React hooks
|-- lib/
|   |-- api/             # Shared HTTP client and API utilities
|   |-- storage/         # Browser storage adapters
|   `-- utils/           # Framework-independent helpers
|-- styles/              # Shared and global style modules
|-- types/               # Cross-feature TypeScript types
|-- app/App.tsx          # Root component
|-- index.css
`-- main.tsx
```

Each domain feature may contain `api`, `components`, `hooks`, `pages`, and
`types`. Code should remain inside its feature until it is reused by more than
one domain; only then should it move to a shared top-level folder.
