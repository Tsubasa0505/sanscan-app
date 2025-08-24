export interface DashboardStats {
  totalContacts: number;
  totalCompanies: number;
  contactsWithEmail: number;
  contactsWithPhone: number;
  emailPercentage: number;
  phonePercentage: number;
  contactsWithBusinessCard: number;
  contactsWithProfileImage: number;
  ocrContacts: number;
  businessCardPercentage: number;
  profileImagePercentage: number;
  ocrPercentage: number;
}

export interface CompanyCount {
  name: string;
  count: number;
}

export interface ContactData {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  position?: string | null;
  companyId?: string | null;
  company?: {
    id: string;
    name: string;
  } | null;
  profileImage?: string | null;
  businessCardImage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: any;
}

export interface DashboardData {
  stats: DashboardStats;
  recentContacts: ContactData[];
  companiesData: ChartDataPoint[];
  networkData: {
    nodes: NetworkNode[];
    edges: NetworkEdge[];
  };
}

export interface NetworkNode {
  id: string;
  fullName: string;
  company?: string;
  networkValue: number;
  degree: number;
}

export interface NetworkEdge {
  source: string;
  target: string;
}