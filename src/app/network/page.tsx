"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import dynamic from 'next/dynamic';
import PageLayout from "@/components/PageLayout";
import { useTheme } from "@/contexts/ThemeContext";

// 動的インポートでSSRエラーを回避
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-96 text-gray-500">グラフを読み込み中...</div>
});

type NetworkNode = {
  id: string;
  name: string;
  company: string;
  position: string;
  importance: number;
  profileImage?: string;
  email?: string;
  phone?: string;
  tags: string[];
  lastContactAt?: string;
  size: number;
  color: string;
  group: string;
};

type NetworkLink = {
  source: string;
  target: string;
  type: string;
  strength: number;
};

type NetworkData = {
  nodes: NetworkNode[];
  links: NetworkLink[];
  stats: {
    totalNodes: number;
    totalLinks: number;
    companiesCount: number;
    introductionLinks: number;
    colleagueLinks: number;
  };
};

export default function NetworkPage() {
  const [data, setData] = useState<NetworkData | null>(null);
  const [loading, setLoading] = useState(true);
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [nodeAnalysis, setNodeAnalysis] = useState<any>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>();

  useEffect(() => {
    loadNetworkData();
    
    // リサイズイベントのリスナー
    const handleResize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({
          width: clientWidth,
          height: Math.max(clientHeight, 500)
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  async function loadNetworkData() {
    try {
      console.log("Starting network data fetch...");
      const res = await fetch("/api/network/map?maxNodes=100");
      console.log("Network API response status:", res.status);
      
      if (!res.ok) throw new Error("Failed to load network data");
      const networkData = await res.json();
      console.log("Network data received:", networkData);
      
      // データを既存の形式に変換
      const convertedData = {
        nodes: networkData.nodes.map((node: any) => ({
          id: node.id,
          name: node.fullName,
          company: node.company || "未設定",
          position: node.position || "未設定",
          importance: node.importance,
          profileImage: node.profileImage,
          email: node.email,
          phone: node.phone,
          tags: [], // TODO: タグデータを追加
          lastContactAt: undefined, // TODO: 最終連絡日を追加
          size: Math.max(3, node.degree * 2 + node.importance),
          color: getNodeColor(node.importance),
          group: node.company || "その他"
        })),
        links: networkData.edges.map((edge: any) => ({
          source: edge.from,
          target: edge.to,
          type: edge.type,
          strength: Math.max(1, edge.strength / 20)
        })),
        stats: {
          totalNodes: networkData.statistics.totalNodes,
          totalLinks: networkData.statistics.totalEdges,
          companiesCount: new Set(networkData.nodes.map((n: any) => n.company).filter(Boolean)).size,
          introductionLinks: networkData.edges.filter((e: any) => e.type === 'introduction').length,
          colleagueLinks: networkData.edges.filter((e: any) => e.type === 'colleague').length,
        }
      };
      
      console.log("Converted data:", convertedData);
      setData(convertedData);
      console.log("Data set successfully");
    } catch (error) {
      console.error("Error loading network data:", error);
      console.log("Setting data to null due to error");
      setData(null);
    } finally {
      setLoading(false);
      console.log("Loading state set to false");
    }
  }

  function getNodeColor(importance: number): string {
    switch (importance) {
      case 5: return '#EF4444'; // red-500
      case 4: return '#F97316'; // orange-500
      case 3: return '#EAB308'; // yellow-500
      case 2: return '#22C55E'; // green-500
      default: return '#6B7280'; // gray-500
    }
  }


  const handleNodeClick = useCallback(async (node: any) => {
    setSelectedNode(node as NetworkNode);
    setNodeAnalysis(null);
    setAnalysisLoading(true);
    
    // ノードを中央に移動
    if (fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 1000);
      fgRef.current.zoom(3, 1000);
    }
    
    // 詳細分析を取得
    try {
      const res = await fetch(`/api/network/analysis/${node.id}`);
      if (res.ok) {
        const analysis = await res.json();
        setNodeAnalysis(analysis);
      }
    } catch (error) {
      console.error('Failed to load node analysis:', error);
    } finally {
      setAnalysisLoading(false);
    }
  }, []);

  const handleBackgroundClick = useCallback(() => {
    setSelectedNode(null);
    setNodeAnalysis(null);
    if (fgRef.current) {
      fgRef.current.zoomToFit(400);
    }
  }, []);

  if (loading) {
    return (
      <PageLayout title="🔗 人脈ネットワークマップ" subtitle="連絡先同士の関係性を可視化">
        <div className="flex items-center justify-center h-96">
          <div className="text-xl">🔗 ネットワークデータを読み込み中...</div>
        </div>
      </PageLayout>
    );
  }

  if (!data) {
    return (
      <PageLayout title="🔗 人脈ネットワークマップ" subtitle="連絡先同士の関係性を可視化">
        <div className="flex items-center justify-center h-96">
          <div className="text-xl">データの読み込みに失敗しました</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="🔗 人脈ネットワークマップ" subtitle="連絡先同士の関係性を可視化">
      {/* Stats */}
      <div className="py-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-4 text-center`}>
            <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {data.stats.totalNodes}
            </div>
            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>人数</div>
          </div>
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-4 text-center`}>
            <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {data.stats.companiesCount}
            </div>
            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>会社</div>
          </div>
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-4 text-center`}>
            <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {data.stats.introductionLinks}
            </div>
            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>紹介関係</div>
          </div>
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-4 text-center`}>
            <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {data.stats.colleagueLinks}
            </div>
            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>同僚関係</div>
          </div>
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-4 text-center`}>
            <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {data.stats.totalLinks}
            </div>
            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>総関係数</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Network Graph */}
          <div className="lg:col-span-3">
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg`}>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  ネットワークグラフ
                </h2>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  ノードをクリックで詳細表示、背景をクリックでズームリセット
                </p>
              </div>
              <div ref={containerRef} style={{ height: '600px' }}>
                <ForceGraph2D
                  ref={fgRef}
                  graphData={data}
                  nodeId="id"
                  nodeVal="size"
                  nodeColor="color"
                  nodeLabel={(node: any) => `${node.name} (${node.company})`}
                  linkColor={() => isDarkMode ? '#4B5563' : '#9CA3AF'}
                  linkWidth={(link: any) => link.strength}
                  linkDirectionalParticles={2}
                  linkDirectionalParticleSpeed={0.005}
                  onNodeClick={handleNodeClick}
                  onBackgroundClick={handleBackgroundClick}
                  backgroundColor={isDarkMode ? '#1F2937' : '#F9FAFB'}
                  width={dimensions.width}
                  height={dimensions.height}
                  nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
                    const label = node.name;
                    const fontSize = Math.min(12 / globalScale, 3);
                    ctx.font = `${fontSize}px Sans-Serif`;
                    ctx.fillStyle = node.color;
                    
                    // ノードを円として描画
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, node.size, 0, 2 * Math.PI);
                    ctx.fill();
                    
                    // ラベルを描画
                    const textWidth = ctx.measureText(label).width;
                    const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);
                    
                    ctx.fillStyle = isDarkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)';
                    ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);
                    
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = isDarkMode ? '#FFFFFF' : '#000000';
                    ctx.fillText(label, node.x, node.y);
                  }}
                />
              </div>
            </div>
          </div>

          {/* Side Panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6`}>
              <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                選択中の連絡先
              </h3>
              
              {selectedNode ? (
                <div className="space-y-4">
                  {selectedNode.profileImage && (
                    <img 
                      src={selectedNode.profileImage} 
                      alt="プロフィール画像" 
                      className="w-20 h-20 rounded-full mx-auto object-cover"
                    />
                  )}
                  
                  <div>
                    <h4 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {selectedNode.name}
                    </h4>
                    <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {selectedNode.company}
                    </p>
                    {selectedNode.position && selectedNode.position !== '未設定' && (
                      <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        {selectedNode.position}
                      </p>
                    )}
                  </div>

                  <div>
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                      selectedNode.importance === 5 ? 'bg-red-100 text-red-800' :
                      selectedNode.importance === 4 ? 'bg-orange-100 text-orange-800' :
                      selectedNode.importance === 3 ? 'bg-yellow-100 text-yellow-800' :
                      selectedNode.importance === 2 ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      重要度: {selectedNode.importance}/5
                    </span>
                  </div>

                  {selectedNode.email && (
                    <div>
                      <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>メール</p>
                      <a 
                        href={`mailto:${selectedNode.email}`} 
                        className="text-blue-500 hover:text-blue-700 text-sm break-all"
                      >
                        {selectedNode.email}
                      </a>
                    </div>
                  )}

                  {selectedNode.phone && (
                    <div>
                      <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>電話</p>
                      <a 
                        href={`tel:${selectedNode.phone}`} 
                        className="text-blue-500 hover:text-blue-700 text-sm"
                      >
                        {selectedNode.phone}
                      </a>
                    </div>
                  )}
                  
                  {/* 詳細な連絡先情報へのリンク */}
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                    <Link 
                      href={`/contacts/${selectedNode.id}`}
                      className="text-blue-500 hover:text-blue-700 text-sm font-medium"
                    >
                      📋 詳細情報を表示 →
                    </Link>
                  </div>
                </div>
              ) : (
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  ノードをクリックして連絡先の詳細を表示
                </p>
              )}
            </div>

            {/* 人脈分析パネル */}
            {selectedNode && (
              <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6`}>
                <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  🔍 人脈分析
                </h3>
                
                {analysisLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : nodeAnalysis ? (
                  <div className="space-y-4">
                    {/* 人脈メトリクス */}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className={`p-2 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <div className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>直接の繋がり</div>
                        <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {nodeAnalysis.statistics?.totalDirectConnections || 0}人
                        </div>
                      </div>
                      <div className={`p-2 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <div className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>人脈価値</div>
                        <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {nodeAnalysis.metrics?.networkValue || 0}pt
                        </div>
                      </div>
                      <div className={`p-2 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <div className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>影響力</div>
                        <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {Math.round((nodeAnalysis.metrics?.pageRank || 0) * 1000)}
                        </div>
                      </div>
                      <div className={`p-2 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <div className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>橋渡し度</div>
                        <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {Math.round((nodeAnalysis.metrics?.betweenness || 0) * 100)}%
                        </div>
                      </div>
                    </div>

                    {/* 推奨接続先 */}
                    {nodeAnalysis.connections?.recommended?.length > 0 && (
                      <div>
                        <h4 className={`font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          💡 おすすめ接続先
                        </h4>
                        <div className="space-y-2">
                          {nodeAnalysis.connections.recommended.slice(0, 3).map((contact: any, index: number) => (
                            <div key={index} className={`p-2 rounded text-sm ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                              <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {contact.fullName}
                              </div>
                              <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {contact.company} - 価値: {contact.networkValue}pt
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* フォローアップ推奨 */}
                    {nodeAnalysis.analysis?.followUp?.length > 0 && (
                      <div>
                        <h4 className={`font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          📅 フォローアップ推奨
                        </h4>
                        <div className="space-y-2">
                          {nodeAnalysis.analysis.followUp.slice(0, 2).map((rec: any, index: number) => (
                            <div key={index} className={`p-2 rounded text-sm ${
                              rec.priority === 'high' ? 'bg-red-50 border border-red-200' : 
                              rec.priority === 'medium' ? 'bg-yellow-50 border border-yellow-200' :
                              'bg-gray-50 border border-gray-200'
                            }`}>
                              <div className={`font-medium ${
                                rec.priority === 'high' ? 'text-red-800' :
                                rec.priority === 'medium' ? 'text-yellow-800' :
                                'text-gray-800'
                              }`}>
                                {rec.contact.fullName}
                              </div>
                              <div className={`text-xs ${
                                rec.priority === 'high' ? 'text-red-600' :
                                rec.priority === 'medium' ? 'text-yellow-600' :
                                'text-gray-600'
                              }`}>
                                {rec.reason}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    分析データの読み込みに失敗しました
                  </p>
                )}
              </div>
            )}

            {/* Legend */}
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6 mt-6`}>
              <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                凡例
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                  <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>最重要 (5)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                  <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>重要 (4)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                  <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>普通 (3)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                  <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>やや低い (2)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-500 rounded-full"></div>
                  <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>低い (1)</span>
                </div>
                <hr className={`border-t ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`} />
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-0.5 ${isDarkMode ? 'bg-gray-400' : 'bg-gray-600'}`}></div>
                  <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>紹介関係</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-px ${isDarkMode ? 'bg-gray-600' : 'bg-gray-400'}`}></div>
                  <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>同僚関係</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}