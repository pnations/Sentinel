import "./App.css";
import { DetectionsPanel } from "./components/DetectionsPanel";
import { EventStreamPanel } from "./components/EventStreamPanel";
import { IncidentsPanel } from "./components/IncidentsPanel";
import { ScenarioPanel } from "./components/ScenarioPanel";
import { StatusGrid } from "./components/StatusGrid";
import { useSentinelStream } from "./hooks/useSentinelStream";

function App() {
  const { events, detections, incidents, analyses, connected, health, recordAnalysis } = useSentinelStream();
  const openIncidentCount = incidents.filter((incident) => incident.status !== "resolved").length;

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
      <IncidentsPanel incidents={incidents} analyses={analyses} onAnalysisRecorded={recordAnalysis} />
    </main>
  );
}

export default App;
