import { useState } from "react";
import "./App.css";
import { DetectionsPanel } from "./components/DetectionsPanel";
import { EventStreamPanel } from "./components/EventStreamPanel";
import { IncidentDetailPanel } from "./components/IncidentDetailPanel";
import { IncidentsPanel } from "./components/IncidentsPanel";
import { ScenarioPanel } from "./components/ScenarioPanel";
import { useReviewerName } from "./hooks/useReviewerName";
import { useSentinelDemo } from "./hooks/useSentinelDemo";
import { analyzeIncident } from "./services/ai";

function App() {
  const {
    events,
    detections,
    incidents,
    analyses,
    responseActions,
    scenarioRunning,
    runScenario,
    recordAnalysis,
    decideResponseAction
  } = useSentinelDemo();
  const { name: reviewerName, setName: setReviewerName } = useReviewerName();
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  const openIncidentCount = incidents.filter((incident) => incident.status !== "resolved").length;
  const selectedIncident = incidents.find((incident) => incident.id === selectedIncidentId) ?? null;

  const onOpenIncident = (incidentId: string) => {
    setSelectedIncidentId(incidentId);
  };

  const onInvestigate = async (incidentId: string) => {
    const incident = incidents.find((item) => item.id === incidentId);
    if (!incident) {
      throw new Error("Incident is no longer available.");
    }

    const incidentDetections = detections.filter((item) => item.incidentId === incidentId);
    const eventIds = new Set(incidentDetections.flatMap((item) => item.eventIds));
    const incidentEvents = events.filter((item) => eventIds.has(item.id));
    recordAnalysis(incidentId, await analyzeIncident({ incident, detections: incidentDetections, events: incidentEvents }));
  };

  const onDecision = async (actionId: string, decision: "approved" | "rejected") => {
    decideResponseAction(actionId, decision, reviewerName);
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <p className="brand">SentinelH20</p>
        <p className="simulation-mode"><span aria-hidden="true">●</span> Simulation mode</p>
      </header>

      <section className="workspace-intro" aria-labelledby="workspace-title">
        <p className="eyebrow">North River Water Utility</p>
        <h1 id="workspace-title">Security operations</h1>
        <p className="subtitle">Deterministic monitoring with human-approved response.</p>
      </section>

      <ScenarioPanel onRunScenario={runScenario} scenarioRunning={scenarioRunning} />

      <section className="summary-strip" aria-label="System summary">
        <div className="summary-item ready"><span>System</span><strong>Ready</strong></div>
        <div className="summary-item"><span>Open incidents</span><strong>{openIncidentCount}</strong></div>
        <div className="summary-item"><span>Events this session</span><strong>{events.length}</strong></div>
      </section>

      <IncidentsPanel incidents={incidents} onOpenIncident={onOpenIncident} />

      <details className="supporting-telemetry">
        <summary>Telemetry and findings <span>{detections.length} findings · {events.length} events</span></summary>
        <div className="supporting-panels"><DetectionsPanel detections={detections} /><EventStreamPanel events={events} /></div>
      </details>

      {selectedIncident ? (
        <IncidentDetailPanel
          incident={selectedIncident}
          analysis={analyses[selectedIncident.id]}
          responseActions={responseActions[selectedIncident.id] ?? []}
          reviewerName={reviewerName}
          onSetReviewerName={setReviewerName}
          onClose={() => setSelectedIncidentId(null)}
          onInvestigate={onInvestigate}
          onDecision={onDecision}
        />
      ) : null}
    </main>
  );
}

export default App;
