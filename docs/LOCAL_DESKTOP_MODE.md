# Local Desktop Mode

The current application is local-first. Application services use the typed repository
contracts, backed locally by `localStorage` through
`src/services/local.persistence.service.ts`. This keeps the UI usable offline and
also allows an empty local profile to read the existing historical Firestore data.
Writes stay local until a future relational or cloud backend is selected.

Projects, materials, formulations, setups, characterizations and experiments created
in the app are stored under namespaced `fluidnatek.local.*` keys in the browser profile.
The first empty profile displays the bundled seed experiments so the workflows can be
verified immediately.

This is suitable for local development and the future desktop packaging phase. It is
not yet a multi-user database and does not provide synchronization or backup. For an
`.exe`, the same adapter can later move from browser storage to a local desktop
database without changing the React workflows.
