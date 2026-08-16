import { useState } from "react";
import "./App.css";
import { DetectionsPanel } from "./components/DetectionsPanel";
import { EventStreamPanel } from "./components/EventStreamPanel";
import { IncidentDetailPanel } from "./components/IncidentDetailPanel";
import { IncidentsPanel } from "./components/IncidentsPanel";
import { ScenarioPanel } from "./components/ScenarioPanel";
import { StatusGrid } from "./components/StatusGrid";
import { useReviewerName } from "./hooks/useReviewerName";
import { useSentinelStream } from "./hooks/useSentinelStream";
import { analyzeIncident, decideResponseAction, getResponseActions } from "./services/api";

function App() {
  const {
    events,
    detections,
    incidents,
    analyses,
    responseActions,
    connected,
    health,
    recordAnalysis,
    setIncidentResponseActions,
    recordResponseAction
  } = useSentinelStream();
  const { name: reviewerName, setName: setReviewerName } = useReviewerName();
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  const openIncidentCount = incidents.filter((incident) => incident.status !== "resolved").length;
  const selectedIncident = incidents.find((incident) => incident.id === selectedIncidentId) ?? null;

  const onOpenIncident = async (incidentId: string) => {
    setSelectedIncidentId(incidentId);

    try {
      setIncidentResponseActions(incidentId, await getResponseActions(incidentId));
    } catch {
      // Drawer still opens; response actions fall back to whatever is already in memory.
    }
  };

  const onInvestigate = async (incidentId: string) => {
    recordAnalysis(await analyzeIncident(incidentId));
  };

  const onDecision = async (actionId: string, decision: "approved" | "rejected") => {
    recordResponseAction(await decideResponseAction(actionId, decision, reviewerName));
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
        healthStatus={health.status}
        healthTimestamp={health.timestamp}
        connected={connected}
        eventCount={events.length}
        openIncidentCount={openIncidentCount}
      />

      <ScenarioPanel />
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
