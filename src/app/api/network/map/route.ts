import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { NetworkAnalyzer, NetworkNode, NetworkEdge } from '@/lib/networkAnalysis';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const focusContactId = searchParams.get('focus'); // 特定の人を中心とした分析
    const maxNodes = parseInt(searchParams.get('maxNodes') || '100');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    // 連絡先とその関係を取得
    const contacts = await prisma.contact.findMany({
      include: {
        company: true,
        networkConnectionsFrom: {
          include: {
            to: {
              include: {
                company: true
              }
            }
          },
          where: includeInactive ? {} : { isActive: true }
        },
        networkConnectionsTo: {
          include: {
            from: {
              include: {
                company: true
              }
            }
          },
          where: includeInactive ? {} : { isActive: true }
        }
      },
      take: maxNodes
    });

    // NetworkNodeに変換
    const nodes: NetworkNode[] = contacts.map(contact => ({
      id: contact.id,
      fullName: contact.fullName,
      company: contact.company?.name,
      position: contact.position || undefined,
      importance: contact.importance,
      email: contact.email || undefined,
      phone: contact.phone || undefined,
      profileImage: contact.profileImage || undefined,
      degree: contact.networkDegree,
      betweenness: contact.networkBetweenness,
      closeness: contact.networkCloseness,
      pageRank: contact.networkPageRank,
      networkValue: contact.networkValue
    }));

    // NetworkEdgeに変換
    const edges: NetworkEdge[] = [];
    const edgeSet = new Set<string>(); // 重複を防ぐ

    contacts.forEach(contact => {
      // From connections
      contact.networkConnectionsFrom.forEach(conn => {
        const edgeKey = `${conn.fromId}-${conn.toId}`;
        const reverseKey = `${conn.toId}-${conn.fromId}`;
        
        if (!edgeSet.has(edgeKey) && !edgeSet.has(reverseKey)) {
          edges.push({
            id: conn.id,
            from: conn.fromId,
            to: conn.toId,
            type: conn.type,
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

    // 関係性データがない場合は自動生成
    if (edges.length === 0) {
      await generateAutomaticConnections(contacts);
      
      // 再度関係性を取得
      const updatedContacts = await prisma.contact.findMany({
        include: {
          networkConnectionsFrom: { include: { to: { include: { company: true } } } },
          networkConnectionsTo: { include: { from: { include: { company: true } } } }
        },
        take: maxNodes
      });

      updatedContacts.forEach(contact => {
        contact.networkConnectionsFrom.forEach(conn => {
          const edgeKey = `${conn.fromId}-${conn.toId}`;
          const reverseKey = `${conn.toId}-${conn.fromId}`;
          
          if (!edgeSet.has(edgeKey) && !edgeSet.has(reverseKey)) {
            edges.push({
              id: conn.id,
              from: conn.fromId,
              to: conn.toId,
              type: conn.type,
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
    }

    // NetworkAnalyzerで分析実行
    const analyzer = new NetworkAnalyzer(nodes, edges);
    const analysisResult = analyzer.analyze();

    // 分析結果をデータベースに保存
    await updateNetworkAnalysisResults(analysisResult.nodes);

    // フォーカス連絡先がある場合、その周辺を重点的に返す
    if (focusContactId) {
      const focusedResult = filterAroundFocusContact(analysisResult, focusContactId, 2); // 2次の繋がりまで
      return NextResponse.json(focusedResult);
    }

    return NextResponse.json(analysisResult);

  } catch (error) {
    console.error('Network map API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate network map' },
      { status: 500 }
    );
  }
}

// 自動的に関係性を生成する関数
async function generateAutomaticConnections(contacts: Array<{ id: string; fullName: string; companyId?: string | null; createdAt: Date; company?: { name: string; industry?: string | null } | null }>) {
  const connections = [];

  // 現在存在するコンタクトIDのセットを作成
  const existingContactIds = new Set(contacts.map(c => c.id));

  for (let i = 0; i < contacts.length; i++) {
    for (let j = i + 1; j < contacts.length; j++) {
      const contact1 = contacts[i];
      const contact2 = contacts[j];

      // 両方のコンタクトが存在することを確認
      if (!existingContactIds.has(contact1.id) || !existingContactIds.has(contact2.id)) {
        continue;
      }

      const strength = NetworkAnalyzer.calculateRelationshipStrength(contact1, contact2);
      
      if (strength > 20) { // 閾値以上の関係のみ作成
        let type = 'business';
        let confidence = 0.6;

        // 関係性のタイプを決定
        if (contact1.introducedById === contact2.id || contact2.introducedById === contact1.id) {
          type = 'introduction';
          confidence = 0.9;
        } else if (contact1.companyId && contact1.companyId === contact2.companyId) {
          type = 'colleague';
          confidence = 0.8;
        }

        connections.push({
          fromId: contact1.id,
          toId: contact2.id,
          type,
          strength,
          confidence,
          sharedProjects: Math.floor(Math.random() * 3), // ダミーデータ
          meetingCount: Math.floor(Math.random() * 10),
          emailExchanges: Math.floor(Math.random() * 20)
        });
      }
    }
  }

  // バッチでデータベースに挿入（エラーハンドリングを追加）
  if (connections.length > 0) {
    try {
      await prisma.networkConnection.createMany({
        data: connections
      });
    } catch (error) {
      console.error('Error creating network connections:', error);
      // 個別に作成を試行（重複チェック付き）
      for (const connection of connections) {
        try {
          // 既存の接続をチェック
          const existing = await prisma.networkConnection.findFirst({
            where: {
              OR: [
                { fromId: connection.fromId, toId: connection.toId },
                { fromId: connection.toId, toId: connection.fromId }
              ]
            }
          });

          if (!existing) {
            await prisma.networkConnection.create({
              data: connection
            });
          }
        } catch (individualError) {
          console.error('Failed to create individual connection:', individualError);
          // 個別のエラーは無視して続行
        }
      }
    }
  }
}

// 分析結果をデータベースに保存
async function updateNetworkAnalysisResults(nodes: NetworkNode[]) {
  const updatePromises = nodes.map(node => 
    prisma.contact.update({
      where: { id: node.id },
      data: {
        networkDegree: node.degree,
        networkBetweenness: node.betweenness,
        networkCloseness: node.closeness,
        networkPageRank: node.pageRank,
        networkValue: node.networkValue,
        networkLastAnalyzed: new Date()
      }
    })
  );

  await Promise.all(updatePromises);
}

// フォーカス連絡先周辺の結果をフィルタリング
function filterAroundFocusContact(result: { nodes: Array<{ id: string }>; edges: Array<{ id: string; from: string; to: string }> }, focusId: string, depth: number = 2) {
  const relevantNodes = new Set<string>([focusId]);
  const relevantEdges = new Set<string>();

  // BFSで指定した深度まで関連ノードを収集
  const queue = [{ id: focusId, currentDepth: 0 }];
  const visited = new Set<string>([focusId]);

  while (queue.length > 0) {
    const { id: currentId, currentDepth } = queue.shift()!;
    
    if (currentDepth >= depth) continue;

    // 関連するエッジを見つける
    result.edges.forEach((edge: NetworkEdge) => {
      if (edge.from === currentId || edge.to === currentId) {
        relevantEdges.add(edge.id);
        
        const neighborId = edge.from === currentId ? edge.to : edge.from;
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          relevantNodes.add(neighborId);
          queue.push({ id: neighborId, currentDepth: currentDepth + 1 });
        }
      }
    });
  }

  return {
    ...result,
    nodes: result.nodes.filter((node: NetworkNode) => relevantNodes.has(node.id)),
    edges: result.edges.filter((edge: NetworkEdge) => relevantEdges.has(edge.id)),
    focus: focusId
  };
}