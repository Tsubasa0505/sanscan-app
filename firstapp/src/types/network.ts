export interface NetworkNode {
  id: string;
  fullName: string;
  email?: string;
  company?: string;
  companyName?: string;
  position?: string;
  networkValue: number;
  degree: number;
  betweenness: number;
  closeness: number;
  pageRank: number;
  group?: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface NetworkEdge {
  source: string | NetworkNode;
  target: string | NetworkNode;
  strength: number;
  type: 'introduced' | 'colleague' | 'other';
  value?: number;
}

export interface NetworkGraphData {
  nodes: NetworkNode[];
  links: NetworkEdge[];
}

export interface NetworkMetrics {
  totalNodes: number;
  totalEdges: number;
  avgDegree: number;
  density: number;
  components: number;
}

export interface NodePosition {
  x: number;
  y: number;
}

export interface ForceGraphInstance {
  zoom: (scale: number) => void;
  centerAt: (x?: number, y?: number, duration?: number) => void;
  d3Force: (name: string) => any;
}