import { useEffect, useRef, useState } from "react";
import { applyDetections } from "../lib/detectionEngine";
import type {
  PersistedAiAnalysis,
  PersistedDetection,
  PersistedEvent,
  PersistedIncident,
  PersistedResponseAction
} from "../lib/domain";
import { scenarioSteps, type ScenarioEventInput } from "../lib/scenarios";
import type { AnalysisResult } from "../services/ai";

const EVENT_LIMIT = 30;
const DETECTION_LIMIT = 20;
const INCIDENT_LIMIT = 20;

function createEvent(scenarioId: string, input: ScenarioEventInput): PersistedEvent {
  return {
    ...input,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    sourceIp: null,
    destinationIp: null,
    simulated: true,
    scenarioId
  };
}

function approvalState(actions: PersistedResponseAction[]): PersistedIncident["approvalState"] {
  if (actions.some((action) => action.approvalState === "pending")) return "pending";
  if (actions.some((action) => action.approvalState === "approved")) return "approved";
  return actions.length > 0 ? "rejected" : "none";
}

export function useSentinelDemo() {
  const [events, setEvents] = useState<PersistedEvent[]>([]);
  const [detections, setDetections] = useState<PersistedDetection[]>([]);
  const [incidents, setIncidents] = useState<PersistedIncident[]>([]);
  const [analyses, setAnalyses] = useState<Record<string, PersistedAiAnalysis>>({});
  const [responseActions, setResponseActions] = useState<Record<string, PersistedResponseAction[]>>({});
  const [scenarioRunning, setScenarioRunning] = useState(false);
  const incidentsRef = useRef<PersistedIncident[]>([]);
  const responseActionsRef = useRef<Record<string, PersistedResponseAction[]>>({});
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(
    () => () => {
      for (const timer of timersRef.current) clearTimeout(timer);
    },
    []
  );

  const emitEvent = (scenarioId: string, input: ScenarioEventInput) => {
    const event = createEvent(scenarioId, input);
    const result = applyDetections(event, incidentsRef.current);
    incidentsRef.current = result.incidents.slice(0, INCIDENT_LIMIT);
    setEvents((previous) => [event, ...previous].slice(0, EVENT_LIMIT));
    setDetections((previous) => [...result.detections, ...previous].slice(0, DETECTION_LIMIT));
    setIncidents(incidentsRef.current);
  };

  const runScenario = (scenarioId: string) => {
    if (scenarioRunning) return false;

    const steps = scenarioSteps.get(scenarioId);
    if (!steps || steps.length === 0) return false;

    setScenarioRunning(true);
    const timers = steps.map((step) => setTimeout(() => emitEvent(scenarioId, step.event), step.delayMs));
    const completionDelay = Math.max(...steps.map((step) => step.delayMs)) + 100;
    timers.push(
      setTimeout(() => {
        setScenarioRunning(false);
        timersRef.current = [];
      }, completionDelay)
    );
    timersRef.current = timers;
    return true;
  };

  const recordAnalysis = (incidentId: string, result: AnalysisResult) => {
    const createdAt = new Date().toISOString();
    const analysis: PersistedAiAnalysis = {
      ...result,
      id: crypto.randomUUID(),
      incidentId,
      createdAt
    };
    const actions = analysis.recommendedActions.map<PersistedResponseAction>((reason) => ({
      id: crypto.randomUUID(),
      incidentId,
      actionType: "ai_recommended_action",
      reason,
      approvalState: "pending",
      approvedBy: null,
      approvedAt: null,
      executedAt: null,
      executionResult: {},
      createdAt
    }));

    setAnalyses((previous) => ({ ...previous, [incidentId]: analysis }));
    responseActionsRef.current = { ...responseActionsRef.current, [incidentId]: actions };
    setResponseActions(responseActionsRef.current);
    incidentsRef.current = incidentsRef.current.map((incident) =>
      incident.id === incidentId
        ? { ...incident, status: "investigating", approvalState: approvalState(actions), updatedAt: createdAt }
        : incident
    );
    setIncidents(incidentsRef.current);
  };

  const decideResponseAction = (actionId: string, decision: "approved" | "rejected", approvedBy: string) => {
    const decidedAt = new Date().toISOString();
    const incidentId = Object.entries(responseActionsRef.current).find(([, actions]) =>
      actions.some((action) => action.id === actionId)
    )?.[0];
    if (!incidentId) return;

    const actions = (responseActionsRef.current[incidentId] ?? []).map((action) =>
      action.id === actionId ? { ...action, approvalState: decision, approvedBy, approvedAt: decidedAt } : action
    );
    responseActionsRef.current = { ...responseActionsRef.current, [incidentId]: actions };
    setResponseActions(responseActionsRef.current);
    incidentsRef.current = incidentsRef.current.map((incident) =>
      incident.id === incidentId
        ? { ...incident, approvalState: approvalState(actions), updatedAt: decidedAt }
        : incident
    );
    setIncidents(incidentsRef.current);
  };

  return {
    events,
    detections,
    incidents,
    analyses,
    responseActions,
    scenarioRunning,
    runScenario,
    recordAnalysis,
    decideResponseAction
  };
}