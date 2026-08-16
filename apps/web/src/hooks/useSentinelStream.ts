import { useCallback, useEffect, useState } from "react";
import {
  getHealth,
  openStream,
  type PersistedAiAnalysis,
  type PersistedDetection,
  type PersistedIncident,
  type PersistedResponseAction,
  type StreamEnvelope
} from "../services/api";

type HealthState = {
  status: string;
  timestamp: string;
};

export function useSentinelStream() {
  const [events, setEvents] = useState<StreamEnvelope[]>([]);
  const [detections, setDetections] = useState<PersistedDetection[]>([]);
  const [incidents, setIncidents] = useState<PersistedIncident[]>([]);
  const [analyses, setAnalyses] = useState<Record<string, PersistedAiAnalysis>>({});
  const [responseActions, setResponseActions] = useState<Record<string, PersistedResponseAction[]>>({});
  const [connected, setConnected] = useState(false);
  const [health, setHealth] = useState<HealthState>({ status: "checking", timestamp: "" });

  const recordAnalysis = useCallback((analysis: PersistedAiAnalysis) => {
    setAnalyses((previous) => ({ ...previous, [analysis.incidentId]: analysis }));
  }, []);

  const setIncidentResponseActions = useCallback((incidentId: string, actions: PersistedResponseAction[]) => {
    setResponseActions((previous) => ({ ...previous, [incidentId]: actions }));
  }, []);

  const recordResponseAction = useCallback((action: PersistedResponseAction) => {
    setResponseActions((previous) => {
      const existing = previous[action.incidentId] ?? [];
      const others = existing.filter((item) => item.id !== action.id);
      return { ...previous, [action.incidentId]: [...others, action] };
    });
  }, []);

  useEffect(() => {
    getHealth()
      .then((result) => setHealth({ status: result.status, timestamp: result.timestamp }))
      .catch(() => setHealth({ status: "offline", timestamp: "" }));

    const source = openStream({
      onEvent: (message) => {
        setEvents((previous) => [message, ...previous].slice(0, 30));
      },
      onFinding: (finding) => {
        setDetections((previous) => [finding.payload, ...previous].slice(0, 20));
      },
      onIncident: (incident) => {
        setIncidents((previous) => {
          const others = previous.filter((item) => item.id !== incident.payload.id);
          return [incident.payload, ...others].slice(0, 20);
        });
      },
      onAnalysis: (analysis) => recordAnalysis(analysis.payload),
      onResponseAction: (action) => recordResponseAction(action.payload),
      onStatus: setConnected
    });

    return () => {
      source.close();
    };
  }, [recordAnalysis, recordResponseAction]);

  return {
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
  };
}
