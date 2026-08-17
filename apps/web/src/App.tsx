import { useState } from "react";
import "./App.css";
import { DetectionsPanel } from "./components/DetectionsPanel";
import { EventStreamPanel } from "./components/EventStreamPanel";
import { IncidentDetailPanel } from "./components/IncidentDetailPanel";
import { IncidentsPanel } from "./components/IncidentsPanel";
import { ScenarioPanel } from "./components/ScenarioPanel";
import { StatusGrid } from "./components/StatusGrid";
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
      <header className="hero">
        <p className="tag">SentinelH20</p>
        <h1>AI-assisted OT security monitoring for North River Water Utility</h1>
        <p className="subtitle">
          Deterministic detection first. AI-assisted investigation second. Human-approved
          response always.
        </p>
      </header>

      <StatusGrid
        demoReady={true}
        sessionLabel="This browser session"
        localSimulation={true}
        eventCount={events.length}
        openIncidentCount={openIncidentCount}
      />

      <ScenarioPanel onRunScenario={runScenario} scenarioRunning={scenarioRunning} />
      <EventStreamPanel events={events} />
      <DetectionsPanel detections={detections} />
      <IncidentsPanel incidents={incidents} onOpenIncident={onOpenIncident} />

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
