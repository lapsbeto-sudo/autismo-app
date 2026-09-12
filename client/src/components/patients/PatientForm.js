import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

const PatientForm = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = Boolean(id);

    const [formData, setFormData] = useState({
        nombre: '',
        apellido: '',
        fecha_nacimiento: '',
        sexo: 'M',
        cedula: '',
        direccion: '',
        telefono_contacto: '',
        nombre_padre: '',
        nombre_madre: '',
        motivo_consulta: '',
        observaciones: ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isEditing) {
            fetchPatient();
        }
    }, [id]);

    const fetchPatient = async () => {
        try {
            const response = await axios.get(`${API_URL}/patients/${id}`);
            setFormData(response.data);
        } catch (error) {
            setError('Error al cargar paciente');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isEditing) {
                await axios.put(`${API_URL}/patients/${id}`, formData);
            } else {
                await axios.post(`${API_URL}/patients`, formData);
            }
            navigate('/patients');
        } catch (err) {
            setError(err.response?.data?.error || 'Error al guardar paciente');
        } finally {
            setLoading(false);
        }
    };

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
                    <h2>{isEditing ? 'Editar Paciente' : 'Nuevo Paciente'}</h2>
                </div>

                <form onSubmit={handleSubmit} className="form-container">
                    {error && <div className="error-message">{error}</div>}

                    <div className="form-section">
                        <h3>Datos Personales</h3>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="nombre">Nombre *</label>
                                <input
                                    type="text"
                                    id="nombre"
                                    name="nombre"
                                    value={formData.nombre}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="apellido">Apellido *</label>
                                <input
                                    type="text"
                                    id="apellido"
                                    name="apellido"
                                    value={formData.apellido}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="fecha_nacimiento">Fecha de Nacimiento *</label>
                                <input
                                    type="date"
                                    id="fecha_nacimiento"
                                    name="fecha_nacimiento"
                                    value={formData.fecha_nacimiento}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="sexo">Sexo *</label>
                                <select
                                    id="sexo"
                                    name="sexo"
                                    value={formData.sexo}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="M">Masculino</option>
                                    <option value="F">Femenino</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="cedula">Cédula</label>
                            <input
                                type="text"
                                id="cedula"
                                name="cedula"
                                value={formData.cedula}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>Información de Contacto</h3>
                        
                        <div className="form-group">
                            <label htmlFor="direccion">Dirección</label>
                            <input
                                type="text"
                                id="direccion"
                                name="direccion"
                                value={formData.direccion}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="telefono_contacto">Teléfono de Contacto</label>
                            <input
                                type="tel"
                                id="telefono_contacto"
                                name="telefono_contacto"
                                value={formData.telefono_contacto}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="nombre_padre">Nombre del Padre</label>
                                <input
                                    type="text"
                                    id="nombre_padre"
                                    name="nombre_padre"
                                    value={formData.nombre_padre}
                                    onChange={handleChange}
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="nombre_madre">Nombre de la Madre</label>
                                <input
                                    type="text"
                                    id="nombre_madre"
                                    name="nombre_madre"
                                    value={formData.nombre_madre}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>Información Clínica</h3>
                        
                        <div className="form-group">
                            <label htmlFor="motivo_consulta">Motivo de Consulta</label>
                            <textarea
                                id="motivo_consulta"
                                name="motivo_consulta"
                                value={formData.motivo_consulta}
                                onChange={handleChange}
                                rows="3"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="observaciones">Observaciones</label>
                            <textarea
                                id="observaciones"
                                name="observaciones"
                                value={formData.observaciones}
                                onChange={handleChange}
                                rows="3"
                            />
                        </div>
                    </div>

                    <div className="form-actions">
                        <button
                            type="button"
                            onClick={() => navigate('/patients')}
                            className="btn-secondary"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary"
                        >
                            {loading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear Paciente')}
                        </button>
                    </div>
                </form>

                <button onClick={logout} className="btn-secondary logout-btn">Cerrar Sesión</button>
                <a href="/dashboard" className="back-link">← Volver al Dashboard</a>
            </main>
        </div>
    );
};

export default PatientForm;