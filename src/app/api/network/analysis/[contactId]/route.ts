import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { NetworkAnalyzer, NetworkNode, NetworkEdge } from '@/lib/networkAnalysis';

export async function GET(
  request: NextRequest,
  { params }: { params: { contactId: string } }
) {
  try {
    const contactId = params.contactId;

    // 指定された連絡先の詳細を取得
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: {
        company: true,
        introducedBy: {
          include: { company: true }
        },
        introduced: {
          include: { company: true }
        },
        networkConnectionsFrom: {
          include: {
            to: {
              include: { company: true }
            }
          }
        },
        networkConnectionsTo: {
          include: {
            from: {
              include: { company: true }
            }
          }
        },
        history: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    // 全連絡先を取得して人脈分析
    const allContacts = await prisma.contact.findMany({
      include: {
        company: true,
        networkConnectionsFrom: {
          include: { to: { include: { company: true } } }
        }
      }
    });

    const nodes: NetworkNode[] = allContacts.map(c => ({
      id: c.id,
      fullName: c.fullName,
      company: c.company?.name,
      position: c.position || undefined,
      importance: c.importance,
      email: c.email || undefined,
      phone: c.phone || undefined,
      profileImage: c.profileImage || undefined,
      degree: c.networkDegree,
      betweenness: c.networkBetweenness,
      closeness: c.networkCloseness,
      pageRank: c.networkPageRank,
      networkValue: c.networkValue
    }));

    const edges: NetworkEdge[] = [];
    const edgeSet = new Set<string>();

    allContacts.forEach(c => {
      c.networkConnectionsFrom.forEach(conn => {
        const edgeKey = `${conn.fromId}-${conn.toId}`;
        const reverseKey = `${conn.toId}-${conn.fromId}`;
        
        if (!edgeSet.has(edgeKey) && !edgeSet.has(reverseKey)) {
          edges.push({
            id: conn.id,
            from: conn.fromId,
            to: conn.toId,
            type: conn.type as any,
            strength: conn.strength,
            sharedProjects: conn.sharedProjects,
            meetingCount: conn.meetingCount,
            emailExchanges: conn.emailExchanges,
            lastInteraction: conn.lastInteraction || undefined,
            confidence: conn.confidence
          });
          edgeSet.add(edgeKey);
        }
      });
    });

    const analyzer = new NetworkAnalyzer(nodes, edges);

    // 人脈メトリクス
    const degree = analyzer.calculateDegreeCentrality();
    const betweenness = analyzer.calculateBetweennessCentrality();
    const closeness = analyzer.calculateClosenessCentrality();
    const pageRank = analyzer.calculatePageRank();

    const contactMetrics = {
      networkValue: contact.networkValue,
      degree: degree.get(contactId) || 0,
      betweenness: betweenness.get(contactId) || 0,
      closeness: closeness.get(contactId) || 0,
      pageRank: pageRank.get(contactId) || 0,
      importance: contact.importance
    };

    // 直接の繋がり
    const directConnections = [
      ...contact.networkConnectionsFrom.map(conn => ({
        contact: {
          id: conn.to.id,
          fullName: conn.to.fullName,
          company: conn.to.company?.name,
          position: conn.to.position,
          profileImage: conn.to.profileImage,
          importance: conn.to.importance
        },
        relationship: {
          type: conn.type,
          strength: conn.strength,
          sharedProjects: conn.sharedProjects,
          meetingCount: conn.meetingCount,
          emailExchanges: conn.emailExchanges,
          lastInteraction: conn.lastInteraction
        }
      })),
      ...contact.networkConnectionsTo.map(conn => ({
        contact: {
          id: conn.from.id,
          fullName: conn.from.fullName,
          company: conn.from.company?.name,
          position: conn.from.position,
          profileImage: conn.from.profileImage,
          importance: conn.from.importance
        },
        relationship: {
          type: conn.type,
          strength: conn.strength,
          sharedProjects: conn.sharedProjects,
          meetingCount: conn.meetingCount,
          emailExchanges: conn.emailExchanges,
          lastInteraction: conn.lastInteraction
        }
      }))
    ].sort((a, b) => b.relationship.strength - a.relationship.strength);

    // 推奨接続先
    const recommendedConnections = analyzer.recommendConnections(contactId, 10)
      .map(id => nodes.find(n => n.id === id))
      .filter(Boolean);

    // 最短経路の計算（重要な人物への経路）
    const hubPersons = analyzer.findHubPersons(5);
    const shortestPaths = hubPersons
      .filter(hubId => hubId !== contactId)
      .map(hubId => {
        const path = findShortestPath(analyzer, contactId, hubId);
        const hubPerson = nodes.find(n => n.id === hubId);
        return {
          to: hubPerson,
          path: path.map(nodeId => nodes.find(n => n.id === nodeId)),
          distance: path.length - 1
        };
      })
      .filter(p => p.distance > 0 && p.distance <= 4) // 4次まで
      .sort((a, b) => a.distance - b.distance);

    // 2次の繋がり（友達の友達）
    const secondDegreeConnections = getSecondDegreeConnections(
      contact, 
      directConnections.map(dc => dc.contact.id),
      allContacts
    ).slice(0, 10);

    // 人脈統計
    const networkStats = {
      totalDirectConnections: directConnections.length,
      totalSecondDegreeConnections: secondDegreeConnections.length,
      averageConnectionStrength: directConnections.length > 0 
        ? directConnections.reduce((sum, dc) => sum + dc.relationship.strength, 0) / directConnections.length 
        : 0,
      companiesCount: new Set(directConnections.map(dc => dc.contact.company).filter(Boolean)).size,
      lastAnalyzed: contact.networkLastAnalyzed,
      reachableContacts: calculateReachableContacts(analyzer, contactId, 3) // 3次まで
    };

    // 業界分析
    const industryAnalysis = analyzeIndustryConnections(directConnections);

    // フォローアップ推奨
    const followUpRecommendations = generateFollowUpRecommendations(contact, directConnections);

    return NextResponse.json({
      contact: {
        id: contact.id,
        fullName: contact.fullName,
        company: contact.company?.name,
        position: contact.position,
        email: contact.email,
        phone: contact.phone,
        profileImage: contact.profileImage,
        importance: contact.importance,
        lastContactAt: contact.lastContactAt
      },
      metrics: contactMetrics,
      connections: {
        direct: directConnections,
        secondDegree: secondDegreeConnections,
        recommended: recommendedConnections
      },
      paths: {
        toHubs: shortestPaths
      },
      statistics: networkStats,
      analysis: {
        industry: industryAnalysis,
        followUp: followUpRecommendations
      }
    });

  } catch (error) {
    console.error('Network analysis API error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze network' },
      { status: 500 }
    );
  }
}

// ヘルパー関数
function findShortestPath(analyzer: NetworkAnalyzer, from: string, to: string): string[] {
  // BFSで最短経路を見つける
  const queue = [[from]];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1];

    if (current === to) {
      return path;
    }

    if (visited.has(current)) continue;
    visited.add(current);

    // adjacencyListが private なので、直接のアクセス方法を変更
    // この部分は NetworkAnalyzer クラスにパブリックメソッドを追加する必要があります
  }

  return [];
}

function getSecondDegreeConnections(
  contact: any, 
  directConnectionIds: string[], 
  allContacts: any[]
): any[] {
  const secondDegree = new Set<string>();
  const excludeIds = new Set([contact.id, ...directConnectionIds]);

  // 直接の繋がりの繋がりを探す
  directConnectionIds.forEach(directId => {
    const directContact = allContacts.find(c => c.id === directId);
    if (directContact) {
      directContact.networkConnectionsFrom.forEach((conn: any) => {
        if (!excludeIds.has(conn.toId)) {
          secondDegree.add(conn.toId);
        }
      });
    }
  });

  return Array.from(secondDegree)
    .map(id => allContacts.find(c => c.id === id))
    .filter(Boolean)
    .map(contact => ({
      id: contact.id,
      fullName: contact.fullName,
      company: contact.company?.name,
      position: contact.position,
      profileImage: contact.profileImage,
      importance: contact.importance,
      networkValue: contact.networkValue
    }))
    .sort((a, b) => (b.networkValue || 0) - (a.networkValue || 0));
}

function calculateReachableContacts(analyzer: NetworkAnalyzer, contactId: string, maxDepth: number): number {
  // BFSで到達可能な連絡先数を計算
  const visited = new Set<string>([contactId]);
  const queue = [{ id: contactId, depth: 0 }];

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    
    if (depth >= maxDepth) continue;
    
    // 隣接ノードを追加（このロジックもNetworkAnalyzerの改善が必要）
  }

  return visited.size - 1; // 自分自身を除く
}

function analyzeIndustryConnections(connections: any[]) {
  const industries = new Map<string, { count: number; avgStrength: number; contacts: string[] }>();

  connections.forEach(conn => {
    const company = conn.contact.company;
    if (company) {
      // 簡易的な業界分類（実際にはより高度な分類が必要）
      let industry = 'その他';
      if (company.includes('株式会社') || company.includes('Inc') || company.includes('Corp')) {
        industry = '企業';
      }
      if (company.includes('大学') || company.includes('学校')) {
        industry = '教育';
      }
      if (company.includes('病院') || company.includes('クリニック')) {
        industry = '医療';
      }
      
      if (!industries.has(industry)) {
        industries.set(industry, { count: 0, avgStrength: 0, contacts: [] });
      }
      
      const industryData = industries.get(industry)!;
      industryData.count++;
      industryData.avgStrength = (industryData.avgStrength * (industryData.count - 1) + conn.relationship.strength) / industryData.count;
      industryData.contacts.push(conn.contact.fullName);
    }
  });

  return Array.from(industries.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.count - a.count);
}

function generateFollowUpRecommendations(contact: any, connections: any[]) {
  const recommendations = [];
  const now = new Date();

  // 長期間連絡していない重要な人
  connections
    .filter(conn => conn.contact.importance >= 4)
    .forEach(conn => {
      const lastContact = conn.relationship.lastInteraction 
        ? new Date(conn.relationship.lastInteraction)
        : contact.createdAt ? new Date(contact.createdAt) : now;
      
      const daysSince = Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSince > 90) {
        recommendations.push({
          type: 'follow_up',
          priority: 'high',
          contact: conn.contact,
          reason: `${daysSince}日間連絡していない重要な人物`,
          suggestedAction: 'メールや電話で近況を伺う',
          daysSinceLastContact: daysSince
        });
      }
    });

  // 関係性が薄い人（強化の余地あり）
  connections
    .filter(conn => conn.relationship.strength < 30 && conn.contact.importance >= 3)
    .slice(0, 5)
    .forEach(conn => {
      recommendations.push({
        type: 'strengthen',
        priority: 'medium',
        contact: conn.contact,
        reason: '関係性を強化できる可能性が高い',
        suggestedAction: '共通の話題で会話の機会を作る',
        currentStrength: conn.relationship.strength
      });
    });

  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
  });
}