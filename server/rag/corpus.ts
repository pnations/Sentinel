import type { RagChunk } from "./types.js";

// Curated, short public-source references. Keeps the demo deployable without a database.

export const ragCorpus: RagChunk[] = [
  {
    id: "cisa-kev-catalog",
    source: "cisa",
    organization: "CISA",
    title: "Known Exploited Vulnerabilities Catalog",
    url: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
    publishedAt: "2024-01-01",
    text: "CISA's Known Exploited Vulnerabilities Catalog is an authoritative list of vulnerabilities exploited in the wild. Organizations should use it as an input to vulnerability prioritization and remediation planning, with special attention to catalog due dates and affected products.",
    keywords: ["cve", "kev", "exploited", "vulnerability", "remediation", "prioritization"]
  },
  {
    id: "cisa-ics-advisories",
    source: "cisa",
    organization: "CISA",
    title: "ICS Advisories",
    url: "https://www.cisa.gov/news-events/cybersecurity-advisories",
    publishedAt: "2024-01-01",
    text: "CISA ICS advisories describe vulnerabilities and mitigations affecting industrial control system products. Analysts should verify affected products and versions, consult vendor mitigations, and coordinate remediation with asset owners before making changes to operational technology.",
    keywords: ["ics", "industrial control system", "ot", "vendor", "mitigation", "product", "version"]
  },
  {
    id: "epa-water-sector-cybersecurity",
    source: "epa",
    organization: "U.S. Environmental Protection Agency",
    title: "Water Sector Cybersecurity",
    url: "https://www.epa.gov/waterresilience/water-sector-cybersecurity",
    publishedAt: "2024-01-01",
    text: "EPA water-sector cybersecurity resources emphasize risk assessment, incident response planning, access control, asset inventory, and coordination between information technology, operational technology, and water operations personnel.",
    keywords: ["water", "utility", "water sector", "asset inventory", "incident response", "access control", "ot"]
  },
  {
    id: "nist-sp-800-82",
    source: "nist",
    organization: "NIST",
    title: "SP 800-82 Guide to Operational Technology Security",
    url: "https://csrc.nist.gov/publications/detail/sp/800-82/rev-3/final",
    publishedAt: "2023-09-01",
    text: "NIST SP 800-82 recommends that OT security account for performance, reliability, and safety requirements. Security monitoring and response should preserve operational constraints, use defense in depth, and coordinate with engineering and operations stakeholders.",
    keywords: ["nist", "sp 800-82", "ot", "operational technology", "safety", "reliability", "defense in depth"]
  },
  {
    id: "nist-csf-2",
    source: "nist",
    organization: "NIST",
    title: "Cybersecurity Framework 2.0",
    url: "https://www.nist.gov/cyberframework",
    publishedAt: "2024-02-26",
    text: "The NIST Cybersecurity Framework 2.0 organizes cybersecurity outcomes under Govern, Identify, Protect, Detect, Respond, and Recover. It can structure investigation findings, response coordination, and recovery planning without replacing organization-specific risk decisions.",
    keywords: ["nist", "csf", "govern", "identify", "protect", "detect", "respond", "recover"]
  },
  {
    id: "mitre-ics-remote-services",
    source: "mitre",
    organization: "MITRE ATT&CK",
    title: "Remote Services (T0886)",
    url: "https://attack.mitre.org/techniques/T0886/",
    publishedAt: "2025-04-15",
    text: "MITRE ATT&CK for ICS technique T0886 covers adversary use of remote services to access or control an ICS environment. Investigations should correlate remote access activity with account, source host, destination asset, timing, and authorization evidence.",
    keywords: ["mitre", "attack", "ics", "t0886", "remote services", "remote access", "account"]
  },
  {
    id: "mitre-ics-valid-accounts",
    source: "mitre",
    organization: "MITRE ATT&CK",
    title: "Valid Accounts (T0859)",
    url: "https://attack.mitre.org/techniques/T0859/",
    publishedAt: "2025-04-15",
    text: "MITRE ATT&CK for ICS technique T0859 covers adversary use of valid accounts. Useful investigation evidence includes unusual account use, privilege changes, access location, time of access, and activity that differs from the account's expected role.",
    keywords: ["mitre", "attack", "ics", "t0859", "valid accounts", "credential", "privilege", "authentication"]
  }
];