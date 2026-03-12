export interface IndicatorData {
  id?: number;
  month: string;
  department: string;
  // Indicators with their numerators and denominators
  bed_occupancy: number;
  bed_occupancy_num: number; // Patient Days
  bed_occupancy_den: number; // Available Bed Days
  
  avg_stay: number;
  avg_stay_num: number; // Total Inpatient Days
  avg_stay_den: number; // Total Discharges
  
  mortality_rate: number;
  mortality_rate_num: number; // Total Deaths
  mortality_rate_den: number; // Total Discharges
  
  satisfaction: number;
  satisfaction_num: number; // Sum of Survey Scores
  satisfaction_den: number; // Number of Surveys
  
  surgeries: number;
  surgeries_num: number; // Successful/Completed Surgeries
  surgeries_den: number; // Total Scheduled Surgeries
  
  er_wait_time: number;
  er_wait_time_num: number; // Total Wait Time (mins)
  er_wait_time_den: number; // Total ER Patients
  
  readmission_rate: number;
  readmission_rate_num: number; // Number of Readmissions
  readmission_rate_den: number; // Total Discharges
  
  patient_name?: string; // Optional patient name for specific case alerts
  created_at?: string;
}

export interface Task {
  id?: number;
  task_number: string; // رقم المهمة
  title: string;
  description: string;
  issuing_entity?: string; // جهة إصدار التوجيه
  responsible_person: string; // المسؤول عن التنفيذ
  executing_entity: string; // الجهة المنفذة
  task_date: string;
  department: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  due_date: string;
  actual_completion_date?: string; // تاريخ الإنجاز الفعلي
  notes?: string;
  created_at?: string;
}

export interface Department {
  id?: number;
  name: string;
  supervisor: string;
  phone: string;
  administration_id?: number;
  code?: string;
  is_active?: number;
}

export interface KpiIndicator {
  id?: number;
  department_id: number;
  code?: string;
  name: string;
  description?: string;
  type: string;
  target_value?: number;
  measurement_period?: string;
  calculation_method?: string;
  is_active?: number;
  created_at?: string;
}

export interface IndicatorCategory {
  id?: number;
  name: string;
  department_id: number;
  created_at?: string;
}

export interface Administration {
  id?: number;
  name: string;
  manager: string;
}

export interface Mail {
  id?: number;
  reference_number: string;
  type: 'incoming' | 'outgoing';
  subject: string;
  sender: string;
  recipient: string;
  date: string;
  department_id?: number;
  status: 'pending' | 'processed' | 'archived';
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  image_url?: string;
  created_at?: string;
}

export interface HospitalSettings {
  name: string;
  logo: string;
  address: string;
  phone: string;
  email: string;
  general_manager: string;
  quality_manager: string;
  fiscal_year: string;
  primary_color: string;
  secondary_color: string;
  header_right_text?: string;
  header_left_text?: string;
}

export const TASK_STATUS_LABELS = {
  pending: { label: "قيد الانتظار", color: "bg-gray-100 text-gray-700" },
  in_progress: { label: "جاري العمل", color: "bg-blue-100 text-blue-700" },
  completed: { label: "مكتملة", color: "bg-emerald-100 text-emerald-700" },
};

export const TASK_PRIORITY_LABELS = {
  low: { label: "منخفضة", color: "text-gray-500" },
  medium: { label: "متوسطة", color: "text-amber-600" },
  high: { label: "عالية", color: "text-red-600" },
};

export const INDICATOR_LABELS: Record<string, { label: string, numLabel: string, denLabel: string, unit: string }> = {
  bed_occupancy: { 
    label: "نسبة إشغال الأسرة", 
    numLabel: "إجمالي أيام المرضى", 
    denLabel: "إجمالي أيام الأسرة المتاحة",
    unit: "%"
  },
  avg_stay: { 
    label: "متوسط مدة الإقامة", 
    numLabel: "إجمالي أيام التنويم", 
    denLabel: "إجمالي حالات الخروج",
    unit: "يوم"
  },
  mortality_rate: { 
    label: "معدل الوفيات", 
    numLabel: "إجمالي الوفيات", 
    denLabel: "إجمالي حالات الخروج",
    unit: "%"
  },
  satisfaction: { 
    label: "رضا المرضى", 
    numLabel: "مجموع درجات الاستبيان", 
    denLabel: "عدد الاستبيانات المكتملة",
    unit: "/5"
  },
  surgeries: { 
    label: "معدل نجاح العمليات", 
    numLabel: "العمليات المكتملة بنجاح", 
    denLabel: "إجمالي العمليات المجدولة",
    unit: "%"
  },
  er_wait_time: { 
    label: "متوسط وقت انتظار الطوارئ", 
    numLabel: "إجمالي دقائق الانتظار", 
    denLabel: "إجمالي مرضى الطوارئ",
    unit: "دقيقة"
  },
  readmission_rate: { 
    label: "معدل إعادة التنويم", 
    numLabel: "عدد حالات إعادة التنويم", 
    denLabel: "إجمالي حالات الخروج",
    unit: "%"
  },
};

export const THRESHOLDS: Record<string, { min?: number, max?: number, message: string }> = {
  bed_occupancy: { max: 95, message: "نسبة إشغال الأسرة مرتفعة جداً" },
  mortality_rate: { max: 5, message: "معدل الوفيات تجاوز الحد المسموح به" },
  satisfaction: { min: 3, message: "مستوى رضا المرضى منخفض" },
  er_wait_time: { max: 120, message: "وقت انتظار الطوارئ طويل جداً" },
  readmission_rate: { max: 15, message: "معدل إعادة التنويم مرتفع" },
};
