# Contract strategy

The public API must remain stable even while internal services evolve.

## Strategy

- expose clients through the **API gateway**
- publish versioned HTTP contracts under `/v1`
- generate shared client SDKs from source contracts over time
- treat service APIs as internal unless explicitly promoted

## Compatibility rules

- additive changes are preferred
- removals require deprecation windows
- breaking changes require versioning and migration notes
