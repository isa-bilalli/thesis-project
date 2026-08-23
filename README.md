# thesis-project
This is a modular monolithic multi-tenant car dealership application that I developed then turned into microservices in an effort to compare performance, and when and how it is more profitable to start evolving your backend from monolithic to microservices

## Extracted backend services

The transition currently routes traffic through the API gateway on port 3000:

- Access: port 3002, database `dealership_access`
- CRM: port 3003, database `dealership_crm`
- Inventory: port 3005, database `dealership_inventory`
- Sales: port 3006 (the remaining Sales extraction boundary)
- Modular-monolith fallback: port 3001

Inventory owns vehicle and reservation state. CRM owns customers, leads, lead
activities, lead-vehicle interests, and test drives. Cross-domain records are
stored as local projections and refreshed through authenticated internal HTTP
endpoints; the extracted schemas contain no cross-schema foreign keys.

From `backend`, provision the databases once with:

```powershell
npm run migrate:access
npm run migrate:inventory
npm run migrate:crm
```

Start the transition architecture in separate terminals:

```powershell
npm run dev
npm run dev:access
npm run dev:crm
npm run dev:inventory
npm run dev:sales
npm run dev:gateway
```

Set the same non-empty `INTERNAL_SERVICE_SECRET` for every service outside local
development. Reservation and sale commands send an `Idempotency-Key` header.
