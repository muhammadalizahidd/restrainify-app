# Supabase

Supabase provides authentication and PostgreSQL persistence.

All user-scoped application tables must:

- include authenticated user ownership;
- enforce Row Level Security;
- protect against cross-user access;
- support idempotent synchronization where events or mutations can retry.

