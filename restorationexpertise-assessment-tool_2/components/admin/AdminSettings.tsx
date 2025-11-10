import React, { useState } from 'react';
import { ADMIN_USERS, AdminUser, AdminRole, AdminStatus } from '../../lib/mockData';
import { PencilSquareIcon, CheckIcon, XMarkIcon, KeyIcon } from '../icons';

// --- Types ---
interface AdminSettingsProps {
    showToast: (message: string, type: 'success' | 'error') => void;
}

// --- Modals ---
interface UserModalProps {
    user?: AdminUser;
    onClose: () => void;
    onSave: (data: any) => void;
    title: string;
    subtext?: string;
}

const UserModal: React.FC<UserModalProps> = ({ user, onClose, onSave, title, subtext }) => {
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        role: user?.role || ('Support' as AdminRole),
    });

    const isFormValid = formData.name.trim() && formData.email.trim() && formData.email.includes('@');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid) return;

        if (user) {
            onSave({ ...user, name: formData.name, role: formData.role });
        } else {
            onSave(formData);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-slide-up" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-dark hover:text-charcoal"><XMarkIcon className="w-6 h-6"/></button>
                <h2 className="font-playfair text-2xl font-bold text-charcoal mb-2">{title}</h2>
                {subtext && <p className="text-sm text-gray-dark mb-4">{subtext}</p>}
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-gray-dark">Full Name</label>
                        <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="mt-1 block w-full p-2 border border-gray-border rounded-lg" required />
                    </div>
                     <div>
                        <label className="text-sm font-medium text-gray-dark">Email</label>
                        <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="mt-1 block w-full p-2 border border-gray-border rounded-lg" required disabled={!!user} />
                    </div>
                     <div>
                        <label className="text-sm font-medium text-gray-dark">Role</label>
                        <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as AdminRole})} className="mt-1 block w-full p-2 border border-gray-border rounded-lg">
                            <option>Superadmin</option><option>Operations</option><option>Support</option><option>Content</option><option>ReadOnly</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-light border border-gray-border rounded-lg font-semibold">Cancel</button>
                        <button type="submit" disabled={!isFormValid} className="py-2 px-4 bg-gold text-charcoal font-bold rounded-lg disabled:opacity-50">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- Cards ---
const AdminUsersCard: React.FC<{
    users: AdminUser[];
    onInvite: () => void;
    onEdit: (user: AdminUser) => void;
    onToggleStatus: (user: AdminUser) => void;
    showToast: (message: string, type: 'success' | 'error') => void;
}> = ({ users, onInvite, onEdit, onToggleStatus, showToast }) => {
    
    const statusColors: { [key in AdminStatus]: string } = {
        Active: 'bg-success/20 text-success',
        Suspended: 'bg-gray-200 text-gray-800',
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-border">
            <div className="p-4 md:p-6 flex justify-between items-center border-b border-gray-border">
                <h2 className="font-playfair text-xl font-bold text-charcoal">Admin Users</h2>
                <button onClick={onInvite} className="py-2 px-4 bg-gold text-charcoal font-bold rounded-lg shadow-sm text-sm">Invite Admin</button>
            </div>
            
            {/* Desktop Table */}
            <div className="overflow-x-auto hidden md:block">
                <table className="min-w-full">
                    <thead className="bg-gray-light/50">
                        <tr>
                            {['Name', 'Role', 'Status', 'Last Login', 'Actions'].map(h => <th key={h} className="p-4 text-left text-xs font-bold text-charcoal uppercase">{h}</th>)}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-border">
                        {users.map(user => (
                            <tr key={user.id}>
                                <td className="p-4"><p className="font-semibold text-charcoal">{user.name}</p><p className="text-sm text-gray-dark">{user.email}</p></td>
                                <td className="p-4 text-sm">{user.role}</td>
                                <td className="p-4"><span className={`px-2 py-1 text-xs font-bold rounded-full ${statusColors[user.status]}`}>{user.status}</span></td>
                                <td className="p-4 text-sm">{user.lastLogin}</td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => onEdit(user)} className="p-2 text-gray-dark hover:text-info rounded-full"><PencilSquareIcon className="w-5 h-5"/></button>
                                        <button onClick={() => onToggleStatus(user)} className="text-sm font-semibold text-gray-dark hover:underline">{user.status === 'Active' ? 'Suspend' : 'Activate'}</button>
                                        <button onClick={() => showToast('Login reset email would be sent in production.', 'success')} className="p-2 text-gray-dark hover:text-info rounded-full"><KeyIcon className="w-5 h-5"/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-border">
                {users.map(user => (
                    <div key={user.id} className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                            <p className="font-bold text-charcoal">{user.name}</p>
                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${statusColors[user.status]}`}>{user.status}</span>
                        </div>
                        <div className="text-sm">
                            <p className="text-gray-dark">{user.email}</p>
                            <p className="font-semibold">{user.role}</p>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <p className="text-gray-dark">Last login: {user.lastLogin}</p>
                            <div className="flex gap-2">
                                <button onClick={() => onEdit(user)} className="py-1 px-3 bg-info/10 text-info font-bold rounded-md">Edit</button>
                                <button onClick={() => onToggleStatus(user)} className="py-1 px-3 bg-gray-200 font-semibold rounded-md">{user.status === 'Active' ? 'Suspend' : 'Activate'}</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const RolesPermissionsCard: React.FC = () => {
    const permissions: Record<string, Record<AdminRole, boolean>> = {
        'View Members':        { Superadmin: true, Operations: true, Support: true, Content: true, ReadOnly: true },
        'Edit Members':        { Superadmin: true, Operations: true, Support: true, Content: false, ReadOnly: false },
        'Manage Verifications':{ Superadmin: true, Operations: true, Support: true, Content: false, ReadOnly: true },
        'Manage Service Requests': { Superadmin: true, Operations: true, Support: true, Content: true, ReadOnly: true },
        'Manage Billing':      { Superadmin: true, Operations: true, Support: false, Content: false, ReadOnly: true },
        'Manage Admin Users':  { Superadmin: true, Operations: false, Support: false, Content: false, ReadOnly: false },
    };
    const roles: AdminRole[] = ['Superadmin', 'Operations', 'Support', 'Content', 'ReadOnly'];

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-border">
            <div className="p-4 md:p-6 border-b border-gray-border">
                <h2 className="font-playfair text-xl font-bold text-charcoal">Roles & Permissions</h2>
            </div>
            
            <div className="p-4 md:p-6">
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr>
                                <th className="p-3 text-left text-xs font-bold text-charcoal uppercase">Capability</th>
                                {roles.map(role => <th key={role} className="p-3 text-center text-xs font-bold text-charcoal uppercase">{role}</th>)}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-border">
                            {Object.entries(permissions).map(([capability, rolesMap]) => (
                                <tr key={capability}>
                                    <td className="p-3 font-semibold text-charcoal">{capability}</td>
                                    {roles.map(role => (
                                        <td key={role} className="p-3 text-center">
                                            {rolesMap[role] && <CheckIcon className="w-5 h-5 text-success mx-auto"/>}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile List */}
                <div className="md:hidden space-y-6">
                    {roles.map(role => (
                        <div key={role}>
                            <h3 className="font-bold text-lg text-charcoal border-b border-gray-border pb-1 mb-2">{role}</h3>
                            <ul className="space-y-1">
                                {Object.entries(permissions).map(([capability, rolesMap]) => (
                                    <li key={capability} className="flex items-center gap-2 text-sm">
                                        {rolesMap[role] ? <CheckIcon className="w-4 h-4 text-success"/> : <XMarkIcon className="w-4 h-4 text-error"/>}
                                        <span>{capability}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="p-4 bg-gray-light/50 text-sm text-gray-dark rounded-b-2xl">
                Permissions are static in this demo. In production, this matrix will drive access control for admin users.
            </div>
        </div>
    );
};


// --- Main Component ---
const AdminSettings: React.FC<AdminSettingsProps> = ({ showToast }) => {
    const [adminUsers, setAdminUsers] = useState<AdminUser[]>(ADMIN_USERS);
    const [isInviteModalOpen, setInviteModalOpen] = useState(false);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

    const handleInviteUser = (newUser: Omit<AdminUser, 'id' | 'lastLogin' | 'status'>) => {
        const user: AdminUser = {
            ...newUser,
            id: `admin_${Date.now()}`,
            status: 'Active',
            lastLogin: '-',
        };
        setAdminUsers(prev => [user, ...prev]);
        showToast('Admin invited (demo).', 'success');
        setInviteModalOpen(false);
    };

    const handleUpdateUser = (updatedUser: AdminUser) => {
        setAdminUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
        showToast('Admin user updated.', 'success');
        setEditModalOpen(false);
        setSelectedUser(null);
    };
    
    const handleToggleStatus = (user: AdminUser) => {
        const newStatus: AdminStatus = user.status === 'Active' ? 'Suspended' : 'Active';
        const updatedUser = { ...user, status: newStatus };
        setAdminUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
        showToast(`User ${newStatus.toLowerCase()}.`, 'success');
    };
    
    const openEditModal = (user: AdminUser) => {
        setSelectedUser(user);
        setEditModalOpen(true);
    };

    return (
        <>
            {isInviteModalOpen && (
                <UserModal 
                    onClose={() => setInviteModalOpen(false)}
                    onSave={handleInviteUser}
                    title="Invite Admin"
                    subtext="Invite will send an email in the live version. For now we just add them to the list."
                />
            )}
            {isEditModalOpen && selectedUser && (
                <UserModal
                    user={selectedUser}
                    onClose={() => { setEditModalOpen(false); setSelectedUser(null); }}
                    onSave={handleUpdateUser}
                    title="Edit Admin User"
                />
            )}
            <div className="p-4 md:p-6 lg:p-8 animate-fade-in">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-8">
                        <h1 className="font-playfair text-3xl font-bold text-charcoal">Admin Settings</h1>
                        <p className="text-gray-dark mt-1">Manage admin users, roles, and access to the Restoration Expertise admin tools.</p>
                    </div>
                    <div className="space-y-8">
                        <AdminUsersCard 
                            users={adminUsers} 
                            onInvite={() => setInviteModalOpen(true)}
                            onEdit={openEditModal}
                            onToggleStatus={handleToggleStatus}
                            showToast={showToast}
                        />
                        <RolesPermissionsCard />
                    </div>
                </div>
            </div>
        </>
    );
};

export default AdminSettings;
