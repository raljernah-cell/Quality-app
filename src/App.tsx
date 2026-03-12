import React, { useState, useEffect, useMemo } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area 
} from "recharts";
import { 
  Activity, 
  PlusCircle, 
  BarChart3, 
  History, 
  BrainCircuit, 
  TrendingUp, 
  Users, 
  Clock, 
  Stethoscope,
  AlertCircle,
  ChevronRight,
  Save,
  Loader2,
  Filter,
  CheckCircle2,
  ListTodo,
  Calendar,
  LayoutDashboard,
  LayoutGrid,
  List,
  Play,
  Printer,
  Pencil,
  X,
  Settings,
  ShieldAlert,
  Mail,
  GraduationCap,
  FileText,
  AlertTriangle,
  QrCode,
  UserCog,
  Home,
  Menu,
  Bell,
  ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence, useDragControls } from "motion/react";
import Markdown from "react-markdown";
import { cn } from "./lib/utils";
import { IndicatorData, INDICATOR_LABELS, Task, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, THRESHOLDS, Department, Administration, HospitalSettings, KpiIndicator, IndicatorCategory } from "./types";
import { analyzeIndicators } from "./services/gemini";
import MailManagement from "./components/MailManagement";
import Login from "./components/Login";
import UserManagement from "./components/UserManagement";

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [viewState, setViewState] = useState<"home" | "indicators_menu" | "tasks_menu" | "app" | "tasks_app" | "settings" | "risks" | "mail" | "training" | "circulars" | "incidents" | "employees" | "coding" | "users" | "kpi_management">("home");
  const [activeTab, setActiveTab] = useState<"dashboard" | "entry" | "history">("dashboard");
  const [activeTaskTab, setActiveTaskTab] = useState<"monitor" | "entry">("monitor");
  
  const [hospitalSettings, setHospitalSettings] = useState<HospitalSettings>({
    name: "مستشفى الأمل التخصصي",
    logo: "",
    address: "",
    phone: "",
    email: "",
    general_manager: "",
    quality_manager: "",
    fiscal_year: new Date().getFullYear().toString(),
    primary_color: "#4f46e5",
    secondary_color: "#0f172a",
    header_right_text: "المملكة العربية السعودية\nوزارة الصحة",
    header_left_text: "إدارة الجودة\nقسم المؤشرات"
  });
  const [administrations, setAdministrations] = useState<Administration[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>("الكل");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [newDept, setNewDept] = useState({ name: "", supervisor: "", phone: "", administration_id: undefined as number | undefined });
  const [newAdmin, setNewAdmin] = useState({ name: "", manager: "" });
  const [activeSettingsTab, setActiveSettingsTab] = useState<"hospital" | "structure">("hospital");
  const [selectedMonth, setSelectedMonth] = useState<string>("الكل");
  const [selectedStatus, setSelectedStatus] = useState<string>("الكل");
  const [taskViewMode, setTaskViewMode] = useState<"grid" | "table">("table");
  const [data, setData] = useState<IndicatorData[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [alerts, setAlerts] = useState<{ id: number, message: string, indicator: string, value: number, patient?: string, department: string }[]>([]);
  const [kpiIndicators, setKpiIndicators] = useState<KpiIndicator[]>([]);
  const [selectedKpiDept, setSelectedKpiDept] = useState<number | "">("");
  const [showAddKpiModal, setShowAddKpiModal] = useState(false);
  const dragControls = useDragControls();
  const [kpiFormData, setKpiFormData] = useState<Partial<KpiIndicator>>({
    name: "",
    description: "",
    type: "Percentage",
    target_value: 0,
    measurement_period: "Monthly",
    calculation_method: "",
    is_active: 1
  });
  const [kpiFormError, setKpiFormError] = useState<string | null>(null);
  const [editingKpi, setEditingKpi] = useState<KpiIndicator | null>(null);
  const [searchKpi, setSearchKpi] = useState("");

  const playAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.error("Audio alert failed", e);
    }
  };

  // Derive available months from data
  const availableMonths = useMemo(() => {
    const months = Array.from(new Set(data.map(d => d.month))).sort().reverse();
    return months;
  }, [data]);

  // Form state
  const [formYear, setFormYear] = useState(new Date().getFullYear());
  const [formMonth, setFormMonth] = useState(new Date().getMonth() + 1);
  const [formData, setFormData] = useState<Record<string, any>>({
    department: departments[0]?.name || "",
    patient_name: "",
  });

  const handleIndicatorChange = (key: string, type: 'num' | 'den', value: number) => {
    setFormData(prev => {
      const num = type === 'num' ? value : (prev[`${key}_num`] || 0);
      const den = type === 'den' ? value : (prev[`${key}_den`] || 0);
      
      let calculatedValue = 0;
      if (den !== 0) {
        calculatedValue = num / den;
        // Adjust for percentages or scales based on indicator type
        const indicator = kpiIndicators.find(i => i.code === key);
        if (indicator && indicator.type === 'Percentage') {
          calculatedValue *= 100;
        }
      }

      return {
        ...prev,
        [`${key}_num`]: num,
        [`${key}_den`]: den,
        [key]: calculatedValue
      };
    });
  };

  const [taskFormData, setTaskFormData] = useState<Omit<Task, 'id' | 'created_at'>>({
    task_number: "",
    title: "",
    description: "",
    issuing_entity: "",
    responsible_person: "",
    executing_entity: "",
    task_date: new Date().toISOString().split('T')[0],
    department: "",
    status: 'pending',
    priority: 'medium',
    due_date: new Date().toISOString().split('T')[0],
    notes: "",
  });

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchData();
    fetchTasks();
    fetchSettings();
    fetchDepartments();
    fetchAdministrations();
    fetchKpiIndicators();
  }, []);

  const fetchAdministrations = async () => {
    try {
      const res = await fetch("/api/administrations");
      const json = await res.json();
      setAdministrations(json);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch("/api/departments");
      const json = await res.json();
      setDepartments(json);
      
      // Update form defaults if they are still at initial state
      if (json.length > 0) {
        setFormData(prev => ({ ...prev, department: json[0].name }));
        setTaskFormData(prev => ({ 
          ...prev, 
          department: json[0].name,
          responsible_person: json[0].supervisor || "",
          executing_entity: json[0].name
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchKpiIndicators = async () => {
    try {
      const res = await fetch("/api/kpi_indicators");
      const json = await res.json();
      setKpiIndicators(json);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDept.name) return;
    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDept),
      });
      if (res.ok) {
        setNewDept({ name: "", supervisor: "", phone: "", administration_id: undefined });
        fetchDepartments();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdmin.name) return;
    try {
      const res = await fetch("/api/administrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAdmin),
      });
      if (res.ok) {
        setNewAdmin({ name: "", manager: "" });
        fetchAdministrations();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAdmin = async (id: number) => {
    try {
      const res = await fetch(`/api/administrations/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchAdministrations();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteDept = async (id: number) => {
    try {
      const res = await fetch(`/api/departments/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchDepartments();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      const json = await res.json();
      if (json.hospital_name) {
        setHospitalSettings(prev => ({
          ...prev,
          name: json.hospital_name,
          logo: json.hospital_logo || "",
          address: json.hospital_address || "",
          phone: json.hospital_phone || "",
          email: json.hospital_email || "",
          general_manager: json.hospital_gm || "",
          quality_manager: json.hospital_qm || "",
          fiscal_year: json.hospital_fy || prev.fiscal_year,
          primary_color: json.hospital_primary_color || prev.primary_color,
          secondary_color: json.hospital_secondary_color || prev.secondary_color,
          header_right_text: json.header_right_text || prev.header_right_text,
          header_left_text: json.header_left_text || prev.header_left_text,
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const saveSettings = async (updates: Record<string, string>) => {
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      fetchSettings();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTasks = async () => {
    setTasksLoading(true);
    try {
      const res = await fetch("/api/tasks");
      const json = await res.json();
      setTasks(json);
    } catch (err) {
      console.error(err);
    } finally {
      setTasksLoading(false);
    }
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskFormData),
      });
      if (res.ok) {
        // alert("تم إضافة المهمة بنجاح");
        setTaskFormData({
          task_number: "",
          title: "",
          description: "",
          issuing_entity: "",
          responsible_person: departments[0]?.supervisor || "",
          executing_entity: departments[0]?.name || "",
          task_date: new Date().toISOString().split('T')[0],
          department: departments[0]?.name || "",
          status: 'pending',
          priority: 'medium',
          due_date: new Date().toISOString().split('T')[0],
          notes: "",
        });
        fetchTasks();
        setActiveTaskTab("monitor");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTaskUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    try {
      const res = await fetch(`/api/tasks/${editingTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingTask),
      });
      if (res.ok) {
        setShowEditModal(false);
        setEditingTask(null);
        fetchTasks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateTaskStatus = async (id: number, status: string) => {
    try {
      const body: any = { status };
      if (status === 'completed') {
        body.actual_completion_date = new Date().toISOString().split('T')[0];
      }
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        fetchTasks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/kpi_measurements");
      const measurements = await res.json();
      
      const pivoted: Record<string, any> = {};
      measurements.forEach((m: any) => {
        const key = `${m.month}_${m.department_name}`;
        if (!pivoted[key]) {
          pivoted[key] = {
            id: key,
            month: m.month,
            department: m.department_name,
          };
        }
        pivoted[key][m.indicator_code] = m.value;
        pivoted[key][`${m.indicator_code}_num`] = m.numerator;
        pivoted[key][`${m.indicator_code}_den`] = m.denominator;
      });
      
      const sortedData = Object.values(pivoted).sort((a: any, b: any) => a.month.localeCompare(b.month));
      setData(sortedData); 
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    let filtered = data;
    if (selectedDept !== "الكل") {
      filtered = filtered.filter(d => d.department === selectedDept);
    }
    if (selectedMonth !== "الكل") {
      filtered = filtered.filter(d => d.month === selectedMonth);
    }
    return filtered;
  }, [data, selectedDept, selectedMonth]);

  const selectedDeptInfo = useMemo(() => {
    return departments.find(d => d.name === selectedDept);
  }, [departments, selectedDept]);

  const uniqueSupervisors = useMemo(() => {
    const supervisors = departments
      .map(d => d.supervisor)
      .filter((s): s is string => !!s && s.trim() !== "");
    return Array.from(new Set(supervisors)).sort();
  }, [departments]);

  const dashboardDisplayData = useMemo(() => {
    // For charts, we usually want the trend, so we only filter by department
    if (selectedDept === "الكل") return data;
    return data.filter(d => d.department === selectedDept);
  }, [data, selectedDept]);

  const latestData = useMemo(() => {
    if (filteredData.length === 0) return null;
    
    const latestMonth = filteredData[filteredData.length - 1].month;
    const latestMonthData = filteredData.filter(d => d.month === latestMonth);
    
    if (selectedDept !== "الكل") {
      return latestMonthData[0];
    }
    
    // Aggregate data for all departments
    const aggregated: any = { month: latestMonth, department: "الكل" };
    kpiIndicators.forEach(ind => {
      if (!ind.code) return;
      let totalNum = 0;
      let totalDen = 0;
      let hasData = false;
      
      latestMonthData.forEach(d => {
        if (d[`${ind.code}_num`] !== undefined && d[`${ind.code}_den`] !== undefined) {
          totalNum += Number(d[`${ind.code}_num`]) || 0;
          totalDen += Number(d[`${ind.code}_den`]) || 0;
          hasData = true;
        }
      });
      
      if (hasData) {
        aggregated[`${ind.code}_num`] = totalNum;
        aggregated[`${ind.code}_den`] = totalDen;
        
        let val = 0;
        if (totalDen > 0) {
          val = ind.type === "Percentage" ? (totalNum / totalDen) * 100 : (totalNum / totalDen);
        } else {
          val = totalNum;
        }
        aggregated[ind.code] = val;
      }
    });
    
    return aggregated;
  }, [filteredData, selectedDept, kpiIndicators]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const monthStr = `${formYear}-${formMonth.toString().padStart(2, '0')}`;
    
    const selectedDeptId = departments.find(d => d.name === formData.department)?.id;
    if (!selectedDeptId) {
      // alert("الرجاء اختيار القسم");
      return;
    }

    const deptIndicators = kpiIndicators.filter(i => i.department_id === selectedDeptId && i.is_active === 1);
    
    const measurements = deptIndicators.map(ind => {
      const code = ind.code!;
      return {
        indicator_id: ind.id,
        month: monthStr,
        department_id: selectedDeptId,
        numerator: formData[`${code}_num`] || 0,
        denominator: formData[`${code}_den`] || 0,
        value: formData[code] || 0,
        patient_name: formData.patient_name || "",
      };
    });

    // Check for alerts (simplified for dynamic indicators)
    const newAlerts: any[] = [];
    measurements.forEach(m => {
      const ind = deptIndicators.find(i => i.id === m.indicator_id);
      if (ind && ind.target_value !== undefined && ind.target_value !== null) {
        if (ind.type === 'Percentage' && m.value < ind.target_value) {
           newAlerts.push({
            id: Date.now() + Math.random(),
            message: `القيمة (${m.value.toFixed(2)}) أقل من المستهدف (${ind.target_value})`,
            indicator: ind.name,
            value: m.value,
            patient: m.patient_name,
            department: formData.department
          });
        }
      }
    });

    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev]);
      playAlertSound();
    }

    try {
      const res = await fetch("/api/kpi_measurements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ measurements }),
      });
      if (res.ok) {
        if (newAlerts.length > 0) {
          // alert("تم حفظ البيانات بنجاح، ولكن تم رصد تنبيهات لتجاوز الحدود المسموح بها!");
        } else {
          // alert("تم حفظ البيانات بنجاح");
        }
        fetchData();
        setActiveTab("dashboard");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    const analysis = await analyzeIndicators(filteredData);
    setAiAnalysis(analysis);
    setAnalyzing(false);
  };

  const deptComparisonData = useMemo(() => {
    const latestMonth = data[data.length - 1]?.month;
    if (!latestMonth) return [];
    return departments.map(dept => {
      const deptData = data.find(d => d.department === dept.name && d.month === latestMonth);
      return {
        name: dept.name,
        occupancy: deptData?.bed_occupancy || 0,
        satisfaction: (deptData?.satisfaction || 0) * 20, // Scale to 100 for comparison
      };
    });
  }, [data, departments]);

  const renderIndicatorsMenu = () => (
    <div className="p-6 md:p-12 max-w-7xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">نظام مؤشرات الأداء</h1>
          <p className="text-slate-500 text-lg font-medium">إدارة وتحليل البيانات الصحية والتشغيلية للمستشفى.</p>
        </div>
        <button 
          onClick={() => setViewState("home")}
          className="p-4 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm group"
        >
          <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <MenuCard 
          title="لوحة المؤشرات الرئيسية" 
          description="استعراض الرسوم البيانية والتحليلات الذكية للأداء العام"
          icon={<LayoutDashboard className="w-10 h-10 text-indigo-600" />}
          onClick={() => {
            setViewState("app");
            setActiveTab("dashboard");
          }}
          color="indigo"
        />
        <MenuCard 
          title="إدخال البيانات" 
          description="تسجيل القيم الشهرية للمؤشرات حسب الأقسام"
          icon={<PlusCircle className="w-10 h-10 text-indigo-600" />}
          onClick={() => {
            setViewState("app");
            setActiveTab("entry");
          }}
          color="indigo"
        />
        <MenuCard 
          title="السجل التاريخي" 
          description="مراجعة وتعديل البيانات المسجلة سابقاً"
          icon={<History className="w-10 h-10 text-indigo-600" />}
          onClick={() => {
            setViewState("app");
            setActiveTab("history");
          }}
          color="indigo"
        />
        <MenuCard 
          title="إدارة مؤشرات الأقسام" 
          description="إعداد وإدارة مؤشرات الأداء الخاصة بكل قسم بشكل ديناميكي"
          icon={<Settings className="w-10 h-10 text-indigo-600" />}
          onClick={() => {
            setViewState("kpi_management");
          }}
          color="indigo"
        />
      </div>
    </div>
  );

  const renderTasksMenu = () => (
    <div className="p-6 md:p-12 max-w-7xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">نظام إدارة المهام</h1>
          <p className="text-slate-500 text-lg font-medium">متابعة تنفيذ التوجيهات والمهام الإدارية والطبية.</p>
        </div>
        <button 
          onClick={() => setViewState("home")}
          className="p-4 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm group"
        >
          <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <MenuCard 
          title="متابعة المهام" 
          description="لوحة مراقبة حالة المهام ونسب الإنجاز"
          icon={<LayoutDashboard className="w-10 h-10 text-emerald-600" />}
          onClick={() => {
            setViewState("tasks_app");
            setActiveTaskTab("monitor");
          }}
          color="emerald"
        />
        <MenuCard 
          title="إضافة مهمة جديدة" 
          description="إنشاء وتكليف المهام للأقسام والموظفين"
          icon={<PlusCircle className="w-10 h-10 text-emerald-600" />}
          onClick={() => {
            setViewState("tasks_app");
            setActiveTaskTab("entry");
          }}
          color="emerald"
        />
      </div>
    </div>
  );

  const renderHome = () => (
    <div className="p-6 md:p-12 max-w-7xl mx-auto" dir="rtl">
      <div className="mb-12">
        <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">مرحباً بك في {hospitalSettings.name}</h1>
        <p className="text-slate-500 text-lg font-medium">المنصة المركزية لإدارة الأداء المؤسسي والمؤشرات الصحية.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-12">
        <StatCard 
          title="إجمالي الأقسام" 
          value={departments.length} 
          icon={<Activity className="w-8 h-8" />} 
          trend="مفعل" 
          color="bg-indigo-50 text-indigo-600" 
        />
        <StatCard 
          title="المهام النشطة" 
          value={tasks.filter(t => t.status !== 'completed').length} 
          icon={<ListTodo className="w-8 h-8" />} 
          trend="قيد التنفيذ" 
          color="bg-emerald-50 text-emerald-600" 
        />
        <StatCard 
          title="المهام المتأخرة" 
          value={tasks.filter(t => t.status !== 'completed' && new Date(t.due_date) < new Date()).length} 
          icon={<AlertTriangle className="w-8 h-8" />} 
          trend="تتطلب إجراء" 
          color="bg-red-50 text-red-600" 
        />
        <div 
          onClick={() => setViewState("mail")}
          className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Mail className="w-8 h-8" />
            </div>
          </div>
          <div>
            <h3 className="text-slate-500 font-medium mb-1">الاتصالات الإدارية</h3>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-black text-slate-900">الوارد والصادر</span>
              <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">إدارة</span>
            </div>
          </div>
        </div>
        <div 
          onClick={() => setViewState("users")}
          className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-8 h-8" />
            </div>
          </div>
          <div>
            <h3 className="text-slate-500 font-medium mb-1">المستخدمين والصلاحيات</h3>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-black text-slate-900">إدارة النظام</span>
              <span className="text-sm font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-lg">إعدادات</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            نظرة عامة على الأداء
          </h3>
          <div className="h-64 flex items-center justify-center text-slate-400 font-medium">
            سيتم عرض ملخص الأداء العام هنا
          </div>
        </div>
        
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Clock className="w-5 h-5" />
            </div>
            أحدث المهام
          </h3>
          <div className="space-y-4">
            {tasks.slice(0, 3).map(task => (
              <div key={task.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900">{task.title}</h4>
                  <p className="text-xs text-slate-500 mt-1">{task.executing_entity}</p>
                </div>
                <span className={cn(
                  "px-3 py-1 rounded-lg text-xs font-bold",
                  TASK_STATUS_LABELS[task.status].color
                )}>
                  {TASK_STATUS_LABELS[task.status].label}
                </span>
              </div>
            ))}
            {tasks.length === 0 && (
              <div className="text-center text-slate-400 py-8 font-medium">لا توجد مهام حالية</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setHospitalSettings(prev => ({ ...prev, logo: base64String }));
        saveSettings({ hospital_logo: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveKpi = async (e: React.FormEvent) => {
    e.preventDefault();
    setKpiFormError(null);
    console.log("handleSaveKpi called with:", kpiFormData);
    if (!kpiFormData.name || !kpiFormData.department_id || !kpiFormData.type) {
      setKpiFormError("الرجاء تعبئة جميع الحقول الإلزامية");
      console.log("Validation failed:", { name: kpiFormData.name, department_id: kpiFormData.department_id, type: kpiFormData.type });
      return;
    }

    try {
      if (editingKpi) {
        const res = await fetch(`/api/kpi_indicators/${editingKpi.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(kpiFormData),
        });
        if (!res.ok) {
          const err = await res.json();
          setKpiFormError(err.error || "حدث خطأ أثناء التعديل");
          return;
        }
      } else {
        const res = await fetch("/api/kpi_indicators", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(kpiFormData),
        });
        if (!res.ok) {
          const err = await res.json();
          setKpiFormError(err.error || "حدث خطأ أثناء الحفظ");
          return;
        }
      }
      setShowAddKpiModal(false);
      setEditingKpi(null);
      setKpiFormData({
        name: "",
        description: "",
        type: "Percentage",
        target_value: 0,
        measurement_period: "Monthly",
        calculation_method: "",
        is_active: 1
      });
      fetchKpiIndicators();
    } catch (err: any) {
      console.error(err);
      setKpiFormError(err.message || "حدث خطأ غير متوقع");
    }
  };

  const handleToggleKpiActive = async (kpi: KpiIndicator) => {
    try {
      await fetch(`/api/kpi_indicators/${kpi.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: kpi.is_active ? 0 : 1 }),
      });
      fetchKpiIndicators();
    } catch (err) {
      console.error(err);
    }
  };

  const renderKpiManagement = () => {
    let filteredKpis = selectedKpiDept 
      ? kpiIndicators.filter(k => k.department_id === Number(selectedKpiDept))
      : kpiIndicators;

    if (searchKpi) {
      const lowerSearch = searchKpi.toLowerCase();
      filteredKpis = filteredKpis.filter(k => 
        k.name.toLowerCase().includes(lowerSearch) || 
        (k.code && k.code.toLowerCase().includes(lowerSearch))
      );
    }

    return (
      <div className="p-6 md:p-12 max-w-7xl mx-auto" dir="rtl">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">إدارة مؤشرات الأقسام</h1>
            <p className="text-slate-500 text-lg font-medium">إعداد وإدارة مؤشرات الأداء الخاصة بكل قسم بشكل ديناميكي.</p>
          </div>
          <button 
            onClick={() => setViewState("indicators_menu")}
            className="p-4 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm group"
          >
            <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden mb-8">
          <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row gap-6 items-center justify-between">
            <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
              <div className="flex items-center gap-4 w-full md:w-auto">
                <Filter className="w-5 h-5 text-slate-400" />
                <select
                  className="bg-slate-50 border-none text-slate-700 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 py-3 px-4 w-full md:w-64"
                  value={selectedKpiDept}
                  onChange={(e) => setSelectedKpiDept(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">جميع الأقسام</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                placeholder="بحث بالرمز أو الاسم..."
                className="bg-slate-50 border-none text-slate-700 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 py-3 px-4 w-full md:w-64"
                value={searchKpi}
                onChange={(e) => setSearchKpi(e.target.value)}
              />
            </div>
            
            <button
              onClick={() => {
                setEditingKpi(null);
                setKpiFormData({
                  department_id: selectedKpiDept ? Number(selectedKpiDept) : (departments[0]?.id || 0),
                  name: "",
                  description: "",
                  type: "Percentage",
                  target_value: 0,
                  measurement_period: "Monthly",
                  calculation_method: "",
                  is_active: 1
                });
                setKpiFormError(null);
                setShowAddKpiModal(true);
              }}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors w-full md:w-auto justify-center font-medium"
            >
              <PlusCircle className="w-5 h-5" />
              إضافة مؤشر جديد
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="p-6 text-slate-500 font-semibold text-sm">رمز المؤشر</th>
                  <th className="p-6 text-slate-500 font-semibold text-sm">اسم المؤشر</th>
                  <th className="p-6 text-slate-500 font-semibold text-sm">القسم</th>
                  <th className="p-6 text-slate-500 font-semibold text-sm">النوع</th>
                  <th className="p-6 text-slate-500 font-semibold text-sm">الهدف</th>
                  <th className="p-6 text-slate-500 font-semibold text-sm">الدورية</th>
                  <th className="p-6 text-slate-500 font-semibold text-sm">الحالة</th>
                  <th className="p-6 text-slate-500 font-semibold text-sm">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredKpis.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-500">
                      لا توجد مؤشرات مسجلة لهذا القسم
                    </td>
                  </tr>
                ) : (
                  filteredKpis.map(kpi => (
                    <tr key={kpi.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-6 font-mono text-sm text-indigo-600 font-medium">{kpi.code}</td>
                      <td className="p-6">
                        <div className="font-semibold text-slate-900">{kpi.name}</div>
                        {kpi.description && <div className="text-xs text-slate-500 mt-1">{kpi.description}</div>}
                      </td>
                      <td className="p-6 text-slate-600">
                        {departments.find(d => d.id === kpi.department_id)?.name || "غير محدد"}
                      </td>
                      <td className="p-6 text-slate-600">
                        {kpi.type === 'Percentage' ? 'نسبة مئوية' : 
                         kpi.type === 'Count' ? 'عدد' : 
                         kpi.type === 'Rate' ? 'معدل' : 
                         kpi.type === 'Time' ? 'وقت' : 'امتثال'}
                      </td>
                      <td className="p-6 text-slate-900 font-medium" dir="ltr">{kpi.target_value}</td>
                      <td className="p-6 text-slate-600">
                        {kpi.measurement_period === 'Monthly' ? 'شهري' : 
                         kpi.measurement_period === 'Quarterly' ? 'ربع سنوي' : 'سنوي'}
                      </td>
                      <td className="p-6">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-xs font-medium",
                          kpi.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                        )}>
                          {kpi.is_active ? "نشط" : "غير نشط"}
                        </span>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => {
                              setEditingKpi(kpi);
                              setKpiFormData(kpi);
                              setKpiFormError(null);
                              setShowAddKpiModal(true);
                            }}
                            className="text-slate-400 hover:text-indigo-600 transition-colors"
                            title="تعديل"
                          >
                            <Pencil className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleToggleKpiActive(kpi)}
                            className={cn(
                              "transition-colors",
                              kpi.is_active ? "text-slate-400 hover:text-red-600" : "text-slate-400 hover:text-emerald-600"
                            )}
                            title={kpi.is_active ? "إلغاء التنشيط" : "تنشيط"}
                          >
                            {kpi.is_active ? <X className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add/Edit KPI Modal */}
        <AnimatePresence>
          {showAddKpiModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={() => setShowAddKpiModal(false)}
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
                dir="rtl"
              >
                <div 
                  className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0"
                >
                  <h2 className="text-2xl font-black text-slate-900">
                    {editingKpi ? "تعديل مؤشر" : "إضافة مؤشر جديد"}
                  </h2>
                  <button onClick={() => setShowAddKpiModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSaveKpi} className="p-8 overflow-y-auto">
                  {kpiFormError && (
                    <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <p className="text-sm font-medium">{kpiFormError}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">اسم المؤشر *</label>
                      <input
                        required
                        type="text"
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 py-3 px-4"
                        value={kpiFormData.name}
                        onChange={e => setKpiFormData({...kpiFormData, name: e.target.value})}
                      />
                    </div>
                    
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">القسم *</label>
                      <select
                        required
                        disabled={!!editingKpi}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 py-3 px-4 disabled:opacity-50"
                        value={kpiFormData.department_id || ""}
                        onChange={e => setKpiFormData({...kpiFormData, department_id: Number(e.target.value)})}
                      >
                        <option value="">اختر القسم...</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                      {!editingKpi && <p className="text-xs text-slate-500 mt-2">سيتم إنشاء رمز المؤشر تلقائياً بناءً على القسم المختار.</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">نوع المؤشر *</label>
                      <select
                        required
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 py-3 px-4"
                        value={kpiFormData.type}
                        onChange={e => setKpiFormData({...kpiFormData, type: e.target.value})}
                      >
                        <option value="Percentage">نسبة مئوية (%)</option>
                        <option value="Count">عدد (رقم صحيح)</option>
                        <option value="Rate">معدل</option>
                        <option value="Time">وقت (دقائق/ساعات)</option>
                        <option value="Compliance">امتثال (نعم/لا أو نسبة)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">القيمة المستهدفة</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 py-3 px-4"
                        value={kpiFormData.target_value || ""}
                        onChange={e => setKpiFormData({...kpiFormData, target_value: Number(e.target.value)})}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">دورية القياس</label>
                      <select
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 py-3 px-4"
                        value={kpiFormData.measurement_period}
                        onChange={e => setKpiFormData({...kpiFormData, measurement_period: e.target.value})}
                      >
                        <option value="Monthly">شهري</option>
                        <option value="Quarterly">ربع سنوي</option>
                        <option value="Annually">سنوي</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">حالة المؤشر</label>
                      <select
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 py-3 px-4"
                        value={kpiFormData.is_active}
                        onChange={e => setKpiFormData({...kpiFormData, is_active: Number(e.target.value)})}
                      >
                        <option value={1}>نشط</option>
                        <option value={0}>غير نشط</option>
                      </select>
                    </div>

                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">وصف المؤشر</label>
                      <textarea
                        rows={2}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 py-3 px-4 resize-none"
                        value={kpiFormData.description || ""}
                        onChange={e => setKpiFormData({...kpiFormData, description: e.target.value})}
                      />
                    </div>

                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">طريقة الحساب (معادلة)</label>
                      <textarea
                        rows={2}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 py-3 px-4 resize-none"
                        value={kpiFormData.calculation_method || ""}
                        onChange={e => setKpiFormData({...kpiFormData, calculation_method: e.target.value})}
                        placeholder="مثال: (عدد الحالات / إجمالي الحالات) * 100"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-4 pt-6 mt-6 border-t border-slate-100 sticky bottom-0 bg-white pb-2 z-10">
                    <button
                      type="button"
                      onClick={() => setShowAddKpiModal(false)}
                      className="px-6 py-3 text-slate-600 font-medium hover:bg-slate-50 rounded-xl transition-colors"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="px-8 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                      حفظ المؤشر
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderSettings = () => (
    <div className="p-6 md:p-12 max-w-7xl mx-auto" dir="rtl">
      <div className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">تخصيص النظام</h1>
          <p className="text-slate-500 text-lg font-medium">إدارة بيانات المستشفى والهيكل التنظيمي.</p>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
          <button 
            onClick={() => setActiveSettingsTab("hospital")}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
              activeSettingsTab === "hospital" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            إعدادات المستشفى
          </button>
          <button 
            onClick={() => setActiveSettingsTab("structure")}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
              activeSettingsTab === "structure" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            الهيكل التنظيمي
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeSettingsTab === "hospital" ? (
          <motion.div 
            key="hospital"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Home className="w-5 h-5" />
                  </div>
                  البيانات الأساسية
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600 mr-2">اسم المستشفى</label>
                    <input 
                      type="text"
                      value={hospitalSettings.name}
                      onChange={e => setHospitalSettings({...hospitalSettings, name: e.target.value})}
                      onBlur={() => saveSettings({ hospital_name: hospitalSettings.name })}
                      className="w-full px-5 py-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600 mr-2">العنوان</label>
                    <input 
                      type="text"
                      value={hospitalSettings.address}
                      onChange={e => setHospitalSettings({...hospitalSettings, address: e.target.value})}
                      onBlur={() => saveSettings({ hospital_address: hospitalSettings.address })}
                      className="w-full px-5 py-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600 mr-2">أرقام التواصل</label>
                    <input 
                      type="text"
                      value={hospitalSettings.phone}
                      onChange={e => setHospitalSettings({...hospitalSettings, phone: e.target.value})}
                      onBlur={() => saveSettings({ hospital_phone: hospitalSettings.phone })}
                      className="w-full px-5 py-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600 mr-2">البريد الرسمي</label>
                    <input 
                      type="email"
                      value={hospitalSettings.email}
                      onChange={e => setHospitalSettings({...hospitalSettings, email: e.target.value})}
                      onBlur={() => saveSettings({ hospital_email: hospitalSettings.email })}
                      className="w-full px-5 py-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <UserCog className="w-5 h-5" />
                  </div>
                  إدارة القيادة
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600 mr-2">اسم المدير العام</label>
                    <input 
                      type="text"
                      value={hospitalSettings.general_manager}
                      onChange={e => setHospitalSettings({...hospitalSettings, general_manager: e.target.value})}
                      onBlur={() => saveSettings({ hospital_gm: hospitalSettings.general_manager })}
                      className="w-full px-5 py-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600 mr-2">اسم مدير الجودة</label>
                    <input 
                      type="text"
                      value={hospitalSettings.quality_manager}
                      onChange={e => setHospitalSettings({...hospitalSettings, quality_manager: e.target.value})}
                      onBlur={() => saveSettings({ hospital_qm: hospitalSettings.quality_manager })}
                      className="w-full px-5 py-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600 mr-2">السنة المالية</label>
                    <input 
                      type="text"
                      value={hospitalSettings.fiscal_year}
                      onChange={e => setHospitalSettings({...hospitalSettings, fiscal_year: e.target.value})}
                      onBlur={() => saveSettings({ hospital_fy: hospitalSettings.fiscal_year })}
                      className="w-full px-5 py-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                    <FileText className="w-5 h-5" />
                  </div>
                  ترويسة التقارير
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600 mr-2">النص الأيمن للترويسة</label>
                    <textarea 
                      value={hospitalSettings.header_right_text}
                      onChange={e => setHospitalSettings({...hospitalSettings, header_right_text: e.target.value})}
                      onBlur={() => saveSettings({ header_right_text: hospitalSettings.header_right_text || "" })}
                      className="w-full px-5 py-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold min-h-[100px]"
                      placeholder="المملكة العربية السعودية&#10;وزارة الصحة"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-600 mr-2">النص الأيسر للترويسة</label>
                    <textarea 
                      value={hospitalSettings.header_left_text}
                      onChange={e => setHospitalSettings({...hospitalSettings, header_left_text: e.target.value})}
                      onBlur={() => saveSettings({ header_left_text: hospitalSettings.header_left_text || "" })}
                      className="w-full px-5 py-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold min-h-[100px]"
                      placeholder="إدارة الجودة&#10;قسم المؤشرات"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <h3 className="text-xl font-black text-slate-900 mb-8">شعار المستشفى</h3>
                <div className="flex flex-col items-center gap-6">
                  <div className="w-40 h-40 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden group relative">
                    {hospitalSettings.logo ? (
                      <img src={hospitalSettings.logo} alt="Logo" className="w-full h-full object-contain p-4" />
                    ) : (
                      <Activity className="w-12 h-12 text-slate-300" />
                    )}
                    <label className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                      <PlusCircle className="w-10 h-10 text-white" />
                      <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                    </label>
                  </div>
                  <p className="text-xs text-slate-400 text-center leading-relaxed">
                    يفضل استخدام صورة PNG بخلفية شفافة<br/>وبأبعاد مربعة (512x512)
                  </p>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <h3 className="text-xl font-black text-slate-900 mb-8">ألوان النظام</h3>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-600">اللون الرئيسي</span>
                    <input 
                      type="color" 
                      value={hospitalSettings.primary_color}
                      onChange={e => setHospitalSettings({...hospitalSettings, primary_color: e.target.value})}
                      onBlur={() => saveSettings({ hospital_primary_color: hospitalSettings.primary_color })}
                      className="w-12 h-12 rounded-xl border-none cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-600">اللون الثانوي</span>
                    <input 
                      type="color" 
                      value={hospitalSettings.secondary_color}
                      onChange={e => setHospitalSettings({...hospitalSettings, secondary_color: e.target.value})}
                      onBlur={() => saveSettings({ hospital_secondary_color: hospitalSettings.secondary_color })}
                      className="w-12 h-12 rounded-xl border-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="structure"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-8"
          >
            {/* Administrations Management */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                    <LayoutGrid className="w-5 h-5" />
                  </div>
                  إدارة الإدارات العامة
                </h3>
              </div>
              
              <form onSubmit={handleAddAdmin} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <input 
                  required
                  type="text"
                  placeholder="اسم الإدارة (مثلاً: الإدارة الطبية)"
                  value={newAdmin.name}
                  onChange={e => setNewAdmin({...newAdmin, name: e.target.value})}
                  className="px-5 py-3 rounded-2xl border border-white bg-white shadow-sm outline-none focus:ring-4 focus:ring-amber-500/10 transition-all font-bold"
                />
                <input 
                  type="text"
                  placeholder="اسم المدير"
                  value={newAdmin.manager}
                  onChange={e => setNewAdmin({...newAdmin, manager: e.target.value})}
                  className="px-5 py-3 rounded-2xl border border-white bg-white shadow-sm outline-none focus:ring-4 focus:ring-amber-500/10 transition-all font-bold"
                />
                <button type="submit" className="bg-amber-600 text-white rounded-2xl font-black hover:bg-amber-700 transition-all shadow-lg shadow-amber-100">
                  إضافة إدارة جديدة
                </button>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {administrations.map(admin => (
                  <div key={admin.id} className="p-6 rounded-3xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                        <LayoutGrid className="w-6 h-6" />
                      </div>
                      <button 
                        onClick={() => admin.id && handleDeleteAdmin(admin.id)}
                        className="p-2 text-slate-300 hover:text-red-600 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <h4 className="text-lg font-black text-slate-900 mb-1">{admin.name}</h4>
                    <p className="text-sm text-slate-500 font-medium">المدير: {admin.manager || "غير محدد"}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Departments Management */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <Users className="w-5 h-5" />
                  </div>
                  إدارة الأقسام والوحدات
                </h3>
              </div>

              <form onSubmit={handleAddDept} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <input 
                  required
                  type="text"
                  placeholder="اسم القسم"
                  value={newDept.name}
                  onChange={e => setNewDept({...newDept, name: e.target.value})}
                  className="px-5 py-3 rounded-2xl border border-white bg-white shadow-sm outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all font-bold"
                />
                <input 
                  type="text"
                  placeholder="المسؤول"
                  value={newDept.supervisor}
                  onChange={e => setNewDept({...newDept, supervisor: e.target.value})}
                  className="px-5 py-3 rounded-2xl border border-white bg-white shadow-sm outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all font-bold"
                />
                <input 
                  type="text"
                  placeholder="رقم الهاتف"
                  value={newDept.phone}
                  onChange={e => setNewDept({...newDept, phone: e.target.value})}
                  className="px-5 py-3 rounded-2xl border border-white bg-white shadow-sm outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all font-bold"
                />
                <select 
                  value={newDept.administration_id || ""}
                  onChange={e => setNewDept({...newDept, administration_id: e.target.value ? parseInt(e.target.value) : undefined})}
                  className="px-5 py-3 rounded-2xl border border-white bg-white shadow-sm outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all font-bold"
                >
                  <option value="">اختر الإدارة</option>
                  {administrations.map(admin => (
                    <option key={admin.id} value={admin.id}>{admin.name}</option>
                  ))}
                </select>
                <button type="submit" className="bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100">
                  إضافة قسم
                </button>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {departments.map(dept => (
                  <div key={dept.id} className="p-6 rounded-3xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                        <Users className="w-6 h-6" />
                      </div>
                      <button 
                        onClick={() => dept.id && handleDeleteDept(dept.id)}
                        className="p-2 text-slate-300 hover:text-red-600 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <h4 className="text-lg font-black text-slate-900 mb-1">{dept.name}</h4>
                    <p className="text-sm text-slate-500 font-medium mb-1">المسؤول: {dept.supervisor || "غير محدد"}</p>
                    <p className="text-xs text-slate-400 font-bold">
                      الإدارة: {administrations.find(a => a.id === dept.administration_id)?.name || "غير مرتبطة"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );



  const renderTaskEntry = () => (
    <div className="max-w-3xl mx-auto pb-12" dir="rtl">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
        <h3 className="text-2xl font-black text-gray-900 mb-8 flex items-center gap-3">
          <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
            <PlusCircle className="w-8 h-8" />
          </div>
          إضافة مهمة جديدة
        </h3>
        <form onSubmit={handleTaskSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">رقم المهمة</label>
              <input 
                required
                type="text"
                value={taskFormData.task_number}
                onChange={e => setTaskFormData({...taskFormData, task_number: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="مثال: T-2024-001"
              />
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-bold text-gray-700 mb-2">عنوان المهمة</label>
              <input 
                required
                type="text"
                value={taskFormData.title}
                onChange={e => setTaskFormData({...taskFormData, title: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="مثال: مراجعة مخزون الأدوية"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">تفاصيل المهمة</label>
              <textarea 
                value={taskFormData.description}
                onChange={e => setTaskFormData({...taskFormData, description: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none h-24 resize-none transition-all"
                placeholder="تفاصيل إضافية عن المهمة..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">جهة إصدار التوجيه</label>
              <input 
                type="text"
                value={taskFormData.issuing_entity}
                onChange={e => setTaskFormData({...taskFormData, issuing_entity: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="من أصدر التوجيه؟"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">المسؤول عن التنفيذ</label>
              <select 
                required
                value={taskFormData.responsible_person}
                onChange={e => setTaskFormData({...taskFormData, responsible_person: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none bg-white transition-all"
              >
                <option value="">اختر المسؤول عن التنفيذ...</option>
                {uniqueSupervisors.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">الجهة المنفذة</label>
              <select 
                value={taskFormData.executing_entity}
                onChange={e => setTaskFormData({...taskFormData, executing_entity: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none bg-white transition-all"
              >
                <option value="">اختر الجهة المنفذة...</option>
                {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">تاريخ المهمة</label>
              <input 
                type="date"
                value={taskFormData.task_date}
                onChange={e => setTaskFormData({...taskFormData, task_date: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">تاريخ الإنجاز المفترض</label>
              <input 
                type="date"
                value={taskFormData.due_date}
                onChange={e => setTaskFormData({...taskFormData, due_date: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">القسم</label>
              <select 
                value={taskFormData.department}
                onChange={e => {
                  const deptName = e.target.value;
                  const dept = departments.find(d => d.name === deptName);
                  setTaskFormData({
                    ...taskFormData, 
                    department: deptName,
                    responsible_person: dept?.supervisor || "",
                    executing_entity: deptName
                  });
                }}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none bg-white transition-all"
              >
                {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">الحالة</label>
              <select 
                value={taskFormData.status}
                onChange={e => setTaskFormData({...taskFormData, status: e.target.value as any})}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none bg-white transition-all"
              >
                {Object.entries(TASK_STATUS_LABELS).map(([key, {label}]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">الأولوية</label>
              <select 
                value={taskFormData.priority}
                onChange={e => setTaskFormData({...taskFormData, priority: e.target.value as any})}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none bg-white transition-all"
              >
                {Object.entries(TASK_PRIORITY_LABELS).map(([key, {label}]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">الملاحظات</label>
              <textarea 
                value={taskFormData.notes}
                onChange={e => setTaskFormData({...taskFormData, notes: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none h-24 resize-none transition-all"
                placeholder="أي ملاحظات إضافية..."
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold text-lg hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-3 active:scale-[0.98] mt-4"
          >
            <Save className="w-6 h-6" />
            حفظ المهمة
          </button>
        </form>
      </div>
    </div>
  );

  const renderTaskMonitor = () => {
    const filteredTasks = tasks.filter(t => {
      const deptMatch = selectedDept === "الكل" || t.department === selectedDept;
      const statusMatch = selectedStatus === "الكل" || t.status === selectedStatus;
      return deptMatch && statusMatch;
    });

    const calculateDelay = (dueDate: string, actualDate?: string) => {
      const due = new Date(dueDate);
      const actual = actualDate ? new Date(actualDate) : new Date();
      if (actual <= due) return 0;
      const diffTime = actual.getTime() - due.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const isDelayed = (task: Task) => {
      if (task.status === 'completed' && task.actual_completion_date) {
        return new Date(task.actual_completion_date) > new Date(task.due_date);
      }
      return task.status !== 'completed' && new Date() > new Date(task.due_date);
    };
    
    return (
      <div className="space-y-6" dir="rtl">
        {selectedDeptInfo && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex flex-wrap items-center gap-6 no-print"
          >
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-bold text-emerald-900">المسؤول المباشر:</span>
              <span className="text-sm text-emerald-700">{selectedDeptInfo.supervisor || "غير محدد"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-bold text-emerald-900">رقم الهاتف:</span>
              <span className="text-sm text-emerald-700">{selectedDeptInfo.phone || "غير محدد"}</span>
            </div>
          </motion.div>
        )}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between no-print w-full">
          <div className="flex flex-col md:flex-row gap-4 w-full md:flex-1 min-w-0">
            <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm overflow-x-auto no-scrollbar flex-nowrap w-full md:flex-1 min-w-0 touch-pan-x select-none cursor-grab active:cursor-grabbing">
              <button 
                onClick={() => setSelectedDept("الكل")}
                className={cn(
                  "px-6 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap shrink-0",
                  selectedDept === "الكل" ? "bg-emerald-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
                )}
              >
                جميع الأقسام
              </button>
              {departments.map(dept => (
                <button 
                  key={dept.id}
                  onClick={() => setSelectedDept(dept.name)}
                  className={cn(
                    "px-6 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap shrink-0",
                    selectedDept === dept.name ? "bg-emerald-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
                  )}
                >
                  {dept.name}
                </button>
              ))}
              <div className="w-4 shrink-0" /> {/* Padding at the end of scroll */}
            </div>

            <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm overflow-x-auto no-scrollbar flex-nowrap w-full md:w-auto shrink-0 touch-pan-x select-none cursor-grab active:cursor-grabbing">
              <button 
                onClick={() => setSelectedStatus("الكل")}
                className={cn(
                  "px-6 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap shrink-0",
                  selectedStatus === "الكل" ? "bg-amber-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
                )}
              >
                جميع الحالات
              </button>
              {Object.entries(TASK_STATUS_LABELS).map(([key, {label}]) => (
                <button 
                  key={key}
                  onClick={() => setSelectedStatus(key)}
                  className={cn(
                    "px-6 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap shrink-0",
                    selectedStatus === key ? "bg-amber-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
                  )}
                >
                  {label}
                </button>
              ))}
              <div className="w-4 shrink-0" /> {/* Padding at the end of scroll */}
            </div>
          </div>

          <div className="flex items-center gap-3 no-print">
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all shadow-sm whitespace-nowrap"
            >
              <Printer className="w-4 h-4" />
              طباعة
            </button>
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
              <button 
                onClick={() => setTaskViewMode("grid")}
                className={cn("p-2 rounded-lg transition-all", taskViewMode === "grid" ? "bg-white shadow-sm text-emerald-600" : "text-gray-400")}
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setTaskViewMode("table")}
                className={cn("p-2 rounded-lg transition-all", taskViewMode === "table" ? "bg-white shadow-sm text-emerald-600" : "text-gray-400")}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {taskViewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTasks.map(task => {
              const delayed = isDelayed(task);
              const delayDays = calculateDelay(task.due_date, task.actual_completion_date);

              return (
                <motion.div 
                  layout
                  key={task.id}
                  className={cn(
                    "bg-white rounded-3xl border shadow-sm p-6 hover:shadow-md transition-shadow relative overflow-hidden",
                    delayed ? "border-red-200 bg-red-50/10" : "border-gray-100"
                  )}
                >
                  {delayed && (
                    <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
                  )}
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-gray-400 uppercase">رقم المهمة: {task.task_number}</span>
                      <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold w-fit", TASK_STATUS_LABELS[task.status].color)}>
                        {TASK_STATUS_LABELS[task.status].label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setEditingTask(task);
                          setShowEditModal(true);
                        }}
                        className="p-2 bg-gray-50 text-gray-400 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-all no-print"
                        title="تعديل المهمة"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <span className={cn("text-xs font-bold", TASK_PRIORITY_LABELS[task.priority].color)}>
                        {TASK_PRIORITY_LABELS[task.priority].label}
                      </span>
                    </div>
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">{task.title}</h4>
                  <p className="text-gray-500 text-sm mb-4 line-clamp-2">{task.description}</p>
                  
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="font-bold text-gray-700">المسؤول:</span>
                      <span>{task.responsible_person}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="font-bold text-gray-700">الجهة المنفذة:</span>
                      <span>{task.executing_entity}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="font-bold text-gray-700">جهة التوجيه:</span>
                      <span>{task.issuing_entity}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50 mt-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-gray-400 uppercase font-bold">تاريخ الاستحقاق</span>
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Calendar className="w-3 h-3" />
                          {task.due_date}
                        </div>
                      </div>
                      {task.status === 'completed' && task.actual_completion_date && (
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-emerald-500 uppercase font-bold">الإنجاز الفعلي</span>
                          <div className="flex items-center gap-1 text-xs text-emerald-600">
                            <CheckCircle2 className="w-3 h-3" />
                            {task.actual_completion_date}
                          </div>
                        </div>
                      )}
                    </div>

                    {delayed && (
                      <div className="mt-3 p-2 bg-red-50 rounded-xl flex items-center justify-between">
                        <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          مهمة متأخرة
                        </span>
                        <span className="text-xs font-black text-red-700">
                          {delayDays} يوم تأخير
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-gray-50 no-print">
                    {task.status !== 'completed' && (
                      <button 
                        onClick={() => updateTaskStatus(task.id!, task.status === 'pending' ? 'in_progress' : 'completed')}
                        className="flex-1 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors"
                      >
                        {task.status === 'pending' ? 'بدء العمل' : 'إكمال المهمة'}
                      </button>
                    )}
                    {task.status === 'completed' && (
                      <div className="flex-1 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        تم الإنجاز
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">رقم المهمة</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">المهمة</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">المسؤول</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">الجهة المنفذة</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">تاريخ الاستحقاق</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">الإنجاز الفعلي</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">التأخير</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">الحالة</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase no-print">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredTasks.map(task => {
                    const delayed = isDelayed(task);
                    const delayDays = calculateDelay(task.due_date, task.actual_completion_date);
                    
                    return (
                      <tr 
                        key={task.id} 
                        className={cn(
                          "hover:bg-gray-50/50 transition-colors",
                          delayed ? "bg-red-50/20" : ""
                        )}
                      >
                        <td className="px-6 py-4 text-sm font-bold text-gray-500">
                          {task.task_number}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900">{task.title}</div>
                          <div className="text-xs text-gray-400">{task.department}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{task.responsible_person}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{task.executing_entity}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{task.due_date}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {task.actual_completion_date || "-"}
                        </td>
                        <td className="px-6 py-4">
                          {delayed ? (
                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-black">
                              {delayDays} يوم
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold", TASK_STATUS_LABELS[task.status].color)}>
                            {TASK_STATUS_LABELS[task.status].label}
                          </span>
                        </td>
                        <td className="px-6 py-4 no-print">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => {
                                setEditingTask(task);
                                setShowEditModal(true);
                              }}
                              className="p-2 bg-gray-50 text-gray-400 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                              title="تعديل المهمة"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            {task.status !== 'completed' ? (
                              <button 
                                onClick={() => updateTaskStatus(task.id!, task.status === 'pending' ? 'in_progress' : 'completed')}
                                className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                                title={task.status === 'pending' ? 'بدء العمل' : 'إكمال المهمة'}
                              >
                                {task.status === 'pending' ? <Play className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                              </button>
                            ) : (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {filteredTasks.length === 0 && (
          <div className="col-span-full py-20 text-center text-gray-400">
            <ListTodo className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>لا توجد مهام حالية تطابق الفلاتر المختارة</p>
          </div>
        )}
      </div>
    );
  };
  const renderDashboard = () => (
    <div className="space-y-8" dir="rtl">
      {/* Filters & Action */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 no-print w-full">
        <div className="flex flex-col md:flex-row gap-4 w-full md:flex-1 min-w-0">
          {/* Dept Filter */}
          <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm overflow-x-auto no-scrollbar flex-nowrap w-full md:flex-1 min-w-0 touch-pan-x select-none cursor-grab active:cursor-grabbing">
            <button 
              onClick={() => setSelectedDept("الكل")}
              className={cn(
                "px-5 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap shrink-0",
                selectedDept === "الكل" ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              جميع الأقسام
            </button>
            {departments.map(dept => (
              <button 
                key={dept.id}
                onClick={() => setSelectedDept(dept.name)}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap shrink-0",
                  selectedDept === dept.name ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:bg-slate-50"
                )}
              >
                {dept.name}
              </button>
            ))}
            <div className="w-4 shrink-0" />
          </div>

          {/* Month Filter */}
          <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm min-w-[220px]">
            <div className="p-2 bg-slate-50 rounded-lg">
              <Filter className="w-4 h-4 text-slate-400" />
            </div>
            <select 
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="w-full bg-transparent text-sm font-black text-slate-900 outline-none cursor-pointer"
            >
              <option value="الكل">جميع الفترات الزمنية</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex gap-3 no-print">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-3.5 bg-white text-slate-700 border border-slate-200 rounded-2xl font-black hover:bg-slate-50 transition-all shadow-sm whitespace-nowrap text-sm"
          >
            <Printer className="w-5 h-5" />
            تصدير التقرير
          </button>
          <button 
            onClick={() => setActiveTab("entry")}
            className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 whitespace-nowrap text-sm"
          >
            <PlusCircle className="w-5 h-5" />
            إدخال البيانات
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      {selectedDeptInfo && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-indigo-900 border border-indigo-800 p-5 rounded-3xl flex flex-wrap items-center gap-8 no-print shadow-xl shadow-indigo-100"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">المسؤول المباشر</p>
              <p className="text-sm font-black text-white">{selectedDeptInfo.supervisor || "غير محدد"}</p>
            </div>
          </div>
          <div className="w-px h-8 bg-white/10 hidden md:block" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">رقم التواصل</p>
              <p className="text-sm font-black text-white">{selectedDeptInfo.phone || "غير محدد"}</p>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiIndicators
          .filter(i => i.is_active === 1 && (selectedDept === "الكل" || i.department_id === departments.find(d => d.name === selectedDept)?.id))
          .map((ind, idx) => {
            let value: string | number = 0;
            if (latestData && ind.code && latestData[ind.code] !== undefined) {
              value = latestData[ind.code];
              if (ind.type === "Percentage") {
                value = `${Number(value).toFixed(1)}%`;
              } else if (ind.type === "Rate") {
                value = `${Number(value).toFixed(2)}`;
              } else if (ind.type === "Time") {
                value = `${Number(value).toFixed(0)} د`;
              } else {
                value = Number(value).toFixed(0);
              }
            }
            const colors = [
              "bg-blue-50 text-blue-700",
              "bg-emerald-50 text-emerald-700",
              "bg-amber-50 text-amber-700",
              "bg-purple-50 text-purple-700",
              "bg-indigo-50 text-indigo-700"
            ];
            const color = colors[idx % colors.length];
            return (
              <StatCard 
                key={ind.id}
                title={ind.name} 
                value={value} 
                icon={<Activity className="w-5 h-5" />} 
                trend={selectedMonth === "الكل" ? "آخر شهر" : selectedMonth}
                color={color}
              />
            );
          })
        }
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {selectedDept !== "الكل" ? (
          kpiIndicators.filter(i => i.department_id === departments.find(d => d.name === selectedDept)?.id && i.is_active === 1).map((ind, idx) => (
            <ChartContainer key={ind.code} title={`${ind.name} - ${selectedDept}`}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dashboardDisplayData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey={ind.code} name={ind.name} stroke={['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6'][idx % 5]} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          ))
        ) : (
          kpiIndicators.filter(i => i.is_active === 1).slice(0, 4).map((ind, idx) => {
            const chartData = departments.map(dept => {
              const latestMonth = data[data.length - 1]?.month;
              const deptData = data.find(d => d.department === dept.name && d.month === latestMonth);
              return {
                name: dept.name,
                value: deptData ? deptData[ind.code!] || 0 : 0
              };
            });
            return (
              <ChartContainer key={ind.code} title={`مقارنة ${ind.name} بين الأقسام (الشهر الحالي)`}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" name={ind.name} fill={['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6'][idx % 5]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            );
          })
        )}
      </div>

      {/* AI Analysis Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">تحليل الذكاء الاصطناعي لـ {selectedDept}</h3>
              <p className="text-sm text-gray-500">احصل على رؤى وتوصيات ذكية بناءً على بيانات القسم</p>
            </div>
          </div>
          <button 
            onClick={handleAnalyze}
            disabled={analyzing || filteredData.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
            تحليل البيانات
          </button>
        </div>
        <div className="p-6 bg-gray-50/50">
          {aiAnalysis ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="prose prose-indigo max-w-none text-right"
            >
              <Markdown>{aiAnalysis}</Markdown>
            </motion.div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <BrainCircuit className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>اضغط على "تحليل البيانات" للحصول على تقرير مفصل لقسم {selectedDept}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const [expandedSections, setExpandedSections] = useState<string[]>(["utilization", "quality", "experience"]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  const indicatorGroups = [
    {
      id: "utilization",
      title: "مؤشرات الاستخدام والإنتاجية",
      icon: <BarChart3 className="w-5 h-5" />,
      fields: [
        { key: "bed_occupancy", label: INDICATOR_LABELS.bed_occupancy.label, icon: <Users className="w-4 h-4" /> },
        { key: "avg_stay", label: INDICATOR_LABELS.avg_stay.label, icon: <Clock className="w-4 h-4" /> },
        { key: "surgeries", label: INDICATOR_LABELS.surgeries.label, icon: <Stethoscope className="w-4 h-4" /> },
      ]
    },
    {
      id: "quality",
      title: "مؤشرات الجودة والسلامة",
      icon: <Activity className="w-5 h-5" />,
      fields: [
        { key: "mortality_rate", label: INDICATOR_LABELS.mortality_rate.label, icon: <AlertCircle className="w-4 h-4" /> },
        { key: "readmission_rate", label: INDICATOR_LABELS.readmission_rate.label, icon: <History className="w-4 h-4" /> },
      ]
    },
    {
      id: "experience",
      title: "مؤشرات تجربة المريض والخدمة",
      icon: <Users className="w-5 h-5" />,
      fields: [
        { key: "satisfaction", label: INDICATOR_LABELS.satisfaction.label, icon: <Activity className="w-4 h-4" /> },
        { key: "er_wait_time", label: INDICATOR_LABELS.er_wait_time.label, icon: <Clock className="w-4 h-4" /> },
      ]
    }
  ];

  const renderEntry = () => (
    <div className="max-w-4xl mx-auto pb-20" dir="rtl">
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl p-10">
        <div className="flex items-center gap-6 mb-12">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
            <PlusCircle className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">إدخال البيانات الدورية</h2>
            <p className="text-slate-500 font-medium text-lg">تحديث مؤشرات الأداء للأقسام الطبية والإدارية</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Selection Header */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-8 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-inner">
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mr-1">السنة المالية</label>
              <select 
                value={formYear}
                onChange={e => setFormYear(parseInt(e.target.value))}
                className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none bg-white font-black text-slate-900 shadow-sm transition-all"
              >
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mr-1">الفترة (الشهر)</label>
              <select 
                value={formMonth}
                onChange={e => setFormMonth(parseInt(e.target.value))}
                className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none bg-white font-black text-slate-900 shadow-sm transition-all"
              >
                {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{new Intl.DateTimeFormat('ar-EG', {month: 'long'}).format(new Date(2024, m-1))}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mr-1">القسم المستهدف</label>
              <select 
                required
                value={formData.department}
                onChange={e => setFormData({...formData, department: e.target.value})}
                className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none bg-white font-black text-slate-900 shadow-sm transition-all"
              >
                {departments.map(dept => (
                  <option key={dept.id} value={dept.name}>{dept.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Patient Details (Optional for alerts) */}
          <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100">
            <label className="block text-sm font-semibold text-amber-900 mb-2 flex items-center gap-2">
              <Users className="w-4 h-4" />
              اسم المريض (اختياري - في حال وجود حالة تستدعي التنبيه)
            </label>
            <input 
              type="text"
              value={formData.patient_name}
              onChange={e => setFormData({...formData, patient_name: e.target.value})}
              placeholder="مثال: محمد أحمد"
              className="w-full px-4 py-2.5 rounded-xl border border-amber-200 focus:ring-2 focus:ring-amber-500 outline-none bg-white font-medium"
            />
          </div>

          {/* Dynamic Indicators Section */}
          <div className="space-y-4">
            {kpiIndicators.filter(i => i.department_id === departments.find(d => d.name === formData.department)?.id && i.is_active === 1).length === 0 ? (
              <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-gray-500 font-medium">لا توجد مؤشرات مفعلة لهذا القسم.</p>
              </div>
            ) : (
              <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-6 bg-gray-50/30 border-t border-gray-50 space-y-8">
                  {kpiIndicators.filter(i => i.department_id === departments.find(d => d.name === formData.department)?.id && i.is_active === 1).map((ind) => (
                    <div key={ind.code} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                        <div className="flex items-center gap-2 text-indigo-600">
                          <Activity className="w-5 h-5" />
                          <span className="font-bold text-sm">{ind.name}</span>
                        </div>
                        <div className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold">
                          النتيجة: {(formData[ind.code!] || 0).toFixed(2)} {ind.type === 'Percentage' ? '%' : ''}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-500 mr-1">البسط</label>
                          <input 
                            type="number" 
                            step="0.01"
                            required
                            value={formData[`${ind.code}_num`] || ''}
                            onChange={e => handleIndicatorChange(ind.code!, 'num', parseFloat(e.target.value) || 0)}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-500 mr-1">المقام</label>
                          <input 
                            type="number" 
                            step="0.01"
                            required
                            value={formData[`${ind.code}_den`] || ''}
                            onChange={e => handleIndicatorChange(ind.code!, 'den', parseFloat(e.target.value) || 0)}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      {ind.description && (
                        <p className="text-xs text-gray-400 mt-2">{ind.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-6">
            <button 
              type="submit"
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              <Save className="w-6 h-6" />
              حفظ البيانات وإرسالها
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden" dir="rtl">
      <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/50">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3 text-slate-600">
            <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
              <Filter className="w-4 h-4 text-slate-400" />
            </div>
            <span className="text-sm font-black text-slate-900">تصفية الأقسام:</span>
            <select 
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="px-5 py-2 rounded-xl border border-slate-200 text-sm font-bold outline-none bg-white shadow-sm focus:ring-4 focus:ring-indigo-500/10 transition-all"
            >
              <option value="الكل">جميع الأقسام الطبية</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.name}>{dept.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">تصفية حسب الشهر:</span>
            <select 
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="px-4 py-1.5 rounded-lg border border-gray-200 text-sm outline-none bg-white"
            >
              <option value="الكل">جميع الأشهر</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="text-xs text-gray-500 font-medium">
          عدد السجلات: {filteredData.length}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-right">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">الشهر</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">القسم</th>
              {kpiIndicators.filter(i => selectedDept === "الكل" || i.department_id === departments.find(d => d.name === selectedDept)?.id).filter(i => i.is_active === 1).map(item => (
                <th key={item.code} className="px-6 py-4 text-sm font-semibold text-gray-600 whitespace-nowrap">{item.name}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {[...filteredData].reverse().map((row, i) => (
              <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">{row.month}</td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold">
                    {row.department}
                  </span>
                </td>
                {kpiIndicators.filter(ind => selectedDept === "الكل" || ind.department_id === departments.find(d => d.name === selectedDept)?.id).filter(ind => ind.is_active === 1).map(item => (
                  <td key={item.code} className="px-6 py-4 text-gray-600">
                    {row[item.code!] !== undefined ? `${Number(row[item.code!]).toFixed(2)}${item.type === 'Percentage' ? '%' : ''}` : '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderEditModal = () => {
    if (!editingTask) return null;
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4" dir="rtl">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
            <h3 className="text-xl font-bold flex items-center gap-2 text-gray-900">
              <Pencil className="w-5 h-5 text-indigo-600" />
              تعديل المهمة: {editingTask.task_number}
            </h3>
            <button 
              onClick={() => {
                setShowEditModal(false);
                setEditingTask(null);
              }}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>
          
          <form onSubmit={handleTaskUpdate} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">رقم المهمة</label>
                <input 
                  required
                  type="text"
                  value={editingTask.task_number}
                  onChange={e => setEditingTask({...editingTask, task_number: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">عنوان المهمة</label>
                <input 
                  required
                  type="text"
                  value={editingTask.title}
                  onChange={e => setEditingTask({...editingTask, title: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-2">تفاصيل المهمة</label>
                <textarea 
                  value={editingTask.description}
                  onChange={e => setEditingTask({...editingTask, description: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">المسؤول عن التنفيذ</label>
                <select 
                  required
                  value={editingTask.responsible_person}
                  onChange={e => setEditingTask({...editingTask, responsible_person: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none bg-white transition-all"
                >
                  <option value="">اختر المسؤول عن التنفيذ...</option>
                  {uniqueSupervisors.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">الجهة المنفذة</label>
                <select 
                  value={editingTask.executing_entity}
                  onChange={e => setEditingTask({...editingTask, executing_entity: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none bg-white transition-all"
                >
                  <option value="">اختر الجهة المنفذة...</option>
                  {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">تاريخ الاستحقاق</label>
                <input 
                  type="date"
                  value={editingTask.due_date}
                  onChange={e => setEditingTask({...editingTask, due_date: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">الأولوية</label>
                <select 
                  value={editingTask.priority}
                  onChange={e => setEditingTask({...editingTask, priority: e.target.value as any})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none bg-white transition-all"
                >
                  {Object.entries(TASK_PRIORITY_LABELS).map(([key, {label}]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex gap-4 pt-4">
              <button 
                type="submit"
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
              >
                حفظ التعديلات
              </button>
              <button 
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingTask(null);
                }}
                className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all"
              >
                إلغاء
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC] text-gray-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden flex flex-col lg:flex-row-reverse" dir="rtl">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-slate-100 p-4 flex items-center justify-between sticky top-0 z-50 no-print">
        <div className="flex-1 text-right">
          <span className="font-bold text-sm text-slate-700 leading-tight block">وزارة الصحة</span>
          <span className="font-black text-xs text-indigo-600 truncate block max-w-[120px]">{hospitalSettings.name}</span>
        </div>
        <div className="flex-shrink-0 mx-2">
          {hospitalSettings.logo ? (
            <img src={hospitalSettings.logo} alt="Logo" className="w-10 h-10 object-contain" />
          ) : (
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <Activity className="w-6 h-6" />
            </div>
          )}
        </div>
        <div className="flex-1 text-left flex justify-end items-center gap-2">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 hover:bg-slate-50 rounded-xl transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Global Sidebar (Desktop) */}
      <aside className="hidden lg:flex flex-col w-72 bg-white border-l border-slate-100 shadow-2xl sticky top-0 h-screen p-6 no-print">
        <div className="flex items-center gap-4 mb-12 px-2">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <Activity className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight leading-tight">نظام ريمكس</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">الإدارة المتكاملة</p>
          </div>
        </div>

        <nav className="space-y-2 flex-1">
          <NavItem 
            active={viewState === "home"} 
            onClick={() => setViewState("home")}
            icon={<Home className="w-5 h-5" />}
            label="الرئيسية"
          />
          <NavItem 
            active={viewState === "app" || viewState === "indicators_menu" || viewState === "kpi_management"} 
            onClick={() => setViewState("indicators_menu")}
            icon={<BarChart3 className="w-5 h-5" />}
            label="مؤشرات الأداء"
          />
          <NavItem 
            active={viewState === "tasks_app" || viewState === "tasks_menu"} 
            onClick={() => setViewState("tasks_menu")}
            icon={<ListTodo className="w-5 h-5" />}
            label="إدارة المهام"
            color="emerald"
          />
          <NavItem 
            active={viewState === "risks"} 
            onClick={() => setViewState("risks")}
            icon={<ShieldAlert className="w-5 h-5" />}
            label="إدارة المخاطر"
            color="red"
          />
          <NavItem 
            active={viewState === "mail"} 
            onClick={() => setViewState("mail")}
            icon={<Mail className="w-5 h-5" />}
            label="الاتصالات الإدارية"
            color="indigo"
          />
          <NavItem 
            active={viewState === "users"} 
            onClick={() => setViewState("users")}
            icon={<Users className="w-5 h-5" />}
            label="المستخدمين والصلاحيات"
            color="blue"
          />
          <NavItem 
            active={viewState === "settings"} 
            onClick={() => setViewState("settings")}
            icon={<Settings className="w-5 h-5" />}
            label="الإعدادات"
            color="slate"
          />
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-50">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-white shadow-sm flex-shrink-0 bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-slate-900 truncate">{user?.full_name}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase truncate">{user?.role_name || 'مستخدم'}</p>
            </div>
            <button 
              onClick={() => setUser(null)}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="تسجيل الخروج"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] lg:hidden"
            />
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-4/5 max-w-sm bg-white z-[70] p-8 lg:hidden shadow-2xl"
            >
              <div className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                    <Activity className="w-6 h-6" />
                  </div>
                  <span className="font-black text-xl tracking-tight">القائمة</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-slate-50 rounded-xl">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <nav className="space-y-4">
                <NavItem 
                  active={viewState === "home"} 
                  onClick={() => { setViewState("home"); setIsMobileMenuOpen(false); }}
                  icon={<Home className="w-6 h-6" />}
                  label="الرئيسية"
                />
                <NavItem 
                  active={viewState === "app" || viewState === "indicators_menu" || viewState === "kpi_management"} 
                  onClick={() => { setViewState("indicators_menu"); setIsMobileMenuOpen(false); }}
                  icon={<BarChart3 className="w-6 h-6" />}
                  label="مؤشرات الأداء"
                />
                <NavItem 
                  active={viewState === "tasks_app" || viewState === "tasks_menu"} 
                  onClick={() => { setViewState("tasks_menu"); setIsMobileMenuOpen(false); }}
                  icon={<ListTodo className="w-6 h-6" />}
                  label="إدارة المهام"
                  color="emerald"
                />
                <NavItem 
                  active={viewState === "risks"} 
                  onClick={() => { setViewState("risks"); setIsMobileMenuOpen(false); }}
                  icon={<ShieldAlert className="w-6 h-6" />}
                  label="إدارة المخاطر"
                  color="red"
                />
                <NavItem 
                  active={viewState === "mail"} 
                  onClick={() => { setViewState("mail"); setIsMobileMenuOpen(false); }}
                  icon={<Mail className="w-6 h-6" />}
                  label="الاتصالات الإدارية"
                  color="indigo"
                />
                <NavItem 
                  active={viewState === "users"} 
                  onClick={() => { setViewState("users"); setIsMobileMenuOpen(false); }}
                  icon={<Users className="w-6 h-6" />}
                  label="المستخدمين والصلاحيات"
                  color="blue"
                />
                <NavItem 
                  active={viewState === "settings"} 
                  onClick={() => { setViewState("settings"); setIsMobileMenuOpen(false); }}
                  icon={<Settings className="w-6 h-6" />}
                  label="الإعدادات"
                  color="slate"
                />
              </nav>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-white shadow-sm flex-shrink-0 bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                    {user?.full_name?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-900 truncate">{user?.full_name}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase truncate">{user?.role_name || 'مستخدم'}</p>
                  </div>
                  <button 
                    onClick={() => { setUser(null); setIsMobileMenuOpen(false); }}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="تسجيل الخروج"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen relative">
        {/* Alerts Overlay */}
        <div className="fixed top-4 left-4 z-50 w-80 space-y-3 pointer-events-none">
          <AnimatePresence>
            {alerts.map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -50, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                className="bg-white border-l-4 border-red-500 shadow-2xl rounded-2xl p-4 pointer-events-auto relative overflow-hidden group"
                dir="rtl"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-red-50 rounded-xl text-red-600">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-right">
                    <h4 className="font-bold text-red-900 text-sm">{alert.message}</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      المؤشر: <span className="font-semibold text-gray-700">{alert.indicator}</span> ({alert.value.toFixed(1)})
                    </p>
                    <p className="text-xs text-gray-500">
                      القسم: <span className="font-semibold text-gray-700">{alert.department}</span>
                    </p>
                    {alert.patient && (
                      <p className="text-xs text-indigo-600 mt-1 font-medium bg-indigo-50 px-2 py-1 rounded-lg inline-block">
                        المريض: {alert.patient}
                      </p>
                    )}
                  </div>
                  <button 
                    onClick={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <ChevronRight className="w-4 h-4 rotate-90" />
                  </button>
                </div>
                <div className="absolute bottom-0 left-0 h-1 bg-red-500/20 w-full">
                  <motion.div 
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: 10, ease: "linear" }}
                    onAnimationComplete={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))}
                    className="h-full bg-red-500"
                  />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          {viewState === "home" && (
            <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1">
              {renderHome()}
            </motion.div>
          )}
          {viewState === "settings" && (
            <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1">
              {renderSettings()}
            </motion.div>
          )}
          {viewState === "indicators_menu" && (
            <motion.div key="indicators_menu" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1">
              {renderIndicatorsMenu()}
            </motion.div>
          )}
          {viewState === "kpi_management" && (
            <motion.div key="kpi_management" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1">
              {renderKpiManagement()}
            </motion.div>
          )}
          {viewState === "tasks_menu" && (
            <motion.div key="tasks_menu" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1">
              {renderTasksMenu()}
            </motion.div>
          )}
          {viewState === "risks" && (
            <motion.div key="risks" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1">
              <div className="p-6 md:p-12 max-w-7xl mx-auto" dir="rtl">
                <div className="mb-12">
                  <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">إدارة المخاطر</h1>
                  <p className="text-slate-500 text-lg font-medium">نظام رصد وتحليل المخاطر المؤسسية والسريرية.</p>
                </div>
                <div className="bg-white p-12 rounded-[2.5rem] border border-slate-100 shadow-sm text-center">
                  <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center text-red-600 mx-auto mb-6">
                    <ShieldAlert className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-4">قريباً: وحدة إدارة المخاطر</h3>
                  <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
                    نحن نعمل حالياً على تطوير هذه الوحدة لتشمل سجل المخاطر، مصفوفة التقييم، وخطط المعالجة والمتابعة.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
          {viewState === "mail" && (
            <motion.div key="mail" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full min-w-0">
              <MailManagement departments={departments} />
            </motion.div>
          )}
          {viewState === "users" && (
            <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full min-w-0">
              <UserManagement departments={departments} />
            </motion.div>
          )}
          {viewState === "app" && (
            <motion.div 
              key="app"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex"
            >
              {/* Internal Sidebar for Indicators */}
              <div className="hidden xl:flex flex-col w-64 bg-slate-50 border-l border-slate-100 p-6 no-print">
                <div className="mb-8">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">أدوات المؤشرات</h3>
                  <nav className="space-y-1">
                    <NavItem 
                      active={activeTab === "dashboard"} 
                      onClick={() => setActiveTab("dashboard")}
                      icon={<LayoutDashboard className="w-4 h-4" />}
                      label="لوحة المؤشرات"
                    />
                    <NavItem 
                      active={activeTab === "entry"} 
                      onClick={() => setActiveTab("entry")}
                      icon={<PlusCircle className="w-4 h-4" />}
                      label="إدخال البيانات"
                    />
                    <NavItem 
                      active={activeTab === "history"} 
                      onClick={() => setActiveTab("history")}
                      icon={<History className="w-4 h-4" />}
                      label="سجل البيانات"
                    />
                  </nav>
                </div>
              </div>

              {/* Main Content */}
              <main className="flex-1 p-4 md:p-8 lg:p-12 w-full">
                {/* Print Only Header */}
                <div className="hidden print:flex mb-12 items-center justify-between border-b-2 border-slate-200 pb-8" dir="rtl">
                  <div className="text-right flex-1">
                    {hospitalSettings.header_right_text?.split('\n').map((line, i) => (
                      <h3 key={i} className="font-bold text-lg">{line}</h3>
                    ))}
                    <h3 className="font-bold text-lg">{hospitalSettings.name}</h3>
                  </div>
                  <div className="flex-shrink-0 mx-8">
                    {hospitalSettings.logo ? (
                      <img src={hospitalSettings.logo} alt="Logo" className="w-24 h-24 object-contain" />
                    ) : (
                      <div className="w-24 h-24 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                        <Activity className="w-12 h-12" />
                      </div>
                    )}
                  </div>
                  <div className="text-left flex-1">
                    {hospitalSettings.header_left_text?.split('\n').map((line, i) => (
                      <h3 key={i} className="font-bold text-lg">{line}</h3>
                    ))}
                    <h1 className="text-2xl font-black mb-2 mt-4">تقرير مؤشرات الأداء</h1>
                    <p className="text-slate-500 font-medium">التاريخ: {new Date().toLocaleDateString('ar-EG')}</p>
                  </div>
                </div>

                <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6 no-print" dir="rtl">
                  <div className="flex items-center gap-6">
                    <button 
                      onClick={() => setViewState("indicators_menu")}
                      className="p-4 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm group"
                      title="العودة لقائمة المؤشرات"
                    >
                      <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <div>
                      <h2 className="text-4xl font-black text-slate-900 tracking-tight">
                        {activeTab === "dashboard" && "واجهة الاستعراض والتحليل"}
                        {activeTab === "entry" && "واجهة إدخال قيم المؤشرات"}
                        {activeTab === "history" && "سجل البيانات التاريخي"}
                      </h2>
                      <p className="text-slate-500 mt-1 font-medium">نظام إدارة وتحليل مؤشرات الأداء الصحي بالمستشفى</p>
                    </div>
                  </div>
                </header>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {loading ? (
                      <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                      </div>
                    ) : (
                      <>
                        {activeTab === "dashboard" && renderDashboard()}
                        {activeTab === "entry" && renderEntry()}
                        {activeTab === "history" && renderHistory()}
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>
              </main>
            </motion.div>
          )}

          {viewState === "tasks_app" && (
            <motion.div 
              key="tasks_app"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex"
            >
              {/* Internal Sidebar for Tasks */}
              <div className="hidden xl:flex flex-col w-64 bg-slate-50 border-l border-slate-100 p-6 no-print">
                <div className="mb-8">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">أدوات المهام</h3>
                  <nav className="space-y-1">
                    <NavItem 
                      active={activeTaskTab === "monitor"} 
                      onClick={() => setActiveTaskTab("monitor")}
                      icon={<LayoutDashboard className="w-4 h-4" />}
                      label="متابعة المهام"
                      color="emerald"
                    />
                    <NavItem 
                      active={activeTaskTab === "entry"} 
                      onClick={() => setActiveTaskTab("entry")}
                      icon={<PlusCircle className="w-4 h-4" />}
                      label="إضافة مهمة"
                      color="emerald"
                    />
                  </nav>
                </div>
              </div>

              {/* Main Content */}
              <main className="flex-1 p-4 md:p-8 lg:p-12 w-full">
                {/* Print Only Header */}
                <div className="hidden print:flex mb-12 items-center justify-between border-b-2 border-slate-200 pb-8" dir="rtl">
                  <div className="text-right flex-1">
                    {hospitalSettings.header_right_text?.split('\n').map((line, i) => (
                      <h3 key={i} className="font-bold text-lg">{line}</h3>
                    ))}
                    <h3 className="font-bold text-lg">{hospitalSettings.name}</h3>
                  </div>
                  <div className="flex-shrink-0 mx-8">
                    {hospitalSettings.logo ? (
                      <img src={hospitalSettings.logo} alt="Logo" className="w-24 h-24 object-contain" />
                    ) : (
                      <div className="w-24 h-24 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                        <Activity className="w-12 h-12" />
                      </div>
                    )}
                  </div>
                  <div className="text-left flex-1">
                    {hospitalSettings.header_left_text?.split('\n').map((line, i) => (
                      <h3 key={i} className="font-bold text-lg">{line}</h3>
                    ))}
                    <h1 className="text-2xl font-black mb-2 mt-4">تقرير المهام اليومية</h1>
                    <p className="text-slate-500 font-medium">التاريخ: {new Date().toLocaleDateString('ar-EG')}</p>
                  </div>
                </div>

                <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6 no-print" dir="rtl">
                  <div className="flex items-center gap-6">
                    <button 
                      onClick={() => setViewState("tasks_menu")}
                      className="p-4 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm group"
                    >
                      <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <div>
                      <h2 className="text-4xl font-black text-slate-900 tracking-tight">
                        {activeTaskTab === "monitor" && "لوحة متابعة المهام"}
                        {activeTaskTab === "entry" && "إضافة مهمة جديدة"}
                      </h2>
                      <p className="text-slate-500 mt-1 font-medium">إدارة وتوزيع المهام اليومية للأقسام الطبية</p>
                    </div>
                  </div>
                </header>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTaskTab}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {tasksLoading ? (
                      <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                      </div>
                    ) : (
                      <>
                        {activeTaskTab === "monitor" && renderTaskMonitor()}
                        {activeTaskTab === "entry" && renderTaskEntry()}
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>
              </main>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {showEditModal && renderEditModal()}
    </div>
  );
}

function MenuCard({ title, description, icon, onClick, color }: { title: string, description: string, icon: React.ReactNode, onClick: () => void, color: string }) {
  const colorClasses = {
    indigo: "hover:border-indigo-200 hover:bg-indigo-50/30",
    emerald: "hover:border-emerald-200 hover:bg-emerald-50/30",
    red: "hover:border-red-200 hover:bg-red-50/30",
    slate: "hover:border-slate-200 hover:bg-slate-50/30",
  }[color as keyof typeof colorClasses] || "hover:border-indigo-200 hover:bg-indigo-50/30";

  return (
    <button 
      onClick={onClick}
      className={cn(
        "text-right p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm transition-all duration-300 group",
        colorClasses
      )}
    >
      <div className="mb-6 transform group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-xl font-black text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 font-medium leading-relaxed">{description}</p>
    </button>
  );
}

function NavItem({ active, onClick, icon, label, color = "indigo" }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, color?: "indigo" | "emerald" | "slate" | "red" }) {
  const activeClasses = {
    indigo: "bg-slate-900 text-white shadow-xl shadow-slate-200",
    emerald: "bg-emerald-900 text-white shadow-xl shadow-emerald-200",
    slate: "bg-slate-700 text-white shadow-xl shadow-slate-200",
    red: "bg-red-900 text-white shadow-xl shadow-red-200",
  }[color];
    
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group",
        active 
          ? activeClasses
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      <div className={cn("transition-transform duration-300", active && "scale-110")}>
        {icon}
      </div>
      <span className="font-semibold text-sm">{label}</span>
      {active && <div className="w-1.5 h-1.5 rounded-full bg-white mr-auto" />}
    </button>
  );
}

function StatCard({ title, value, icon, trend, color }: { title: string, value: string | number, icon: React.ReactNode, trend: string, color: string }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <div className="flex items-center justify-between mb-6">
        <div className={cn("p-3 rounded-2xl shadow-inner", color)}>
          {icon}
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">الحالة</span>
          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 border border-slate-100">
            {trend}
          </span>
        </div>
      </div>
      <div>
        <h4 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">{title}</h4>
        <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
      </div>
    </div>
  );
}

function ChartContainer({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <div className="w-2 h-6 bg-indigo-600 rounded-full" />
          {title}
        </h3>
      </div>
      <div className="w-full">
        {children}
      </div>
    </div>
  );
}
