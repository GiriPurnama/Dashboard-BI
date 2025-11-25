
import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { User } from '../../types';

// Mock Data
const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Admin User', email: 'admin@insightflow.com', role: 'Administrator', status: 'Active' },
  { id: 'u2', name: 'John Doe', email: 'john@company.com', role: 'Viewer', status: 'Active' },
  { id: 'u3', name: 'Sarah Smith', email: 'sarah@company.com', role: 'Editor', status: 'Inactive' },
  { id: 'u4', name: 'Mike Jones', email: 'mike@company.com', role: 'Viewer', status: 'Active' },
];

export const UserManagement = () => {
  const [users, setUsers] = useState(MOCK_USERS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({ name: '', email: '', role: 'Viewer', status: 'Active' });

  const handleEdit = (user: User) => {
      setEditingUser(user);
      setFormData({ name: user.name, email: user.email, role: user.role || 'Viewer', status: (user.status || 'Active') as any });
      setIsModalOpen(true);
  };

  const handleAdd = () => {
      setEditingUser(null);
      setFormData({ name: '', email: '', role: 'Viewer', status: 'Active' });
      setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
      if (confirm('Delete this user?')) {
          setUsers(users.filter(u => u.id !== id));
      }
  };

  const handleSave = () => {
      if (editingUser) {
          setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...formData } as User : u));
      } else {
          setUsers([...users, { id: `u-${Date.now()}`, ...formData } as User]);
      }
      setIsModalOpen(false);
  };

  return (
      <div className="p-6 max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
              <div>
                  <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
                  <p className="text-slate-500">Manage access and roles for workspace members.</p>
              </div>
              <Button onClick={handleAdd}>+ Add User</Button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4">Name</th>
                            <th className="px-6 py-4">Email</th>
                            <th className="px-6 py-4">Role</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {users.map(user => (
                            <tr key={user.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-medium text-slate-900">{user.name}</td>
                                <td className="px-6 py-4 text-slate-600">{user.email}</td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        user.role === 'Administrator' ? 'bg-purple-100 text-purple-800' : 
                                        user.role === 'Editor' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'
                                    }`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                     <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                        {user.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button onClick={() => handleEdit(user)} className="text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                                    <button onClick={() => handleDelete(user.id)} className="text-red-600 hover:text-red-800 font-medium">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
          </div>

          <Modal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              title={editingUser ? 'Edit User' : 'Add New User'}
              footer={<Button onClick={handleSave}>Save User</Button>}
          >
              <div className="space-y-4">
                  <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                      <input 
                          type="text" className="w-full border-slate-300 rounded-md focus:ring-brand-500 focus:border-brand-500 bg-white px-3 py-2 border"
                          value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                      />
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                      <input 
                          type="email" className="w-full border-slate-300 rounded-md focus:ring-brand-500 focus:border-brand-500 bg-white px-3 py-2 border"
                          value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                      />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                          <select 
                              className="w-full border-slate-300 rounded-md focus:ring-brand-500 focus:border-brand-500 bg-white px-3 py-2 border"
                              value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}
                          >
                              <option>Administrator</option>
                              <option>Editor</option>
                              <option>Viewer</option>
                          </select>
                      </div>
                       <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                          <select 
                              className="w-full border-slate-300 rounded-md focus:ring-brand-500 focus:border-brand-500 bg-white px-3 py-2 border"
                              value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}
                          >
                              <option>Active</option>
                              <option>Inactive</option>
                          </select>
                      </div>
                  </div>
              </div>
          </Modal>
      </div>
  );
};
