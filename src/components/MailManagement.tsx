import React, { useState, useEffect } from "react";
import { 
  Mail, Plus, Search, Filter, FileText, Image as ImageIcon, 
  Calendar, Building2, User, CheckCircle2, Clock, Archive,
  X, Save, Loader2, Download, Trash2, Edit
} from "lucide-react";
import { Mail as MailType, Department } from "../types";
import { cn } from "../lib/utils";

interface MailManagementProps {
  departments: Department[];
}

export default function MailManagement({ departments }: MailManagementProps) {
  const [mails, setMails] = useState<MailType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMail, setEditingMail] = useState<MailType | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "incoming" | "outgoing">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "processed" | "archived">("all");
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<Partial<MailType>>({
    reference_number: "",
    type: "incoming",
    subject: "",
    sender: "",
    recipient: "",
    date: new Date().toISOString().split('T')[0],
    department_id: undefined,
    status: "pending",
    priority: "medium",
    notes: "",
    image_url: ""
  });

  useEffect(() => {
    fetchMails();
  }, []);

  const fetchMails = async () => {
    try {
      const res = await fetch("/api/mails");
      const json = await res.json();
      setMails(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editingMail ? `/api/mails/${editingMail.id}` : "/api/mails";
      const method = editingMail ? "PATCH" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "حدث خطأ أثناء الحفظ");
      }
      
      await fetchMails();
      setShowAddModal(false);
      setEditingMail(null);
      resetForm();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذه المعاملة؟")) return;
    try {
      await fetch(`/api/mails/${id}`, { method: "DELETE" });
      await fetchMails();
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setFormData({
      reference_number: "",
      type: "incoming",
      subject: "",
      sender: "",
      recipient: "",
      date: new Date().toISOString().split('T')[0],
      department_id: undefined,
      status: "pending",
      priority: "medium",
      notes: "",
      image_url: ""
    });
  };

  const openEditModal = (mail: MailType) => {
    setEditingMail(mail);
    setFormData(mail);
    setShowAddModal(true);
  };

  const filteredMails = mails.filter(mail => {
    const matchesSearch = 
      mail.subject.includes(searchTerm) || 
      mail.reference_number.includes(searchTerm) ||
      mail.sender.includes(searchTerm) ||
      mail.recipient.includes(searchTerm);
    const matchesType = filterType === "all" || mail.type === filterType;
    const matchesStatus = filterStatus === "all" || mail.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'processed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'archived': return 'bg-slate-100 text-slate-800 border-slate-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'قيد الإجراء';
      case 'processed': return 'منجزة';
      case 'archived': return 'مؤرشفة';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-amber-600 bg-amber-50';
      case 'low': return 'text-emerald-600 bg-emerald-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'عاجل جداً';
      case 'medium': return 'عاجل';
      case 'low': return 'عادي';
      default: return priority;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 w-full max-w-full" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Mail className="w-6 h-6 text-indigo-600" />
            نظام الاتصالات الإدارية (الوارد والصادر)
          </h2>
          <p className="text-slate-500 mt-1">إدارة وأرشفة المعاملات والخطابات الرسمية</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingMail(null);
            setShowAddModal(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          معاملة جديدة
        </button>
      </div>

      <div className="glass-card rounded-2xl p-4 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="بحث برقم القيد، الموضوع، الجهة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="all">جميع الأنواع</option>
            <option value="incoming">وارد</option>
            <option value="outgoing">صادر</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="all">جميع الحالات</option>
            <option value="pending">قيد الإجراء</option>
            <option value="processed">منجزة</option>
            <option value="archived">مؤرشفة</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-right min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 text-sm">
                  <th className="p-4 font-semibold">رقم القيد</th>
                  <th className="p-4 font-semibold">النوع</th>
                  <th className="p-4 font-semibold">الموضوع</th>
                  <th className="p-4 font-semibold">الجهة</th>
                  <th className="p-4 font-semibold">التاريخ</th>
                  <th className="p-4 font-semibold">الإحالة</th>
                  <th className="p-4 font-semibold">الحالة</th>
                  <th className="p-4 font-semibold">الأهمية</th>
                  <th className="p-4 font-semibold">المرفق</th>
                  <th className="p-4 font-semibold text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMails.map((mail) => (
                  <tr key={mail.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <span className="font-mono bg-slate-100 px-2 py-1 rounded text-xs text-slate-700">{mail.reference_number}</span>
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-medium border inline-block",
                        mail.type === 'incoming' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                      )}>
                        {mail.type === 'incoming' ? 'وارد' : 'صادر'}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-slate-800 line-clamp-1 max-w-[200px]" title={mail.subject}>
                        {mail.subject}
                      </p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-slate-600 truncate max-w-[150px]" title={mail.type === 'incoming' ? mail.sender : mail.recipient}>
                        {mail.type === 'incoming' ? mail.sender : mail.recipient}
                      </p>
                    </td>
                    <td className="p-4 text-sm text-slate-600 whitespace-nowrap">
                      {mail.date}
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      {(mail as any).department_name || '-'}
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-medium border inline-block whitespace-nowrap",
                        getStatusColor(mail.status)
                      )}>
                        {getStatusLabel(mail.status)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-medium inline-block whitespace-nowrap",
                        getPriorityColor(mail.priority)
                      )}>
                        {getPriorityLabel(mail.priority)}
                      </span>
                    </td>
                    <td className="p-4">
                      {mail.image_url ? (
                        <a 
                          href={mail.image_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 p-1.5 rounded-lg hover:bg-indigo-50 inline-flex transition-colors"
                          title="عرض المرفق"
                        >
                          <ImageIcon className="w-5 h-5" />
                        </a>
                      ) : (
                        <span className="text-slate-300 p-1.5 inline-flex" title="بدون مرفق">
                          <Archive className="w-5 h-5" />
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEditModal(mail)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="تعديل">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(mail.id!)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="حذف">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                
                {filteredMails.length === 0 && (
                  <tr>
                    <td colSpan={10} className="p-12 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Mail className="w-12 h-12 text-slate-300 mb-3" />
                        <p className="text-lg font-medium text-slate-600">لا توجد معاملات</p>
                        <p className="text-sm">لم يتم العثور على أي معاملات تطابق معايير البحث</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 flex-shrink-0">
              <h3 className="text-xl font-bold text-slate-800">
                {editingMail ? 'تعديل المعاملة' : 'إضافة معاملة جديدة'}
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">نوع المعاملة</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="type" 
                        value="incoming"
                        checked={formData.type === 'incoming'}
                        onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-slate-700">وارد</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="type" 
                        value="outgoing"
                        checked={formData.type === 'outgoing'}
                        onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-slate-700">صادر</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">رقم القيد / المرجع *</label>
                  <input
                    type="text"
                    required
                    value={formData.reference_number}
                    onChange={(e) => setFormData({...formData, reference_number: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                    placeholder="مثال: 45/1234"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">الموضوع *</label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                    placeholder="موضوع الخطاب أو المعاملة"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {formData.type === 'incoming' ? 'الجهة الموردة (من)' : 'الجهة المصدرة (من)'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.sender}
                    onChange={(e) => setFormData({...formData, sender: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {formData.type === 'incoming' ? 'الجهة المستلمة (إلى)' : 'الجهة الموجه إليها (إلى)'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.recipient}
                    onChange={(e) => setFormData({...formData, recipient: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">التاريخ *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">إحالة إلى قسم</label>
                  <select
                    value={formData.department_id || ""}
                    onChange={(e) => setFormData({...formData, department_id: e.target.value ? Number(e.target.value) : undefined})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">بدون إحالة</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">حالة المعاملة</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="pending">قيد الإجراء</option>
                    <option value="processed">منجزة</option>
                    <option value="archived">مؤرشفة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">الأهمية</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value as any})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="low">عادي</option>
                    <option value="medium">عاجل</option>
                    <option value="high">عاجل جداً</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">ملاحظات</label>
                  <textarea
                    value={formData.notes || ""}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 h-24 resize-none"
                    placeholder="أي ملاحظات إضافية حول المعاملة..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">المرفقات (صورة الخطاب)</label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-xl hover:border-indigo-500 transition-colors bg-slate-50">
                    <div className="space-y-1 text-center">
                      {formData.image_url ? (
                        <div className="relative inline-block">
                          <img src={formData.image_url} alt="المرفق" className="max-h-48 rounded-lg shadow-sm" />
                          <button 
                            type="button"
                            onClick={() => setFormData({...formData, image_url: ""})}
                            className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <ImageIcon className="mx-auto h-12 w-12 text-slate-400" />
                          <div className="flex text-sm text-slate-600 justify-center">
                            <label className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500 px-2 py-1">
                              <span>رفع صورة</span>
                              <input type="file" className="sr-only" accept="image/*" onChange={handleImageUpload} />
                            </label>
                          </div>
                          <p className="text-xs text-slate-500">PNG, JPG, GIF حتى 10MB</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              </div>

              <div className="flex justify-end gap-3 p-6 border-t border-slate-100 flex-shrink-0 bg-white rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-70"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  حفظ المعاملة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
