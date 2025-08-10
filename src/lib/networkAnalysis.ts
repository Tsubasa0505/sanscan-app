// 人脈分析ライブラリ

export interface NetworkNode {
  id: string;
  fullName: string;
  company?: string;
  position?: string;
  importance: number;
  email?: string;
  phone?: string;
  profileImage?: string;
  
  // 分析結果
  degree: number; // 直接の繋がり数
  betweenness: number; // 媒介中心性
  closeness: number; // 近接中心性
  pageRank: number; // 影響力スコア
  networkValue: number; // 人脈価値
}

export interface NetworkEdge {
  id: string;
  from: string;
  to: string;
  type: 'introduction' | 'colleague' | 'business' | 'social' | 'family';
  strength: number; // 0-100
  sharedProjects: number;
  meetingCount: number;
  emailExchanges: number;
  lastInteraction?: Date;
  confidence: number; // 0.0-1.0
}

export interface NetworkCommunity {
  id: string;
  name: string;
  members: string[]; // contact IDs
  size: number;
  density: number; // 0.0-1.0
  centralNodes: string[]; // 中心人物のID
}

export interface NetworkAnalysisResult {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  communities: NetworkCommunity[];
  statistics: {
    totalNodes: number;
    totalEdges: number;
    avgDegree: number;
    density: number;
    clustering: number;
    diameter: number;
  };
}

export class NetworkAnalyzer {
  private nodes: Map<string, NetworkNode> = new Map();
  private edges: Map<string, NetworkEdge> = new Map();
  private adjacencyList: Map<string, string[]> = new Map();

  constructor(nodes: NetworkNode[], edges: NetworkEdge[]) {
    // ノードとエッジを初期化
    nodes.forEach(node => {
      this.nodes.set(node.id, node);
      this.adjacencyList.set(node.id, []);
    });

    edges.forEach(edge => {
      this.edges.set(edge.id, edge);
      // 双方向の接続を追加
      this.adjacencyList.get(edge.from)?.push(edge.to);
      this.adjacencyList.get(edge.to)?.push(edge.from);
    });
  }

  /**
   * 関係性の強さを計算
   */
  static calculateRelationshipStrength(
    contact1: any,
    contact2: any,
    sharedData?: {
      sharedProjects?: number;
      meetingCount?: number;
      emailExchanges?: number;
    }
  ): number {
    let strength = 0;

    // 1. 紹介関係 (40点)
    if (contact1.introducedById === contact2.id || 
        contact2.introducedById === contact1.id) {
      strength += 40;
    }

    // 2. 同じ会社 (30点)
    if (contact1.companyId && contact1.companyId === contact2.companyId) {
      strength += 30;
    }

    // 3. 共通プロジェクト (最大20点)
    if (sharedData?.sharedProjects) {
      strength += Math.min(20, sharedData.sharedProjects * 5);
    }

    // 4. 会議回数 (最大10点)
    if (sharedData?.meetingCount) {
      strength += Math.min(10, sharedData.meetingCount * 2);
    }

    // 5. メール交換 (最大10点)
    if (sharedData?.emailExchanges) {
      strength += Math.min(10, sharedData.emailExchanges);
    }

    // 6. タグの重複 (最大10点)
    const tags1 = JSON.parse(contact1.legacyTags || '[]');
    const tags2 = JSON.parse(contact2.legacyTags || '[]');
    const sharedTags = tags1.filter((tag: string) => tags2.includes(tag));
    strength += Math.min(10, sharedTags.length * 2);

    return Math.min(100, strength);
  }

  /**
   * 次数中心性を計算（直接の繋がり数）
   */
  calculateDegreeCentrality(): Map<string, number> {
    const degreeCentrality = new Map<string, number>();
    
    for (const [nodeId, neighbors] of this.adjacencyList) {
      degreeCentrality.set(nodeId, neighbors.length);
    }
    
    return degreeCentrality;
  }

  /**
   * 媒介中心性を計算（どれだけ他のノードを繋ぐ橋渡し役か）
   */
  calculateBetweennessCentrality(): Map<string, number> {
    const betweenness = new Map<string, number>();
    const nodeIds = Array.from(this.nodes.keys());

    // 全てのノードのペアについて最短経路を計算
    for (const nodeId of nodeIds) {
      betweenness.set(nodeId, 0);
    }

    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        const source = nodeIds[i];
        const target = nodeIds[j];
        
        // BFSで最短経路を見つける
        const paths = this.findAllShortestPaths(source, target);
        
        paths.forEach(path => {
          // 中間ノードの媒介中心性をインクリメント
          for (let k = 1; k < path.length - 1; k++) {
            const currentValue = betweenness.get(path[k]) || 0;
            betweenness.set(path[k], currentValue + 1 / paths.length);
          }
        });
      }
    }

    // 正規化
    const n = nodeIds.length;
    const normalizer = (n - 1) * (n - 2) / 2;
    
    for (const [nodeId, value] of betweenness) {
      betweenness.set(nodeId, value / normalizer);
    }

    return betweenness;
  }

  /**
   * 近接中心性を計算（他のノードに近いかどうか）
   */
  calculateClosenessCentrality(): Map<string, number> {
    const closeness = new Map<string, number>();
    
    for (const nodeId of this.nodes.keys()) {
      const distances = this.dijkstra(nodeId);
      let totalDistance = 0;
      let reachableNodes = 0;
      
      for (const [, distance] of distances) {
        if (distance !== Infinity) {
          totalDistance += distance;
          reachableNodes++;
        }
      }
      
      if (reachableNodes > 1) {
        closeness.set(nodeId, (reachableNodes - 1) / totalDistance);
      } else {
        closeness.set(nodeId, 0);
      }
    }
    
    return closeness;
  }

  /**
   * PageRankアルゴリズム（影響力を計算）
   */
  calculatePageRank(dampingFactor: number = 0.85, maxIterations: number = 100): Map<string, number> {
    const pageRank = new Map<string, number>();
    const newPageRank = new Map<string, number>();
    const nodeIds = Array.from(this.nodes.keys());
    const n = nodeIds.length;

    // 初期化
    nodeIds.forEach(nodeId => {
      pageRank.set(nodeId, 1.0 / n);
    });

    for (let iter = 0; iter < maxIterations; iter++) {
      // 新しいPageRank値を計算
      nodeIds.forEach(nodeId => {
        let sum = 0;
        const neighbors = this.adjacencyList.get(nodeId) || [];
        
        neighbors.forEach(neighborId => {
          const neighborDegree = this.adjacencyList.get(neighborId)?.length || 1;
          sum += (pageRank.get(neighborId) || 0) / neighborDegree;
        });
        
        newPageRank.set(nodeId, (1 - dampingFactor) / n + dampingFactor * sum);
      });

      // 収束チェック
      let converged = true;
      for (const nodeId of nodeIds) {
        const diff = Math.abs((newPageRank.get(nodeId) || 0) - (pageRank.get(nodeId) || 0));
        if (diff > 0.001) {
          converged = false;
          break;
        }
      }

      // 値を更新
      pageRank.clear();
      newPageRank.forEach((value, key) => pageRank.set(key, value));
      newPageRank.clear();

      if (converged) break;
    }

    return pageRank;
  }

  /**
   * コミュニティ検出（Louvainアルゴリズムの簡易版）
   */
  detectCommunities(): NetworkCommunity[] {
    const communities: NetworkCommunity[] = [];
    const visited = new Set<string>();
    let communityId = 0;

    for (const nodeId of this.nodes.keys()) {
      if (visited.has(nodeId)) continue;

      const community = this.expandCommunity(nodeId, visited);
      if (community.length > 1) {
        const node = this.nodes.get(nodeId)!;
        communities.push({
          id: `community-${communityId++}`,
          name: node.company || `グループ ${communityId}`,
          members: community,
          size: community.length,
          density: this.calculateCommunityDensity(community),
          centralNodes: this.findCentralNodesInCommunity(community)
        });
      }
    }

    return communities;
  }

  /**
   * 人脈価値スコアを計算
   */
  calculateNetworkValue(
    nodeId: string, 
    degree: number, 
    betweenness: number, 
    pageRank: number
  ): number {
    const node = this.nodes.get(nodeId);
    if (!node) return 0;

    // 基本スコア
    let value = 0;
    
    // 1. 直接の繋がり数 × 重要度の平均 × 10
    const neighbors = this.adjacencyList.get(nodeId) || [];
    const avgImportance = neighbors.reduce((sum, neighborId) => {
      const neighbor = this.nodes.get(neighborId);
      return sum + (neighbor?.importance || 1);
    }, 0) / (neighbors.length || 1);
    
    value += degree * avgImportance * 10;

    // 2. 媒介中心性 × 100 (橋渡し役の価値)
    value += betweenness * 100;

    // 3. PageRankスコア × 200 (影響力)
    value += pageRank * 200;

    // 4. 本人の重要度 × 20
    value += node.importance * 20;

    return Math.round(value);
  }

  /**
   * ハブ人物を特定
   */
  findHubPersons(limit: number = 5): string[] {
    const pageRank = this.calculatePageRank();
    const betweenness = this.calculateBetweennessCentrality();

    return Array.from(this.nodes.keys())
      .filter(nodeId => {
        const pr = pageRank.get(nodeId) || 0;
        const bc = betweenness.get(nodeId) || 0;
        return pr > 0.02 && bc > 0.1; // 閾値は調整可能
      })
      .sort((a, b) => {
        const scoreA = (pageRank.get(a) || 0) * (betweenness.get(a) || 0);
        const scoreB = (pageRank.get(b) || 0) * (betweenness.get(b) || 0);
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  /**
   * 推奨接続先を計算
   */
  recommendConnections(nodeId: string, limit: number = 5): string[] {
    const recommendations: { id: string; score: number }[] = [];
    const directNeighbors = new Set(this.adjacencyList.get(nodeId) || []);
    directNeighbors.add(nodeId); // 自分自身も除外

    for (const candidateId of this.nodes.keys()) {
      if (directNeighbors.has(candidateId)) continue;

      let score = 0;
      const candidate = this.nodes.get(candidateId)!;
      const node = this.nodes.get(nodeId)!;

      // 1. 共通の知人数
      const candidateNeighbors = new Set(this.adjacencyList.get(candidateId) || []);
      const nodeNeighbors = new Set(this.adjacencyList.get(nodeId) || []);
      const commonNeighbors = [...nodeNeighbors].filter(n => candidateNeighbors.has(n));
      score += commonNeighbors.length * 10;

      // 2. 同じ会社
      if (node.company && node.company === candidate.company) {
        score += 20;
      }

      // 3. 重要度
      score += candidate.importance * 5;

      // 4. ネットワーク価値
      score += (candidate.networkValue || 0) / 10;

      if (score > 0) {
        recommendations.push({ id: candidateId, score });
      }
    }

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(r => r.id);
  }

  /**
   * 完全な分析を実行
   */
  analyze(): NetworkAnalysisResult {
    const degree = this.calculateDegreeCentrality();
    const betweenness = this.calculateBetweennessCentrality();
    const closeness = this.calculateClosenessCentrality();
    const pageRank = this.calculatePageRank();

    // ノードの分析結果を更新
    const analyzedNodes = Array.from(this.nodes.values()).map(node => ({
      ...node,
      degree: degree.get(node.id) || 0,
      betweenness: betweenness.get(node.id) || 0,
      closeness: closeness.get(node.id) || 0,
      pageRank: pageRank.get(node.id) || 0,
      networkValue: this.calculateNetworkValue(
        node.id, 
        degree.get(node.id) || 0, 
        betweenness.get(node.id) || 0,
        pageRank.get(node.id) || 0
      )
    }));

    // 統計情報を計算
    const totalNodes = this.nodes.size;
    const totalEdges = this.edges.size;
    const avgDegree = Array.from(degree.values()).reduce((a, b) => a + b, 0) / totalNodes;
    const maxPossibleEdges = totalNodes * (totalNodes - 1) / 2;
    const density = maxPossibleEdges > 0 ? totalEdges / maxPossibleEdges : 0;

    return {
      nodes: analyzedNodes,
      edges: Array.from(this.edges.values()),
      communities: this.detectCommunities(),
      statistics: {
        totalNodes,
        totalEdges,
        avgDegree,
        density,
        clustering: this.calculateClusteringCoefficient(),
        diameter: this.calculateDiameter()
      }
    };
  }

  // ヘルパーメソッド
  private findAllShortestPaths(source: string, target: string): string[][] {
    const queue = [[source]];
    const visited = new Set<string>();
    const paths: string[][] = [];
    let shortestLength = Infinity;

    while (queue.length > 0) {
      const path = queue.shift()!;
      const current = path[path.length - 1];

      if (path.length > shortestLength) continue;

      if (current === target) {
        if (path.length < shortestLength) {
          shortestLength = path.length;
          paths.length = 0;
        }
        if (path.length === shortestLength) {
          paths.push([...path]);
        }
        continue;
      }

      if (visited.has(current)) continue;
      visited.add(current);

      const neighbors = this.adjacencyList.get(current) || [];
      for (const neighbor of neighbors) {
        if (!path.includes(neighbor)) {
          queue.push([...path, neighbor]);
        }
      }
    }

    return paths;
  }

  private dijkstra(source: string): Map<string, number> {
    const distances = new Map<string, number>();
    const visited = new Set<string>();
    const queue = [source];

    // 初期化
    for (const nodeId of this.nodes.keys()) {
      distances.set(nodeId, nodeId === source ? 0 : Infinity);
    }

    while (queue.length > 0) {
      // 最短距離のノードを選択
      let current = queue.reduce((min, node) => 
        (distances.get(node) || Infinity) < (distances.get(min) || Infinity) ? node : min
      );
      
      queue.splice(queue.indexOf(current), 1);
      
      if (visited.has(current)) continue;
      visited.add(current);

      const neighbors = this.adjacencyList.get(current) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          const newDistance = (distances.get(current) || 0) + 1;
          if (newDistance < (distances.get(neighbor) || Infinity)) {
            distances.set(neighbor, newDistance);
            queue.push(neighbor);
          }
        }
      }
    }

    return distances;
  }

  private expandCommunity(startNode: string, visited: Set<string>): string[] {
    const community = [startNode];
    const queue = [startNode];
    visited.add(startNode);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = this.adjacencyList.get(current) || [];

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          // 同じ会社または強い関係性があるかチェック
          const currentNode = this.nodes.get(current);
          const neighborNode = this.nodes.get(neighbor);
          
          if (currentNode?.company === neighborNode?.company || 
              this.hasStrongConnection(current, neighbor)) {
            visited.add(neighbor);
            community.push(neighbor);
            queue.push(neighbor);
          }
        }
      }
    }

    return community;
  }

  private hasStrongConnection(nodeId1: string, nodeId2: string): boolean {
    const edge = Array.from(this.edges.values()).find(e => 
      (e.from === nodeId1 && e.to === nodeId2) || 
      (e.from === nodeId2 && e.to === nodeId1)
    );
    return edge ? edge.strength > 50 : false;
  }

  private calculateCommunityDensity(members: string[]): number {
    let edgeCount = 0;
    const maxEdges = members.length * (members.length - 1) / 2;

    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        if (this.adjacencyList.get(members[i])?.includes(members[j])) {
          edgeCount++;
        }
      }
    }

    return maxEdges > 0 ? edgeCount / maxEdges : 0;
  }

  private findCentralNodesInCommunity(members: string[]): string[] {
    const memberSet = new Set(members);
    const degrees = new Map<string, number>();

    // コミュニティ内での次数を計算
    for (const member of members) {
      const neighbors = this.adjacencyList.get(member) || [];
      const internalDegree = neighbors.filter(n => memberSet.has(n)).length;
      degrees.set(member, internalDegree);
    }

    // 上位2名を中心ノードとする
    return members
      .sort((a, b) => (degrees.get(b) || 0) - (degrees.get(a) || 0))
      .slice(0, 2);
  }

  private calculateClusteringCoefficient(): number {
    let totalClustering = 0;
    let nodeCount = 0;

    for (const [nodeId, neighbors] of this.adjacencyList) {
      if (neighbors.length < 2) continue;

      let triangles = 0;
      const possibleTriangles = neighbors.length * (neighbors.length - 1) / 2;

      for (let i = 0; i < neighbors.length; i++) {
        for (let j = i + 1; j < neighbors.length; j++) {
          if (this.adjacencyList.get(neighbors[i])?.includes(neighbors[j])) {
            triangles++;
          }
        }
      }

      totalClustering += possibleTriangles > 0 ? triangles / possibleTriangles : 0;
      nodeCount++;
    }

    return nodeCount > 0 ? totalClustering / nodeCount : 0;
  }

  private calculateDiameter(): number {
    let maxDistance = 0;

    for (const nodeId of this.nodes.keys()) {
      const distances = this.dijkstra(nodeId);
      for (const distance of distances.values()) {
        if (distance !== Infinity && distance > maxDistance) {
          maxDistance = distance;
        }
      }
    }

    return maxDistance;
  }
}