# Privacy Invariants

- Raw screen frames are transaction-scoped memory only.
- Raw screenshots and frames must not be persisted locally.
- Raw screenshots and frames must not be uploaded for routine V1 inference.
- Recovery and tracker records must not become model input.
- Logs may include non-sensitive categories, timings, state transitions, and confidence buckets, but never screen content.
- Detailed browsing history should not be retained where aggregate/category counters are sufficient.
- Account data must be user-scoped and protected by authenticated API authorization and Supabase RLS.

