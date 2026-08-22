# Monolith performance suite

The scripts target a separately seeded performance database. Set `BASE_URL`, `TEST_EMAIL`, and `TEST_PASSWORD`; never point the write-contention scripts at production.

- `read-workload.js`: smoke, baseline, average, stress, spike, soak, and breakpoint profiles selected through `PROFILE`.
- `auth-load.js`: bcrypt/login capacity at increasing arrival rates.
- `search-and-pagination.js`: common/selective searches and deep offset pages.
- `reservation-contention.js`: twenty simultaneous attempts against one vehicle; exactly one must succeed.
- `sale-contention.js`: twenty simultaneous completion attempts against one sale; exactly one must succeed.

Every measured run should use `--summary-export` and a unique output filename so the same suite can be repeated unchanged after the microservice migration.
