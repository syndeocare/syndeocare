import styles from "./page.module.css";

const audienceCards = [
  {
    title: "Admins",
    description:
      "Operate verification, marketplace policy, support workflows, and service health from a dedicated web surface.",
    highlights: [
      "Manual verification and audit controls",
      "Role-aware governance and escalations",
      "Release-safe operational visibility",
    ],
  },
  {
    title: "Clinics and hospitals",
    description:
      "Post urgent shifts, review verified applicants, and keep staffing operations moving without waiting on manual coordination.",
    highlights: [
      "Shift and role publishing",
      "Directory search with trust signals",
      "Booking-ready workforce discovery",
    ],
  },
  {
    title: "Professionals",
    description:
      "The mobile-first experience remains the main surface for clinicians, while the web platform supports discovery, trust, and marketplace growth.",
    highlights: [
      "Verification-backed profiles",
      "Availability and specialty matching",
      "Future messaging and booking lifecycle",
    ],
  },
];

const capabilityCards = [
  {
    eyebrow: "Live now",
    title: "Scheduling foundation",
    description:
      "The gateway now serves real jobs and bookings from the scheduling service instead of placeholder fixtures.",
  },
  {
    eyebrow: "Live now",
    title: "Public directories",
    description:
      "Professional and clinic directory endpoints are live in the new backend slice and ready for frontend integration.",
  },
  {
    eyebrow: "Platform backbone",
    title: "NATS event architecture",
    description:
      "Identity and domain workflows publish validated events so notifications, messaging, and automation can evolve safely.",
  },
];

const deliverySteps = [
  "Separate frontend hosting from backend release cadence",
  "Build the web app with environment-specific API configuration",
  "Publish the frontend artifact for S3 + CloudFront deployment",
  "Promote backend and frontend independently through AWS workflows",
];

const deploymentFacts = [
  {
    label: "Frontend hosting target",
    value: "AWS S3 + CloudFront",
  },
  {
    label: "Public API base URL",
    value:
      process.env.NEXT_PUBLIC_API_BASE_URL ??
      "Set NEXT_PUBLIC_API_BASE_URL during deployment",
  },
  {
    label: "Documentation URL",
    value:
      process.env.NEXT_PUBLIC_DOCS_URL ??
      "Set NEXT_PUBLIC_DOCS_URL during deployment",
  },
  {
    label: "Android app URL",
    value:
      process.env.NEXT_PUBLIC_ANDROID_APP_URL ??
      "Set NEXT_PUBLIC_ANDROID_APP_URL when the store or direct APK URL is ready",
  },
];

export default function Home() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.eyebrow}>SyndeoCare platform web</p>
          <h1 className={styles.heroTitle}>
            The frontend is now part of the new platform repo, not just the
            backend.
          </h1>
          <p className={styles.heroBody}>
            This web shell gives the new AWS-first platform a real entry point
            for admin and clinic experiences while the backend services,
            contracts, and event-driven workflows continue to expand behind a
            stable gateway.
          </p>

          <div className={styles.heroActions}>
            <a className={styles.primaryAction} href="#deployment">
              View deployment readiness
            </a>
            <a className={styles.secondaryAction} href="#audiences">
              See product surfaces
            </a>
          </div>
        </div>
      </section>

      <section className={styles.section} id="audiences">
        <div className={styles.sectionHeader}>
          <p className={styles.sectionEyebrow}>Product surfaces</p>
          <h2>Mapped to the marketplace you are building</h2>
          <p>
            The new frontend shell reflects the actual business split already
            documented for SyndeoCare instead of a generic starter template.
          </p>
        </div>

        <div className={styles.cardGrid}>
          {audienceCards.map((card) => (
            <article className={styles.featureCard} key={card.title}>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
              <ul className={styles.bulletList}>
                {card.highlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionEyebrow}>Current platform progress</p>
          <h2>What is already real in the new stack</h2>
          <p>
            The frontend is now aligned with the backend slices that are already
            implemented and pushed to the new repository.
          </p>
        </div>

        <div className={styles.capabilityGrid}>
          {capabilityCards.map((card) => (
            <article className={styles.capabilityCard} key={card.title}>
              <span className={styles.capabilityEyebrow}>{card.eyebrow}</span>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.splitLayout}>
          <article className={styles.processCard}>
            <p className={styles.sectionEyebrow}>Delivery path</p>
            <h2>How the new web frontend is deployed safely</h2>
            <ol className={styles.numberedList}>
              {deliverySteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </article>

          <article className={styles.processCard} id="deployment">
            <p className={styles.sectionEyebrow}>Environment wiring</p>
            <h2>Deployment-ready configuration</h2>
            <dl className={styles.factList}>
              {deploymentFacts.map((fact) => (
                <div className={styles.factRow} key={fact.label}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          </article>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.callout}>
          <p className={styles.sectionEyebrow}>What comes after this</p>
          <h2>Next implementation slice</h2>
          <p>
            Messaging, notifications, and AWS deployment remain the next major
            platform work. After that, the existing live app can be connected to
            this new gateway progressively instead of being left on the old
            stack.
          </p>
        </div>
      </section>
    </main>
  );
}
