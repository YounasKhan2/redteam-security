export interface Feature {
  id: number;
  category: string;
  name: string;
  description: string;
  checks: string[];
  icon: string;
  sort_order: number;
}

export interface WorkflowStep {
  id: number;
  step_number: number;
  title: string;
  description: string;
  details: string[];
}

export interface TestModule {
  id: number;
  name: string;
  category: string;
  description: string;
  phase: string;
  status: string;
}

export interface RoadmapPhase {
  id: number;
  phase: string;
  title: string;
  status: string;
  timeline: string;
  items: string[];
}

export interface DeploymentOption {
  id: number;
  name: string;
  tagline: string;
  infrastructure: string;
  data_policy: string;
  inference: string;
  ideal_for: string[];
  features: string[];
  sort_order: number;
}

export interface Persona {
  id: number;
  title: string;
  focus: string;
  description: string;
  goals: string[];
  icon: string;
  sort_order: number;
}

export interface Scan {
  id: number;
  name: string;
  target_url: string;
  spec_type: string;
  environment: string;
  status: string;
  progress: number;
  modules: string[];
  started_at: string;
  completed_at: string | null;
  requests_sent: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  gate_status: string | null;
}

export interface Finding {
  id: number;
  scan_id: number;
  scan_name?: string;
  template_id?: number | null;
  title: string;
  category: string;
  cwe: string;
  owasp: string;
  cvss: number;
  severity: string;
  status: string;
  endpoint: string;
  method: string;
  curl: string;
  expected_response: string;
  actual_response: string;
  business_impact: string;
  remediation: string;
  evidence: string;
  discovered_at: string;
}

export interface ScanEvent {
  id: number;
  scan_id: number;
  phase_key: string | null;
  level: string;
  message: string;
  ts: string;
}

export interface Stats {
  total_scans: number;
  running_scans: number;
  completed_scans: number;
  total_findings: number;
  open_findings: number;
  dismissed_findings: number;
  by_severity: Record<string, number>;
  by_category: { category: string; count: number }[];
  gate_pass_rate: number;
  false_positive_rate: number;
  avg_cvss: number;
  recent_findings: Finding[];
}

export interface ContentBundle {
  features: Feature[];
  workflow: WorkflowStep[];
  modules: TestModule[];
  roadmap: RoadmapPhase[];
  deployments: DeploymentOption[];
  personas: Persona[];
}
