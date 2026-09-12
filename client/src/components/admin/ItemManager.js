import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

const ItemManager = () => {
    const { user, logout } = useAuth();
    const { testId } = useParams();
    const [test, setTest] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({
        texto: '',
        orden: '',
        tipo_respuesta: 'si_no',
        seccion: '',
        peso_puntos: 1,
        opciones_json: ''
    });

    useEffect(() => {
        fetchData();
    }, [testId]);

    const fetchData = async () => {
        try {
            const [testRes, itemsRes] = await Promise.all([
                axios.get(`${API_URL}/admin/tests/${testId}`),
                axios.get(`${API_URL}/admin/tests/${testId}`)
            ]);
            setTest(testRes.data);
            setItems(testRes.data.items || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const dataToSend = {
                ...formData,
                orden: parseInt(formData.orden),
                peso_puntos: parseInt(formData.peso_puntos) || 1,
                opciones_json: formData.opciones_json || null
            };

            if (editingItem) {
                await axios.put(`${API_URL}/admin/items/${editingItem.id}`, dataToSend);
            } else {
                await axios.post(`${API_URL}/admin/tests/${testId}/items`, dataToSend);
            }
            setShowForm(false);
            setEditingItem(null);
            setFormData({
                texto: '',
                orden: '',
                tipo_respuesta: 'si_no',
                seccion: '',
                peso_puntos: 1,
                opciones_json: ''
            });
            fetchData();
        } catch (error) {
            alert(error.response?.data?.error || 'Error al guardar ítem');
        }
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setFormData({
            texto: item.texto,
            orden: item.orden,
            tipo_respuesta: item.tipo_respuesta,
            seccion: item.seccion || '',
            peso_puntos: item.peso_puntos || 1,
            opciones_json: item.opciones_json || ''
        });
        setShowForm(true);
    };

    const handleDelete = async (item) => {
        if (window.confirm(`¿Estás seguro de eliminar este ítem?`)) {
            try {
                await axios.delete(`${API_URL}/admin/items/${item.id}`);
                fetchData();
            } catch (error) {
                alert('Error al eliminar ítem');
            }
        }
    };

    const getResponseTypeLabel = (type) => {
        const labels = {
            'si_no': 'Sí/No',
            'Likert_4': 'Likert (1-4)',
            'Likert_5': 'Likert (1-5)',
            'opcion_multiple': 'Opción múltiple',
            'escala': 'Escala'
        };
        return labels[type] || type;
    };

    if (loading) {
        return <div className="loading">Cargando...</div>;
    }

    if (!test) {
        return <div className="error-message">Test no encontrado</div>;
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
                    <h2>Ítems: {test.nombre}</h2>
                    <button 
                        onClick={() => { setShowForm(true); setEditingItem(null); }}
                        className="btn-primary"
                    >
                        + Nuevo Ítem
                    </button>
                </div>

                <div className="test-info-box">
                    <p><strong>Código:</strong> {test.codigo}</p>
                    <p><strong>Edad:</strong> {test.edad_min_meses}-{test.edad_max_meses} meses</p>
                    <p><strong>Método:</strong> {
                        test.metodo_aplicacion === 'autoadmin' ? 'Autoadministrado' :
                        test.metodo_aplicacion === 'observacion' ? 'Observación directa' :
                        'Entrevista'
                    }</p>
                </div>

                {showForm && (
                    <div className="form-container">
                        <h3>{editingItem ? 'Editar Ítem' : 'Nuevo Ítem'}</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Texto del Ítem *</label>
                                <textarea
                                    value={formData.texto}
                                    onChange={(e) => setFormData({...formData, texto: e.target.value})}
                                    required
                                    rows="3"
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Orden *</label>
                                    <input
                                        type="number"
                                        value={formData.orden}
                                        onChange={(e) => setFormData({...formData, orden: e.target.value})}
                                        required
                                        min="1"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Tipo de Respuesta *</label>
                                    <select
                                        value={formData.tipo_respuesta}
                                        onChange={(e) => setFormData({...formData, tipo_respuesta: e.target.value})}
                                        required
                                    >
                                        <option value="si_no">Sí/No</option>
                                        <option value="Likert_4">Likert (1-4)</option>
                                        <option value="Likert_5">Likert (1-5)</option>
                                        <option value="opcion_multiple">Opción múltiple</option>
                                        <option value="escala">Escala</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Sección</label>
                                    <input
                                        type="text"
                                        value={formData.seccion}
                                        onChange={(e) => setFormData({...formData, seccion: e.target.value})}
                                        placeholder="Ej: Lenguaje"
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Peso (puntos)</label>
                                    <input
                                        type="number"
                                        value={formData.peso_puntos}
                                        onChange={(e) => setFormData({...formData, peso_puntos: e.target.value})}
                                        min="1"
                                    />
                                </div>
                                {formData.tipo_respuesta === 'opcion_multiple' && (
                                    <div className="form-group">
                                        <label>Opciones (JSON)</label>
                                        <input
                                            type="text"
                                            value={formData.opciones_json}
                                            onChange={(e) => setFormData({...formData, opciones_json: e.target.value})}
                                            placeholder='["Opción 1", "Opción 2"]'
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="form-actions">
                                <button 
                                    type="button" 
                                    onClick={() => { setShowForm(false); setEditingItem(null); }}
                                    className="btn-secondary"
                                >
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-primary">
                                    {editingItem ? 'Actualizar' : 'Crear Ítem'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Orden</th>
                                <th>Texto</th>
                                <th>Sección</th>
                                <th>Tipo</th>
                                <th>Peso</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(item => (
                                <tr key={item.id}>
                                    <td>{item.orden}</td>
                                    <td>{item.texto.substring(0, 80)}...</td>
                                    <td>{item.seccion || '-'}</td>
                                    <td>{getResponseTypeLabel(item.tipo_respuesta)}</td>
                                    <td>{item.peso_puntos}</td>
                                    <td className="actions-cell">
                                        <button 
                                            onClick={() => handleEdit(item)}
                                            className="btn-small"
                                        >
                                            Editar
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(item)}
                                            className="btn-small btn-danger"
                                        >
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <Link to="/admin" className="back-link">← Volver a Administración</Link>
            </main>
        </div>
    );
};

export default ItemManager;