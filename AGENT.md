# AGENT.md

## Purpose

This file defines the mandatory operating rules for every AI coding agent working in this repository.

These rules apply to implementation, debugging, refactoring, testing, configuration, migrations, infrastructure, documentation, and code review.

The agent MUST follow this file together with the approved product and technical requirements.

If instructions conflict, use this priority order:

1. Explicit current user instruction
2. Approved product requirements
3. Approved technical requirements
4. `AGENT.md`
5. Existing tests
6. Existing documented architecture
7. Existing implementation behavior
8. Engineering judgment

The agent MUST surface unresolved conflicts instead of silently inventing a decision.

---

# 1. Absolute Pre-Coding Rule

## 1.1 No Code Before an Implementation Plan

**Before writing, editing, generating, deleting, or refactoring a single line of production code, the agent MUST first create an implementation plan.**

This rule applies to every coding task, including apparently small fixes.

The implementation plan MUST be written before code changes begin.

At minimum, the plan MUST identify:

- The requested behavior or problem.
- The relevant requirements.
- The files, modules, components, services, APIs, schemas, or tests likely to be affected.
- The current implementation that must be inspected.
- The proposed implementation approach.
- Important edge cases.
- Security and privacy implications.
- Data, migration, compatibility, performance, battery, or lifecycle implications where relevant.
- Tests or verification that will be performed.

For very small changes, the plan may be short, but it MUST still exist.

The agent MUST NOT:
- Start coding and create the plan afterward.
- Treat an internal vague intention as a plan.
- Skip the plan because the change appears obvious.
- Make unrelated edits while executing the plan.

If new information materially changes the approach, the agent MUST update the plan before continuing.

---

# 2. Mandatory Repository Inspection

Before finalizing the implementation plan, the agent MUST inspect enough of the repository to understand the existing system.

The agent SHOULD inspect:

- Relevant requirements and documentation.
- Existing implementation of the affected feature.
- Nearby modules and dependencies.
- Existing types and interfaces.
- Existing data models and migrations.
- Existing API contracts.
- Existing reusable utilities and components.
- Existing tests.
- Existing error-handling patterns.
- Existing configuration.

The agent MUST NOT pretend to have inspected files it has not read.

The agent MUST search for existing solutions before introducing duplicate abstractions, helpers, components, services, or schemas.

---

# 3. Scope Discipline

Implement only what is required.

The agent MUST NOT:

- Add speculative product features.
- Introduce unrelated UI changes.
- Perform broad rewrites when a targeted change is sufficient.
- Add infrastructure without a concrete requirement.
- Change public contracts casually.
- Remove behavior merely because it appears unused.
- Introduce business rules not supported by requirements.
- Bundle unrelated refactors into feature work.

Prefer the smallest correct change that fully satisfies the requirement.

---

# 4. Code Quality

Production code MUST be:

- Readable
- Maintainable
- Predictable
- Testable
- Modular
- Consistent
- Explicit where behavior matters

## 4.1 Naming

Names MUST communicate intent.

Prefer domain-specific names such as:

- `getProtectionHealth()`
- `syncPendingMutations()`
- `isVisualProtectionEnabled`

Avoid vague names such as:

- `doStuff()`
- `handleThing()`
- `data2`
- `temp`

Use the same domain terminology consistently across the project.

## 4.2 Functions and Modules

Functions SHOULD:

- Have one coherent responsibility.
- Avoid hidden side effects.
- Return predictable results.
- Validate data entering trusted logic.
- Make failure behavior explicit.

Modules SHOULD have clear ownership and boundaries.

If a function or module becomes difficult to explain, simplify or split it.

## 4.3 Comments

Comments SHOULD explain:

- Why a non-obvious decision exists.
- Platform limitations.
- Security assumptions.
- Important invariants.
- Counterintuitive behavior.

Comments SHOULD NOT merely restate the code.

## 4.4 Dead and Temporary Code

Do not leave:

- Commented-out implementations.
- Temporary debug logging.
- Unused imports or variables.
- Placeholder branches.
- Abandoned experiments.
- Duplicate helpers.
- Stale TODOs for work required by the current task.

---

# 5. Simplicity and Architecture

Prefer the simplest architecture that satisfies current requirements and realistic near-term growth.

Avoid:

- Premature abstraction.
- Premature microservices.
- Unnecessary design patterns.
- Generic frameworks for a single use case.
- Premature caching.
- Clever code that reduces readability.

Respect existing architectural boundaries.

The agent MUST:

- Keep presentation concerns separate from business rules where practical.
- Centralize data access.
- Centralize reusable validation.
- Keep platform-specific behavior in the appropriate platform layer.
- Maintain a clear owner for authoritative state.
- Avoid circular dependencies.
- Avoid bypassing repositories, services, or APIs simply because direct access is easier.

---

# 6. Scalability

Code SHOULD support realistic product growth without unnecessary complexity.

Consider:

- Efficient database access.
- Pagination for potentially large datasets.
- Batch operations where appropriate.
- Idempotent operations.
- Background work for expensive tasks.
- Avoiding unnecessary network round trips.
- Avoiding repeated expensive computation.
- Avoiding global mutable state.
- Avoiding obvious high-complexity loops on user-scale data.

Do not introduce distributed architecture solely in anticipation of hypothetical scale.

---

# 7. Security

Security is mandatory.

Assume all external input is untrusted.

## 7.1 Validation

Validate data from:

- API requests.
- Query and path parameters.
- Forms.
- Uploaded files.
- Webhooks.
- Deep links.
- Native bridge messages.
- Environment configuration.
- External services.

Validation SHOULD enforce both structure and semantic constraints.

## 7.2 Authentication

Protected operations MUST verify authenticated identity at a trusted boundary.

Do not rely solely on:

- Client state.
- UI visibility.
- Route hiding.
- Local flags.
- Unverified tokens.

## 7.3 Authorization

Authentication is not authorization.

Every protected resource operation MUST verify that the authenticated user is allowed to access or modify the resource.

Never trust a client-provided user identifier as proof of ownership.

## 7.4 Secrets

Never hardcode or commit:

- API keys.
- Database credentials.
- OAuth secrets.
- Encryption keys.
- Signing keys.
- Service tokens.
- Private credentials.

Use approved secret or environment mechanisms.

## 7.5 Injection and Unsafe Input

Prevent:

- SQL injection.
- Command injection.
- XSS.
- Path traversal.
- Header injection.
- Template injection.
- Unsafe deserialization.

Use framework-supported safe APIs and parameterization.

## 7.6 Sensitive Logging

Never log:

- Passwords.
- Authentication tokens.
- Session cookies.
- Private keys.
- Full payment credentials.
- Raw sensitive content.
- Sensitive screenshots or screen captures.

Production errors MUST NOT expose sensitive internal implementation details.

## 7.7 Transport and Dependencies

Production client-server traffic MUST use secure transport.

Never disable certificate validation in production.

Before adding a dependency, consider:

- Maintenance status.
- Security history.
- License.
- Bundle or binary impact.
- Native impact.
- Long-term necessity.

Prefer established and actively maintained dependencies.

---

# 8. Privacy

Collect, store, process, and transmit only data required by the product.

The agent MUST:

- Respect documented privacy boundaries.
- Avoid unnecessary collection.
- Avoid unnecessary retention.
- Keep local data local when requirements say processing is on-device.
- Avoid sending sensitive content to analytics or crash reporting.
- Ensure deletion flows delete the intended data.
- Avoid exposing private data through logs, diagnostics, or error messages.

If a feature is specified as on-device, the agent MUST NOT introduce cloud processing without explicit approval.

---

# 9. Data Integrity and Persistence

Persistent state MUST remain consistent.

Use appropriate:

- Transactions.
- Constraints.
- Stable identifiers.
- Idempotency keys.
- Conflict handling.
- Migrations.
- Recovery behavior.

Never silently discard user data.

When multiple writes form one logical operation, they SHOULD be transactional.

---

# 10. Database Rules

Before changing a schema, the implementation plan MUST cover:

- Existing schema.
- Affected queries.
- Required migration.
- Existing production data.
- Backward compatibility.
- Rollback or recovery implications.
- Required test updates.

Avoid:

- N+1 queries.
- Unbounded queries on potentially large datasets.
- Duplicate data without ownership rules.

Add indexes only when justified by actual query patterns, uniqueness, joins, filtering, or sorting.

---

# 11. API Rules

APIs SHOULD be:

- Predictable.
- Validated.
- Authenticated where required.
- Authorized where required.
- Idempotent when retries are possible.
- Explicit about failure.
- Compatible with existing consumers unless a breaking change is approved.

Errors SHOULD clearly distinguish common conditions such as:

- Invalid request.
- Authentication required.
- Forbidden.
- Not found.
- Conflict.
- Rate limited.
- Internal failure.

Do not leak private stack traces or internal secrets.

---

# 12. Error Handling

Errors MUST NOT be silently swallowed.

A failure must be intentionally:

- Handled.
- Propagated.
- Retried safely.
- Surfaced to the user.
- Or recorded for diagnosis.

Retries MUST:

- Be bounded.
- Use appropriate backoff.
- Avoid retrying permanent failures.
- Avoid creating duplicate side effects.

Do not use broad catch blocks merely to hide errors.

---

# 13. State and Concurrency

Maintain a clear authoritative source of truth.

UI or cached state MUST NOT claim success when the authoritative subsystem disagrees.

For asynchronous or concurrent work:

- Prevent race conditions.
- Prevent duplicate execution.
- Handle cancellation.
- Handle timeouts.
- Prevent stale results from overwriting newer state.
- Respect application lifecycle.
- Use transactions, locks, queues, or atomic operations only when justified.

---

# 14. Performance and Battery

Performance work MUST be evidence-driven.

Consider where relevant:

- CPU.
- Memory.
- Network usage.
- Database queries.
- Render frequency.
- Startup time.
- Bundle or application size.
- Background execution.
- Battery.
- Thermal behavior.
- ML inference latency.

Prefer event-driven behavior over polling.

For mobile workloads:

- Do not use tight background loops.
- Do not run expensive processing outside eligible contexts.
- Stop work when the relevant context ends.
- Release captures, models, sensors, listeners, and services when no longer needed.
- Avoid unnecessary wake locks.
- Batch background work where practical.
- Measure battery impact rather than assuming it.

---

# 15. Offline and Synchronization

If the product supports offline behavior:

- Required local functionality MUST continue without connectivity.
- Local writes MUST not be discarded because the network is unavailable.
- Synchronization SHOULD be eventual.
- Sync failures MUST NOT corrupt local state.
- Duplicate synchronization MUST be prevented.
- Conflicts MUST have deterministic handling.
- Connectivity loss MUST be treated as a normal operating state.

Cloud availability MUST NOT be treated as proof that local protection or local state is healthy.

---

# 16. Backward Compatibility and Migrations

Before changing any persisted or public contract, identify existing consumers.

This includes:

- Database schemas.
- API payloads.
- Stored configuration.
- Event formats.
- Native bridge contracts.
- Authentication flows.
- Deep links.
- Public components.

Breaking changes require explicit justification and a migration strategy.

Migrations MUST:

- Handle existing data.
- Be deterministic.
- Avoid destructive defaults.
- Be tested on representative prior data.
- Preserve rollback or recovery options where practical.

---

# 17. Testing

Every meaningful change MUST be verified.

Use the appropriate combination of:

- Unit tests.
- Integration tests.
- API tests.
- UI tests.
- Regression tests.
- Security tests.
- Migration tests.
- Offline tests.
- Lifecycle tests.
- Failure-path tests.
- Performance tests.

Tests MUST verify behavior rather than merely execute code.

Tests SHOULD be deterministic, isolated, readable, and independent of execution order.

Avoid arbitrary sleep-based tests when deterministic synchronization is possible.

Do not remove or weaken tests merely to make a build pass.

---

# 18. Build and Validation Protocol

Before declaring work complete, run every relevant check available in the repository, such as:

- Formatter.
- Linter.
- Static analysis.
- Type checker.
- Unit tests.
- Integration tests.
- Build.
- Package validation.

The agent MUST clearly state which checks were actually run.

The agent MUST NOT claim that tests passed if they were not executed.

If a required check cannot be run, report:

- Which check.
- Why it could not run.
- What remains unverified.

---

# 19. UI and Accessibility

When changing UI:

- Follow the approved design system.
- Reuse shared components.
- Handle loading, empty, error, disabled, and offline states.
- Provide clear user feedback.
- Avoid misleading status.
- Support relevant screen sizes.
- Preserve accessibility.

Where applicable:

- Controls MUST be identifiable.
- Touch targets MUST be usable.
- Screen reader semantics SHOULD be provided.
- Color MUST NOT be the only indicator of meaning.
- Focus order SHOULD be sensible.

---

# 20. Configuration and Environments

Environment-specific values MUST NOT be hardcoded.

Use explicit environment configuration for development, test, staging, and production where applicable.

Production defaults SHOULD fail safely.

Feature flags MUST have explicit default behavior.

Do not ship development shortcuts into production.

---

# 21. Observability

Observability SHOULD provide enough information to diagnose failures without exposing sensitive user data.

Appropriate telemetry may include:

- Error category.
- Operation.
- Timing.
- Service state.
- Retry state.
- Non-sensitive identifiers.

Do not capture private content merely for debugging convenience.

---

# 22. Abuse Prevention

Public or expensive operations SHOULD consider:

- Authentication.
- Authorization.
- Rate limiting.
- Request size limits.
- Quotas.
- Replay protection.
- Idempotency.
- Brute-force protection.

Controls that enforce security MUST live at trusted boundaries.

---

# 23. Files and Uploads

When handling files:

- Validate size.
- Validate actual type.
- Do not trust extensions alone.
- Sanitize filenames.
- Prevent path traversal.
- Restrict access appropriately.
- Avoid executable storage locations where relevant.
- Avoid exposing internal storage paths.

---

# 24. Cryptography

Never invent custom cryptography.

Use established cryptographic libraries and approved algorithms.

Do not:

- Hardcode encryption keys.
- Use obsolete algorithms.
- Treat encoding as encryption.
- Reuse nonces incorrectly.
- Store plaintext secrets where encrypted storage is required.

---

# 25. Permissions and Platform Policies

Request only permissions required by implemented features.

The implementation MUST:

- Explain why a permission is needed.
- Handle denial gracefully.
- Detect revoked access.
- Avoid unrelated permissions.
- Report degraded functionality truthfully.

Technically possible behavior MUST NOT be implemented if it violates distribution-platform policy.

For policy-sensitive capabilities, requirements MUST be revalidated before release.

---

# 26. Truthful System Status

Never present an operation as successful merely because it was attempted.

Examples:

- Do not show `Synced` before confirmed synchronization.
- Do not show `Protected` when required protection services are unavailable.
- Do not show `Saved` if persistence failed.
- Do not show `Authenticated` from stale cached state.
- Do not show payment success based only on client-side assumptions.

User-visible system state MUST reflect authoritative system state.

---

# 27. Destructive Operations

Destructive operations require appropriate authorization and confirmation.

Examples include:

- Account deletion.
- File deletion.
- Data deletion.
- Schema drops.
- Migration resets.
- Credential revocation.

Irreversible behavior MUST be clearly identified.

---

# 28. Refactoring

Refactor only when:

- Required by the feature.
- Necessary for correctness or security.
- Existing architecture makes the requested change unsafe.
- It removes meaningful duplication.
- The user explicitly requested it.

Keep unrelated refactoring separate from feature changes whenever practical.

---

# 29. Debugging Protocol

When fixing a bug:

1. Reproduce or establish the failing condition.
2. Identify the root cause.
3. Determine why existing safeguards did not prevent it.
4. Create or update the implementation plan.
5. Implement the smallest robust fix.
6. Add regression coverage where appropriate.
7. Verify related flows.

Do not randomly modify code until the symptom disappears.

---

# 30. Dependency Management

Before adding a dependency, determine:

1. Whether it is actually required.
2. Whether an equivalent already exists in the repository.
3. Whether the platform or standard library already provides the needed functionality.
4. Whether the package is maintained.
5. Whether it introduces security or licensing risk.
6. Whether its size or native impact is acceptable.

Remove dependencies that become unused.

Do not perform unrelated dependency upgrades during feature work.

---

# 31. Documentation

Documentation MUST remain consistent with implementation.

Update relevant documentation when changing:

- Behavior.
- Architecture.
- APIs.
- Setup.
- Configuration.
- Permissions.
- Deployment.
- Data handling.

Do not knowingly leave stale instructions.

---

# 32. Production Safety

The following are forbidden in production code unless explicitly and safely required:

- Hardcoded test credentials.
- Disabled TLS validation.
- Authentication bypasses.
- Authorization bypasses.
- Exposed admin endpoints.
- Weak default credentials.
- Unrestricted CORS without justification.
- Public stack traces.
- Insecure temporary storage.
- Fake backend responses masquerading as production behavior.

---

# 33. Security Review Triggers

The implementation plan MUST include an explicit security review when changing:

- Authentication.
- Authorization.
- Account recovery.
- Encryption.
- User deletion.
- File uploads.
- Payments.
- Sensitive storage.
- Native permissions.
- Webhooks.
- API tokens.
- Admin functionality.
- Database access policies.
- Cross-user data access.

---

# 34. Agent Integrity

The coding agent MUST NOT:

- Pretend to have read files it did not inspect.
- Claim tests passed when they were not run.
- Claim completion while known critical issues remain.
- Invent implementation results.
- Remove failing tests to hide defects.
- Weaken security to make development easier.
- Silently change business rules.
- Ignore known requirements.
- Hide platform limitations.
- Replace established architecture without justification.

When blocked, report:

- What is missing.
- Why it blocks implementation.
- What decision or information is required.

---

# 35. Self-Review Before Completion

Before finalizing a task, the agent MUST review its changes for:

- Requirement coverage.
- Correctness.
- Scope creep.
- Security.
- Privacy.
- Data integrity.
- Error handling.
- Performance.
- Battery impact where relevant.
- Scalability.
- Maintainability.
- Test coverage.
- Backward compatibility.
- UX regressions.
- Accessibility.
- Logging leaks.
- Secrets.
- Unnecessary dependencies.
- Dead code.

Any issue found during self-review MUST be resolved or explicitly reported.

---

# 36. Definition of Complete

A coding task is complete only when:

1. The required behavior is implemented.
2. The implementation follows the approved plan or the plan has been updated to reflect justified changes.
3. Relevant requirements are satisfied.
4. Relevant tests and verification have been run.
5. Relevant build, type, and lint checks pass where available.
6. Failure states are handled.
7. Security and privacy implications are addressed.
8. No known critical regression remains.
9. Required documentation is updated.
10. Known limitations are explicitly reported.

---

# 37. Required Final Report

After coding, the agent SHOULD provide a concise report with:

## Changes Made
What was implemented.

## Files Changed
Primary files or modules modified.

## Verification
Tests, builds, linters, type checks, or manual verification actually performed.

## Security / Privacy Impact
Relevant data, permission, authentication, authorization, or privacy implications.

## Known Limitations
Anything unverified, platform-dependent, intentionally deferred, or incomplete.

Do not include speculative follow-up work unless it is genuinely necessary.

---

# 38. Prime Directive

Before code: **inspect, understand, and plan.**

During code: **make the smallest correct, secure, maintainable change.**

After code: **test, verify, self-review, and report truthfully.**

Correctness, security, privacy, maintainability, and truthful system behavior take precedence over speed.
