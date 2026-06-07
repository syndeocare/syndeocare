"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  JobListing,
  JobListingListResponse,
  PlatformMetadata,
} from "@repo/contracts";
import styles from "./page.module.css";

type PlatformStatusState =
  | {
      kind: "loading";
    }
  | {
      kind: "error";
      message: string;
    }
  | {
      kind: "ready";
      metadata: PlatformMetadata;
      jobs: JobListing[];
      healthStatus: string;
    };

async function readJson<T>(url: string, signal: AbortSignal) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(
      `Request failed with ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as T;
}

export function PlatformStatusPanel() {
  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "",
    [],
  );
  const [state, setState] = useState<PlatformStatusState>({ kind: "loading" });

  useEffect(() => {
    if (!apiBaseUrl) {
      setState({
        kind: "error",
        message:
          "NEXT_PUBLIC_API_BASE_URL is not configured, so the web shell cannot read the platform API yet.",
      });
      return;
    }

    const controller = new AbortController();

    async function loadPlatformState() {
      try {
        const [metadata, health, jobs] = await Promise.all([
          readJson<PlatformMetadata>(apiBaseUrl, controller.signal),
          readJson<{ status: string }>(
            `${apiBaseUrl}/health/live`,
            controller.signal,
          ),
          readJson<JobListingListResponse>(
            `${apiBaseUrl}/jobs`,
            controller.signal,
          ),
        ]);

        setState({
          kind: "ready",
          metadata,
          jobs: jobs.items.slice(0, 3),
          healthStatus: health.status,
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setState({
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "The platform API could not be reached from the web shell.",
        });
      }
    }

    void loadPlatformState();

    return () => controller.abort();
  }, [apiBaseUrl]);

  if (state.kind === "loading") {
    return (
      <article className={styles.statusCard}>
        <p className={styles.sectionEyebrow}>Live platform connection</p>
        <h2>Checking the configured API surface</h2>
        <p className={styles.statusMessage}>
          Loading platform metadata, health, and current jobs from the
          configured backend.
        </p>
      </article>
    );
  }

  if (state.kind === "error") {
    return (
      <article className={styles.statusCard}>
        <p className={styles.sectionEyebrow}>Live platform connection</p>
        <h2>The web shell is not connected yet</h2>
        <p className={styles.statusError}>{state.message}</p>
        <p className={styles.statusMessage}>
          Set <code>NEXT_PUBLIC_API_BASE_URL</code> to the Nest platform API
          base URL, for example <code>/platform-api/v1</code> on the shared host
          or the dedicated API hostname in AWS.
        </p>
      </article>
    );
  }

  return (
    <article className={styles.statusCard}>
      <div className={styles.statusHeader}>
        <div>
          <p className={styles.sectionEyebrow}>Live platform connection</p>
          <h2>The web shell is reading the new backend contract</h2>
        </div>
        <span className={styles.healthBadge}>Health: {state.healthStatus}</span>
      </div>

      <div className={styles.statusFacts}>
        <div className={styles.statusFact}>
          <span>API version</span>
          <strong>{state.metadata.apiVersion}</strong>
        </div>
        <div className={styles.statusFact}>
          <span>Advertised routes</span>
          <strong>{state.metadata.routes.length}</strong>
        </div>
        <div className={styles.statusFact}>
          <span>Upstream services</span>
          <strong>{state.metadata.upstreamServices.length}</strong>
        </div>
      </div>

      <div className={styles.statusColumns}>
        <section className={styles.statusPanel}>
          <h3>Current backend posture</h3>
          <ul className={styles.bulletList}>
            <li>Auth mode: {state.metadata.auth.mode}</li>
            <li>Upstreams: {state.metadata.upstreamServices.join(", ")}</li>
            <li>
              Product surfaces: {state.metadata.productSurfaces.join(", ")}
            </li>
          </ul>
        </section>

        <section className={styles.statusPanel}>
          <h3>Sample live jobs</h3>
          {state.jobs.length === 0 ? (
            <p className={styles.statusMessage}>
              The API responded successfully, but there are no open jobs in the
              current environment yet.
            </p>
          ) : (
            <ul className={styles.jobList}>
              {state.jobs.map((job) => (
                <li className={styles.jobRow} key={job.id}>
                  <strong>{job.title}</strong>
                  <span>
                    {job.clinicName} · {job.location.city} ·{" "}
                    {job.compensation.amount} {job.compensation.currency}/
                    {job.compensation.unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </article>
  );
}
