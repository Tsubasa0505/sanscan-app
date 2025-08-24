import { Contact } from '@/shared/types';

export interface SearchContext {
  searchTerm: string;
  filters?: {
    company?: string;
    importance?: number;
    hasBusinessCard?: boolean;
    tags?: string[];
  };
  limit?: number;
}

export interface SearchResult {
  items: Contact[];
  totalCount: number;
  relevanceScores?: Map<string, number>;
}

export interface SearchStrategy {
  search(context: SearchContext): Promise<SearchResult>;
  canHandle(context: SearchContext): boolean;
}

// 完全一致検索戦略
export class ExactMatchStrategy implements SearchStrategy {
  constructor(private repository: any) {}

  async search(context: SearchContext): Promise<SearchResult> {
    const results = await this.repository.findMany({
      where: {
        OR: [
          { fullName: context.searchTerm },
          { email: context.searchTerm },
          { phone: context.searchTerm }
        ],
        ...this.buildFilters(context.filters)
      },
      take: context.limit || 10
    });

    return {
      items: results,
      totalCount: results.length,
      relevanceScores: this.calculateScores(results, context.searchTerm)
    };
  }

  canHandle(context: SearchContext): boolean {
    // メールアドレスや電話番号の完全一致検索に適している
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[\d\-\+\(\)\s]+$/;
    
    return emailRegex.test(context.searchTerm) || 
           phoneRegex.test(context.searchTerm);
  }

  private buildFilters(filters?: any): any {
    if (!filters) return {};
    
    const where: any = {};
    
    if (filters.company) {
      where.company = { name: { contains: filters.company } };
    }
    
    if (filters.importance !== undefined) {
      where.importance = filters.importance;
    }
    
    if (filters.hasBusinessCard !== undefined) {
      where.businessCardImage = filters.hasBusinessCard ? { not: null } : null;
    }
    
    if (filters.tags && filters.tags.length > 0) {
      where.contactTags = {
        some: { tagId: { in: filters.tags } }
      };
    }
    
    return where;
  }

  private calculateScores(results: Contact[], searchTerm: string): Map<string, number> {
    const scores = new Map<string, number>();
    
    results.forEach(contact => {
      let score = 0;
      
      if (contact.fullName === searchTerm) score += 10;
      if (contact.email === searchTerm) score += 10;
      if (contact.phone === searchTerm) score += 10;
      
      scores.set(contact.id, score);
    });
    
    return scores;
  }
}

// 部分一致検索戦略
export class PartialMatchStrategy implements SearchStrategy {
  constructor(private repository: any) {}

  async search(context: SearchContext): Promise<SearchResult> {
    const searchLower = context.searchTerm.toLowerCase();
    
    const results = await this.repository.findMany({
      where: {
        OR: [
          { fullName: { contains: searchLower } },
          { email: { contains: searchLower } },
          { phone: { contains: context.searchTerm } },
          { position: { contains: searchLower } },
          { notes: { contains: searchLower } },
          { company: { name: { contains: searchLower } } }
        ],
        ...this.buildFilters(context.filters)
      },
      take: context.limit || 20
    });

    return {
      items: results,
      totalCount: results.length,
      relevanceScores: this.calculateScores(results, searchLower)
    };
  }

  canHandle(context: SearchContext): boolean {
    // 一般的な文字列検索に適している
    return context.searchTerm.length >= 2;
  }

  private buildFilters(filters?: any): any {
    // ExactMatchStrategyと同じ実装
    if (!filters) return {};
    
    const where: any = {};
    
    if (filters.company) {
      where.company = { name: { contains: filters.company } };
    }
    
    if (filters.importance !== undefined) {
      where.importance = filters.importance;
    }
    
    if (filters.hasBusinessCard !== undefined) {
      where.businessCardImage = filters.hasBusinessCard ? { not: null } : null;
    }
    
    if (filters.tags && filters.tags.length > 0) {
      where.contactTags = {
        some: { tagId: { in: filters.tags } }
      };
    }
    
    return where;
  }

  private calculateScores(results: Contact[], searchTerm: string): Map<string, number> {
    const scores = new Map<string, number>();
    
    results.forEach(contact => {
      let score = 0;
      
      // 名前の一致度
      if (contact.fullName?.toLowerCase().includes(searchTerm)) {
        const position = contact.fullName.toLowerCase().indexOf(searchTerm);
        score += position === 0 ? 8 : 5; // 先頭一致は高スコア
      }
      
      // メールの一致度
      if (contact.email?.toLowerCase().includes(searchTerm)) {
        score += 4;
      }
      
      // 会社名の一致度
      if ((contact as any).company?.name?.toLowerCase().includes(searchTerm)) {
        score += 3;
      }
      
      // 役職の一致度
      if (contact.position?.toLowerCase().includes(searchTerm)) {
        score += 2;
      }
      
      // メモの一致度
      if (contact.notes?.toLowerCase().includes(searchTerm)) {
        score += 1;
      }
      
      scores.set(contact.id, score);
    });
    
    return scores;
  }
}

// ファジー検索戦略（あいまい検索）
export class FuzzySearchStrategy implements SearchStrategy {
  constructor(private repository: any) {}

  async search(context: SearchContext): Promise<SearchResult> {
    // Levenshtein距離を使用したあいまい検索
    const allContacts = await this.repository.findMany({
      where: this.buildFilters(context.filters),
      take: 1000 // 多めに取得してからフィルタリング
    });

    const scoredResults = allContacts
      .map(contact => ({
        contact,
        score: this.calculateFuzzyScore(contact, context.searchTerm)
      }))
      .filter(item => item.score > 0.3) // 閾値以上のスコアのみ
      .sort((a, b) => b.score - a.score)
      .slice(0, context.limit || 10);

    const scores = new Map<string, number>();
    scoredResults.forEach(item => {
      scores.set(item.contact.id, item.score);
    });

    return {
      items: scoredResults.map(item => item.contact),
      totalCount: scoredResults.length,
      relevanceScores: scores
    };
  }

  canHandle(context: SearchContext): boolean {
    // タイプミスを含む可能性がある検索に適している
    return context.searchTerm.length >= 3;
  }

  private buildFilters(filters?: any): any {
    if (!filters) return {};
    
    const where: any = {};
    
    if (filters.company) {
      where.company = { name: { contains: filters.company } };
    }
    
    if (filters.importance !== undefined) {
      where.importance = filters.importance;
    }
    
    if (filters.hasBusinessCard !== undefined) {
      where.businessCardImage = filters.hasBusinessCard ? { not: null } : null;
    }
    
    if (filters.tags && filters.tags.length > 0) {
      where.contactTags = {
        some: { tagId: { in: filters.tags } }
      };
    }
    
    return where;
  }

  private calculateFuzzyScore(contact: Contact, searchTerm: string): number {
    const fields = [
      { value: contact.fullName, weight: 5 },
      { value: contact.email, weight: 3 },
      { value: (contact as any).company?.name, weight: 2 },
      { value: contact.position, weight: 1 }
    ];

    let maxScore = 0;

    fields.forEach(field => {
      if (field.value) {
        const similarity = this.calculateSimilarity(
          field.value.toLowerCase(),
          searchTerm.toLowerCase()
        );
        maxScore = Math.max(maxScore, similarity * field.weight);
      }
    });

    return maxScore;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    return 1 - (distance / maxLength);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}

// 検索戦略マネージャー
export class SearchStrategyManager {
  private strategies: SearchStrategy[] = [];

  addStrategy(strategy: SearchStrategy): void {
    this.strategies.push(strategy);
  }

  async search(context: SearchContext): Promise<SearchResult> {
    // 適切な戦略を選択
    for (const strategy of this.strategies) {
      if (strategy.canHandle(context)) {
        console.log(`Using ${strategy.constructor.name} for search`);
        return await strategy.search(context);
      }
    }

    // デフォルト戦略（最後に追加された戦略を使用）
    if (this.strategies.length > 0) {
      const defaultStrategy = this.strategies[this.strategies.length - 1];
      console.log(`Using default strategy: ${defaultStrategy.constructor.name}`);
      return await defaultStrategy.search(context);
    }

    throw new Error('No search strategy available');
  }

  // 複数の戦略を組み合わせて検索
  async searchWithAllStrategies(context: SearchContext): Promise<SearchResult> {
    const allResults: SearchResult[] = [];

    for (const strategy of this.strategies) {
      if (strategy.canHandle(context)) {
        const result = await strategy.search(context);
        allResults.push(result);
      }
    }

    // 結果をマージして重複を除去
    return this.mergeResults(allResults);
  }

  private mergeResults(results: SearchResult[]): SearchResult {
    const itemMap = new Map<string, Contact>();
    const scoreMap = new Map<string, number>();

    results.forEach(result => {
      result.items.forEach(item => {
        if (!itemMap.has(item.id)) {
          itemMap.set(item.id, item);
        }

        // スコアの合計
        const currentScore = scoreMap.get(item.id) || 0;
        const newScore = result.relevanceScores?.get(item.id) || 0;
        scoreMap.set(item.id, currentScore + newScore);
      });
    });

    // スコアでソート
    const sortedItems = Array.from(itemMap.values())
      .sort((a, b) => (scoreMap.get(b.id) || 0) - (scoreMap.get(a.id) || 0));

    return {
      items: sortedItems,
      totalCount: sortedItems.length,
      relevanceScores: scoreMap
    };
  }
}