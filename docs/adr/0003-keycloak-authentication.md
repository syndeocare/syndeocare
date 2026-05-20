# 0003 - Use Keycloak for self-hosted authentication

## Status

Accepted

## Context

The platform must avoid vendor-locked hosted auth and remain self-hostable.

## Decision

Use **Keycloak** as the central identity provider for OIDC/OAuth2,
role/realm-based access control, and token issuance.

## Consequences

- identity is controlled inside the platform boundary
- services must validate JWTs consistently
- operational ownership for Keycloak and its backing store is required
