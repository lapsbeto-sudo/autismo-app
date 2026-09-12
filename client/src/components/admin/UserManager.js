import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import API_URL from '../../config';

const UserManager = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [editingUser, setEditingUser] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordData, setPasswordData] = useState({ password: '' });
    const [formData, setFormData] = useState({
        nombre: '',
        apellido: '',
        email: '',
        especialidad: '',
        rol: 'psicologo'
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await axios.get(`${API_URL}/admin/users`);
            setUsers(response.data);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (userItem) => {
        setEditingUser(userItem);
        setFormData({
            nombre: userItem.nombre,
            apellido: userItem.apellido,
            email: userItem.email,
            especialidad: userItem.especialidad || '',
            rol: userItem.rol
        });
        setShowModal(true);
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await axios.put(`${API_URL}/admin/users/${editingUser.id}`, formData);
            setSuccess('Usuario actualizado exitosamente');
            setShowModal(false);
            fetchUsers();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Error al actualizar usuario');
        }
    };

    const handleToggleStatus = async (userItem) => {
        const action = userItem.activo ? 'desactivar' : 'reactivar';
        if (window.confirm(`¿Estás seguro de ${action} a ${userItem.nombre} ${userItem.apellido}?`)) {
            try {
                if (userItem.activo) {
                    await axios.delete(`${API_URL}/admin/users/${userItem.id}`);
                } else {
                    await axios.put(`${API_URL}/admin/users/${userItem.id}/activate`);
                }
                setSuccess(`Usuario ${action}do exitosamente`);
                fetchUsers();
                setTimeout(() => setSuccess(''), 3000);
            } catch (err) {
                setError(err.response?.data?.error || `Error al ${action} usuario`);
            }
        }
    };

    const handleResetPassword = (userItem) => {
        setEditingUser(userItem);
        setPasswordData({ password: '' });
        setShowPasswordModal(true);
        setError('');
    };

    const submitResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await axios.put(`${API_URL}/admin/users/${editingUser.id}/reset-password`, passwordData);
            setSuccess('Contraseña restablecida exitosamente');
            setShowPasswordModal(false);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Error al restablecer contraseña');
        }
    };

    const filteredUsers = users.filter(userItem => {
        const matchesSearch = 
            userItem.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            userItem.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
            userItem.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = filterRole === 'all' || userItem.rol === filterRole;
        const matchesStatus = filterStatus === 'all' || 
            (filterStatus === 'active' && userItem.activo) ||
            (filterStatus === 'inactive' && !userItem.activo);
        return matchesSearch && matchesRole && matchesStatus;
    });

    if (loading) {
        return <div className="loading">Cargando usuarios...</div>;
    }

    return (
        <div className="dashboard">
            <header className="main-header">
                <div className="header-content">
                    <h1>AutismoApp</h1>
                    <div className="user-info">
                        <span>{user?.nombre}</span>
                        <button onClick={logout} className="btn-secondary">Cerrar Sesión</button>
                    </div>
                </div>
            </header>

            <main className="main-content">
                <div className="page-header">
                    <h2>Gestión de Usuarios</h2>
                    <Link to="/admin" className="btn-secondary">← Volver a Admin</Link>
                </div>

                {success && <div className="success-message">{success}</div>}
                {error && <div className="error-message">{error}</div>}

                <div className="filters-bar">
                    <input
                        type="text"
                        placeholder="Buscar por nombre o email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                    <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                        <option value="all">Todos los roles</option>
                        <option value="admin">Administradores</option>
                        <option value="psicologo">Psicólogos</option>
                    </select>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                        <option value="all">Todos los estados</option>
                        <option value="active">Activos</option>
                        <option value="inactive">Inactivos</option>
                    </select>
                </div>

                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Email</th>
                                <th>Especialidad</th>
                                <th>Rol</th>
                                <th>Estado</th>
                                <th>Pacientes</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(userItem => (
                                <tr key={userItem.id} className={!userItem.activo ? 'inactive-row' : ''}>
                                    <td>{userItem.nombre} {userItem.apellido}</td>
                                    <td>{userItem.email}</td>
                                    <td>{userItem.especialidad || '-'}</td>
                                    <td>
                                        <span className={`role-badge ${userItem.rol}`}>
                                            {userItem.rol === 'admin' ? 'Admin' : 'Psicólogo'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`status-badge ${userItem.activo ? 'active' : 'inactive'}`}>
                                            {userItem.activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td>{userItem.total_patientes || 0}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button 
                                                onClick={() => handleEdit(userItem)}
                                                className="btn-small"
                                                disabled={userItem.id === user?.id}
                                            >
                                                Editar
                                            </button>
                                            <button 
                                                onClick={() => handleResetPassword(userItem)}
                                                className="btn-small btn-warning"
                                            >
                                                Contraseña
                                            </button>
                                            <button 
                                                onClick={() => handleToggleStatus(userItem)}
                                                className={`btn-small ${userItem.activo ? 'btn-danger' : 'btn-success'}`}
                                                disabled={userItem.id === user?.id}
                                            >
                                                {userItem.activo ? 'Desactivar' : 'Activar'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredUsers.length === 0 && (
                    <div className="empty-state">
                        <p>No se encontraron usuarios</p>
                    </div>
                )}

                {/* Modal de Edición */}
                {showModal && (
                    <div className="modal-overlay">
                        <div className="modal">
                            <h3>Editar Usuario</h3>
                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label>Nombre</label>
                                    <input
                                        type="text"
                                        value={formData.nombre}
                                        onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Apellido</label>
                                    <input
                                        type="text"
                                        value={formData.apellido}
                                        onChange={(e) => setFormData({...formData, apellido: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Especialidad</label>
                                    <input
                                        type="text"
                                        value={formData.especialidad}
                                        onChange={(e) => setFormData({...formData, especialidad: e.target.value})}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Rol</label>
                                    <select
                                        value={formData.rol}
                                        onChange={(e) => setFormData({...formData, rol: e.target.value})}
                                    >
                                        <option value="psicologo">Psicólogo</option>
                                        <option value="admin">Administrador</option>
                                    </select>
                                </div>
                                <div className="modal-actions">
                                    <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                                        Cancelar
                                    </button>
                                    <button type="submit" className="btn-primary">
                                        Guardar Cambios
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Modal de Restablecer Contraseña */}
                {showPasswordModal && (
                    <div className="modal-overlay">
                        <div className="modal">
                            <h3>Restablecer Contraseña</h3>
                            <p>Usuario: {editingUser?.nombre} {editingUser?.apellido}</p>
                            <form onSubmit={submitResetPassword}>
                                <div className="form-group">
                                    <label>Nueva Contraseña</label>
                                    <input
                                        type="password"
                                        value={passwordData.password}
                                        onChange={(e) => setPasswordData({password: e.target.value})}
                                        minLength={6}
                                        required
                                    />
                                </div>
                                <div className="modal-actions">
                                    <button type="button" onClick={() => setShowPasswordModal(false)} className="btn-secondary">
                                        Cancelar
                                    </button>
                                    <button type="submit" className="btn-primary">
                                        Restablecer
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default UserManager;