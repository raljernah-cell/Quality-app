import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Users, User, Shield, Plus, Edit, Trash2, Loader2, Check, X, Key } from 'lucide-react';
import { cn } from '../lib/utils';

interface User {
  id: number;
  username: string;
  full_name: string;
  role_id: number;
  role_name: string;
  department_id: number;
  department_name: string;
  is_active: number;
}

interface Role {
  id: number;
  name: string;
  description: string;
  permissions: number[];
}

interface Permission {
  id: number;
  name: string;
  description: string;
  module: string;
}

export default function UserManagement({ departments }: { departments: any[] }) {
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  // Form states
  const [userForm, setUserForm] = useState({
    username: '', password: '', full_name: '', role_id: '', department_id: '', is_active: 1
  });
  const [roleForm, setRoleForm] = useState({
    name: '', description: '', permissions: [] as number[]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes, permsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/roles'),
        fetch('/api/permissions')
      ]);
      
      setUsers(await usersRes.json());
      setRoles(await rolesRes.json());
      setPermissions(await permsRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PATCH' : 'POST';
      
      const payload = { ...userForm };
      if (editingUser && !payload.password) {
        delete (payload as any).password;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowUserModal(false);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'حدث خطأ');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingRole ? `/api/roles/${editingRole.id}` : '/api/roles';
      const method = editingRole ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleForm)
      });

      if (res.ok) {
        setShowRoleModal(false);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'حدث خطأ');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const deleteUser = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
    await fetch(`/api/users/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const deleteRole = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذه الصلاحية؟')) return;
    await fetch(`/api/roles/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const openUserModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setUserForm({
        username: user.username,
        password: '',
        full_name: user.full_name,
        role_id: user.role_id?.toString() || '',
        department_id: user.department_id?.toString() || '',
        is_active: user.is_active
      });
    } else {
      setEditingUser(null);
      setUserForm({
        username: '', password: '', full_name: '', role_id: '', department_id: '', is_active: 1
      });
    }
    setShowUserModal(true);
  };

  const openRoleModal = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      setRoleForm({
        name: role.name,
        description: role.description || '',
        permissions: role.permissions || []
      });
    } else {
      setEditingRole(null);
      setRoleForm({
        name: '', description: '', permissions: []
      });
    }
    setShowRoleModal(true);
  };

  const togglePermission = (permId: number) => {
    setRoleForm(prev => {
      const perms = prev.permissions.includes(permId)
        ? prev.permissions.filter(id => id !== permId)
        : [...prev.permissions, permId];
      return { ...prev, permissions: perms };
    });
  };

  // Group permissions by module
  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) acc[perm.module] = [];
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  const moduleNames: Record<string, string> = {
    'dashboard': 'لوحة القيادة',
    'users': 'المستخدمين',
    'roles': 'الصلاحيات',
    'indicators': 'المؤشرات',
    'tasks': 'المهام',
    'mail': 'الاتصالات الإدارية',
    'settings': 'الإعدادات'
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 w-full max-w-full" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <User className="w-6 h-6 text-indigo-600" />
            إدارة المستخدمين والصلاحيات
          </h2>
          <p className="text-slate-500 mt-1">إدارة حسابات المستخدمين وتحديد صلاحيات الوصول للنظام</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => openUserModal()}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors font-medium shadow-sm shadow-indigo-200"
          >
            <Plus className="w-4 h-4" />
            مستخدم جديد
          </button>
          <button
            onClick={() => openRoleModal()}
            className="flex items-center gap-2 bg-white text-indigo-600 border border-indigo-200 px-4 py-2.5 rounded-xl hover:bg-indigo-50 transition-colors font-medium shadow-sm"
          >
            <Shield className="w-4 h-4" />
            صلاحية جديدة
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-slate-100/80 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('users')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all",
            activeTab === 'users' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          )}
        >
          <Users className="w-4 h-4" />
          المستخدمين
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all",
            activeTab === 'roles' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          )}
        >
          <Key className="w-4 h-4" />
          مجموعات الصلاحيات
        </button>
      </div>

      {/* Content */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {activeTab === 'users' ? (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-right min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 text-sm">
                  <th className="p-4 font-semibold">الاسم الكامل</th>
                  <th className="p-4 font-semibold">اسم المستخدم</th>
                  <th className="p-4 font-semibold">الصلاحية</th>
                  <th className="p-4 font-semibold">القسم</th>
                  <th className="p-4 font-semibold">الحالة</th>
                  <th className="p-4 font-semibold text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-medium text-slate-800">{user.full_name}</td>
                    <td className="p-4 text-slate-600 font-mono text-sm">{user.username}</td>
                    <td className="p-4">
                      <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg text-xs font-medium border border-indigo-100">
                        {user.role_name || 'بدون صلاحية'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 text-sm">{user.department_name || '-'}</td>
                    <td className="p-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-medium border inline-flex items-center gap-1",
                        user.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-600 border-slate-200"
                      )}>
                        {user.is_active ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        {user.is_active ? 'نشط' : 'غير نشط'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openUserModal(user)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="تعديل">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteUser(user.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="حذف">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-500">لا يوجد مستخدمين</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-right min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 text-sm">
                  <th className="p-4 font-semibold">اسم الصلاحية</th>
                  <th className="p-4 font-semibold">الوصف</th>
                  <th className="p-4 font-semibold">عدد الصلاحيات الفرعية</th>
                  <th className="p-4 font-semibold text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roles.map((role) => (
                  <tr key={role.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-bold text-slate-800">{role.name}</td>
                    <td className="p-4 text-slate-600 text-sm">{role.description || '-'}</td>
                    <td className="p-4">
                      <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-200">
                        {role.permissions?.length || 0} صلاحية
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openRoleModal(role)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="تعديل">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteRole(role.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="حذف">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">
                {editingUser ? 'تعديل مستخدم' : 'مستخدم جديد'}
              </h3>
              <button onClick={() => setShowUserModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUserSubmit}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">الاسم الكامل</label>
                  <input
                    type="text"
                    required
                    value={userForm.full_name}
                    onChange={e => setUserForm({...userForm, full_name: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">اسم المستخدم</label>
                  <input
                    type="text"
                    required
                    value={userForm.username}
                    onChange={e => setUserForm({...userForm, username: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 font-mono text-left"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    كلمة المرور {editingUser && <span className="text-slate-400 text-xs font-normal">(اتركه فارغاً للاحتفاظ بكلمة المرور الحالية)</span>}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={userForm.password}
                    onChange={e => setUserForm({...userForm, password: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">مجموعة الصلاحيات</label>
                    <select
                      value={userForm.role_id}
                      onChange={e => setUserForm({...userForm, role_id: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50"
                    >
                      <option value="">بدون صلاحية</option>
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">القسم التابع له</label>
                    <select
                      value={userForm.department_id}
                      onChange={e => setUserForm({...userForm, department_id: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50"
                    >
                      <option value="">الكل / الإدارة</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={userForm.is_active === 1}
                    onChange={e => setUserForm({...userForm, is_active: e.target.checked ? 1 : 0})}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-slate-700">حساب نشط</label>
                </div>
              </div>
              <div className="flex justify-end gap-3 p-6 border-t border-slate-100 bg-slate-50">
                <button type="button" onClick={() => setShowUserModal(false)} className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-white transition-colors">
                  إلغاء
                </button>
                <button type="submit" className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors">
                  حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 flex-shrink-0">
              <h3 className="text-xl font-bold text-slate-800">
                {editingRole ? 'تعديل الصلاحية' : 'صلاحية جديدة'}
              </h3>
              <button onClick={() => setShowRoleModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRoleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">اسم الصلاحية</label>
                    <input
                      type="text"
                      required
                      value={roleForm.name}
                      onChange={e => setRoleForm({...roleForm, name: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">الوصف</label>
                    <input
                      type="text"
                      value={roleForm.description}
                      onChange={e => setRoleForm({...roleForm, description: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50"
                    />
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 mb-4 border-b pb-2">الصلاحيات الفرعية</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(groupedPermissions).map(([module, perms]) => (
                      <div key={module} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <h5 className="font-bold text-indigo-900 mb-3 text-sm">{moduleNames[module] || module}</h5>
                        <div className="space-y-2">
                          {perms.map(perm => (
                            <label key={perm.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors">
                              <input
                                type="checkbox"
                                checked={roleForm.permissions.includes(perm.id)}
                                onChange={() => togglePermission(perm.id)}
                                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                              />
                              <span className="text-sm text-slate-700">{perm.description}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 p-6 border-t border-slate-100 bg-white flex-shrink-0 rounded-b-2xl">
                <button type="button" onClick={() => setShowRoleModal(false)} className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors">
                  إلغاء
                </button>
                <button type="submit" className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors">
                  حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
