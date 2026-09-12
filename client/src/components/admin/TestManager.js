import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

import API_URL from '../../config';

const TestManager = () => {
    const { user, logout } = useAuth();
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingTest, setEditingTest] = useState(null);
    const [formData, setFormData] = useState({
        nombre: '',
        codigo: '',
        descripcion: '',
        edad_min_meses: '',
        edad_max_meses: '',
        metodo_aplicacion: 'autoadmin'
    });

    useEffect(() => {
        fetchTests();
    }, []);

    const fetchTests = async () => {
        try {
            const response = await axios.get(`${API_URL}/admin/tests`);
            setTests(response.data);
        } catch (error) {
            console.error('Error fetching tests:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingTest) {
                await axios.put(`${API_URL}/admin/tests/${editingTest.id}`, formData);
            } else {
                await axios.post(`${API_URL}/admin/tests`, formData);
            }
            setShowForm(false);
            setEditingTest(null);
            setFormData({
                nombre: '',
                codigo: '',
                descripcion: '',
                edad_min_meses: '',
                edad_max_meses: '',
                metodo_aplicacion: 'autoadmin'
            });
            fetchTests();
        } catch (error) {
            alert(error.response?.data?.error || 'Error al guardar test');
        }
    };

    const handleEdit = (test) => {
        setEditingTest(test);
        setFormData({
            nombre: test.nombre,
            codigo: test.codigo,
            descripcion: test.descripcion || '',
            edad_min_meses: test.edad_min_meses,
            edad_max_meses: test.edad_max_meses,
            metodo_aplicacion: test.metodo_aplicacion
        });
        setShowForm(true);
    };

    const handleToggleActive = async (test) => {
        try {
            await axios.put(`${API_URL}/admin/tests/${test.id}`, {
                activo: test.activo ? 0 : 1
            });
            fetchTests();
        } catch (error) {
            alert('Error al cambiar estado del test');
        }
    };

    const handleDelete = async (test) => {
        if (window.confirm(`¿Estás seguro de desactivar el test "${test.nombre}"?`)) {
            try {
                await axios.delete(`${API_URL}/admin/tests/${test.id}`);
                fetchTests();
            } catch (error) {
                alert('Error al eliminar test');
            }
        }
    };

    const getAgeRange = (min, max) => {
        const minYears = Math.floor(min / 12);
        const maxYears = Math.floor(max / 12);
        return `${minYears}-${maxYears} años`;
    };

    if (loading) {
        return <div className="loading">Cargando tests...</div>;
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
                    <h2>Administración de Tests</h2>
                    <div className="header-actions">
                        <Link to="/admin/users" className="btn-secondary">
                            Gestionar Usuarios
                        </Link>
                        <button 
                            onClick={() => { setShowForm(true); setEditingTest(null); }}
                            className="btn-primary"
                        >
                            + Nuevo Test
                        </button>
                    </div>
                </div>

                {showForm && (
                    <div className="form-container">
                        <h3>{editingTest ? 'Editar Test' : 'Nuevo Test'}</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Nombre del Test *</label>
                                    <input
                                        type="text"
                                        value={formData.nombre}
                                        onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Código *</label>
                                    <input
                                        type="text"
                                        value={formData.codigo}
                                        onChange={(e) => setFormData({...formData, codigo: e.target.value})}
                                        required
                                        placeholder="Ej: MCHAT-RF"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Descripción</label>
                                <textarea
                                    value={formData.descripcion}
                                    onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                                    rows="3"
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Edad Mínima (meses) *</label>
                                    <input
                                        type="number"
                                        value={formData.edad_min_meses}
                                        onChange={(e) => setFormData({...formData, edad_min_meses: parseInt(e.target.value)})}
                                        required
                                        min="0"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Edad Máxima (meses) *</label>
                                    <input
                                        type="number"
                                        value={formData.edad_max_meses}
                                        onChange={(e) => setFormData({...formData, edad_max_meses: parseInt(e.target.value)})}
                                        required
                                        min="1"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Método de Aplicación *</label>
                                    <select
                                        value={formData.metodo_aplicacion}
                                        onChange={(e) => setFormData({...formData, metodo_aplicacion: e.target.value})}
                                        required
                                    >
                                        <option value="autoadmin">Autoadministrado</option>
                                        <option value="observacion">Observación directa</option>
                                        <option value="entrevista">Entrevista</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-actions">
                                <button 
                                    type="button" 
                                    onClick={() => { setShowForm(false); setEditingTest(null); }}
                                    className="btn-secondary"
                                >
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-primary">
                                    {editingTest ? 'Actualizar' : 'Crear Test'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Nombre</th>
                                <th>Edad</th>
                                <th>Método</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tests.map(test => (
                                <tr key={test.id}>
                                    <td><strong>{test.codigo}</strong></td>
                                    <td>{test.nombre}</td>
                                    <td>{getAgeRange(test.edad_min_meses, test.edad_max_meses)}</td>
                                    <td>
                                        {test.metodo_aplicacion === 'autoadmin' ? 'Autoadministrado' :
                                         test.metodo_aplicacion === 'observacion' ? 'Observación' :
                                         'Entrevista'}
                                    </td>
                                    <td>
                                        <span className={`status-badge ${test.activo ? 'active' : 'inactive'}`}>
                                            {test.activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="actions-cell">
                                        <Link to={`/admin/tests/${test.id}/items`} className="btn-small">
                                            Ítems
                                        </Link>
                                        <button 
                                            onClick={() => handleEdit(test)}
                                            className="btn-small"
                                        >
                                            Editar
                                        </button>
                                        <button 
                                            onClick={() => handleToggleActive(test)}
                                            className={`btn-small ${test.activo ? 'btn-warning' : 'btn-success'}`}
                                        >
                                            {test.activo ? 'Desactivar' : 'Activar'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <Link to="/dashboard" className="back-link">← Volver al Dashboard</Link>
            </main>
        </div>
    );
};

export default TestManager;