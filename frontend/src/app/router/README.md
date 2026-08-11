# Adding routes

Create the page inside its feature folder, import it in `router.tsx`, and add
one entry to `protectedRoutes`:

```tsx
{
  path: 'inventory',
  element: <InventoryPage />,
  requiredPermissions: ['inventory.read'],
}
```

Omit `requiredPermissions` when every signed-in user may open the page. The
default permission mode requires every listed permission. Set
`permissionMode: 'any'` when one matching permission is enough.

Unauthenticated visitors are redirected to `/login` and returned to their
original URL after signing in. Users without the required permission are sent
to `/unauthorized`.

Authenticated feature API calls use the shared client:

```ts
const vehicles = await apiRequest<Vehicle[]>('/api/inventory/vehicles', {
  authenticated: true,
})
```
