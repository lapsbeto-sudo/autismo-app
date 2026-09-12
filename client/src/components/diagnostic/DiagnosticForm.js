import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

const INSTRUMENTOS = [
    { value: 'ADOS-2', label: 'ADOS-2 (Escala de Observación para el Diagnóstico del Autismo)', categoria: 'Observación' },
    { value: 'ADI-R', label: 'ADI-R (Entrevista para el Diagnóstico del Autismo - Revisada)', categoria: 'Entrevista' },
    { value: 'CARS', label: 'CARS (Escala de Evaluación del Autismo Infantil)', categoria: 'Observación' },
    { value: 'GARS', label: 'GARS (Escala de Evaluación de Autismo de Gilliam)', categoria: 'Cuestionario' },
    { value: 'SCQ', label: 'SCQ (Cuestionario de Comunicación Social)', categoria: 'Cuestionario' },
    { value: 'STAT', label: 'STAT (Herramienta de Observación para el Autismo)', categoria: 'Observación' },
    { value: 'CBA', label: 'CBA (Batería de Evaluación del Autismo)', categoria: 'Batería' },
    { value: 'otro', label: 'Otro instrumento', categoria: 'Otro' }
];

const AREAS_EVALUADAS = [
    'Interacción social',
    'Comunicación verbal',
    'Comunicación no verbal',
    'Comportamiento repetitivo',
    'Intereses restringidos',
    'Procesamiento sensorial',
    'Lenguaje y pragmática',
    'Juego e imaginación',
    'Perfil cognitivo',
    'Evaluación integral'
];

const NIVELES_GRAVEDAD = [
    { value: 'nivel_1', label: 'Nivel 1 - Requiere apoyo', color: '#16a34a' },
    { value: 'nivel_2', label: 'Nivel 2 - Requiere apoyo importante', color: '#d97706' },
    { value: 'nivel_3', label: 'Nivel 3 - Requiere apoyo muy importante', color: '#dc2626' },
    { value: 'no_aplica', label: 'No aplica / Sin indicadores', color: '#6b7280' }
];

const DiagnosticForm = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { patientId } = useParams();
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        instrumento: '',
        fecha_evaluacion: new Date().toISOString().split('T')[0],
        edad_evaluacion: '',
        area_evaluada: '',
        resultado: '',
        nivel_gravedad: '',
        observaciones: '',
        recomendaciones: ''
    });

    useEffect(() => {
        fetchPatient();
    }, [patientId]);

    const fetchPatient = async () => {
        try {
            const response = await axios.get(`${API_URL}/patients/${patientId}`);
            setPatient(response.data);
            
            // Calcular edad automáticamente
            const hoy = new Date();
            const nacimiento = new Date(response.data.fecha_nacimiento);
            let edadAnos = hoy.getFullYear() - nacimiento.getFullYear();
            let edadMeses = hoy.getMonth() - nacimiento.getMonth();
            if (edadMeses < 0) {
                edadAnos--;
                edadMeses += 12;
            }
            setFormData(prev => ({
                ...prev,
                edad_evaluacion: `${edadAnos} años y ${edadMeses} meses`
            }));
        } catch (error) {
            console.error('Error fetching patient:', error);
        } finally {
            setLoading(false);
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
        setSaving(true);
        setError('');

        try {
            await axios.post(`${API_URL}/diagnostic`, {
                patient_id: parseInt(patientId),
                ...formData
            });
            navigate(`/patients/${patientId}`);
        } catch (err) {
            setError(err.response?.data?.error || 'Error al guardar evaluación');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="loading">Cargando...</div>;
    }

    if (!patient) {
        return <div className="error-message">Paciente no encontrado</div>;
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
                    <h2>Nueva Evaluación Diagnóstica</h2>
                </div>

                <div className="patient-info-box">
                    <h3>Paciente</h3>
                    <p><strong>Nombre:</strong> {patient.nombre} {patient.apellido}</p>
                    <p><strong>Fecha de nacimiento:</strong> {patient.fecha_nacimiento}</p>
                </div>

                <div className="copyright-notice">
                    <p><strong>Nota:</strong> Este módulo permite registrar evaluaciones diagnósticas realizadas con instrumentos oficiales (ADOS-2, ADI-R, etc.). 
                    El contenido de estos instrumentos está protegido por copyright y debe adquirirse a través de los distribuidores autorizados.</p>
                </div>

                <form onSubmit={handleSubmit} className="form-container diagnostic-form">
                    {error && <div className="error-message">{error}</div>}

                    <div className="form-section">
                        <h3>Instrumento y Fecha</h3>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="instrumento">Instrumento Diagnóstico *</label>
                                <select
                                    id="instrumento"
                                    name="instrumento"
                                    value={formData.instrumento}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">Seleccionar instrumento</option>
                                    {INSTRUMENTOS.map(instrumento => (
                                        <option key={instrumento.value} value={instrumento.value}>
                                            {instrumento.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="fecha_evaluacion">Fecha de Evaluación *</label>
                                <input
                                    type="date"
                                    id="fecha_evaluacion"
                                    name="fecha_evaluacion"
                                    value={formData.fecha_evaluacion}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="edad_evaluacion">Edad al Momento de Evaluación</label>
                                <input
                                    type="text"
                                    id="edad_evaluacion"
                                    name="edad_evaluacion"
                                    value={formData.edad_evaluacion}
                                    onChange={handleChange}
                                    placeholder="Ej: 4 años y 6 meses"
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="area_evaluada">Área Evaluada</label>
                                <select
                                    id="area_evaluada"
                                    name="area_evaluada"
                                    value={formData.area_evaluada}
                                    onChange={handleChange}
                                >
                                    <option value="">Seleccionar área</option>
                                    {AREAS_EVALUADAS.map(area => (
                                        <option key={area} value={area}>{area}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>Resultados</h3>
                        
                        <div className="form-group">
                            <label htmlFor="nivel_gravedad">Nivel / Clasificación</label>
                            <select
                                id="nivel_gravedad"
                                name="nivel_gravedad"
                                value={formData.nivel_gravedad}
                                onChange={handleChange}
                            >
                                <option value="">Seleccionar nivel</option>
                                {NIVELES_GRAVEDAD.map(nivel => (
                                    <option key={nivel.value} value={nivel.value}>
                                        {nivel.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="resultado">Resultado / Puntuación</label>
                            <textarea
                                id="resultado"
                                name="resultado"
                                value={formData.resultado}
                                onChange={handleChange}
                                rows="3"
                                placeholder="Describa los resultados obtenidos, puntuaciones, percentiles, etc."
                            />
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>Observaciones y Recomendaciones</h3>
                        
                        <div className="form-group">
                            <label htmlFor="observaciones">Observaciones Clínicas</label>
                            <textarea
                                id="observaciones"
                                name="observaciones"
                                value={formData.observaciones}
                                onChange={handleChange}
                                rows="4"
                                placeholder="Comportamientos observados, colaboración del paciente, condiciones de aplicación, etc."
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="recomendaciones">Recomendaciones</label>
                            <textarea
                                id="recomendaciones"
                                name="recomendaciones"
                                value={formData.recomendaciones}
                                onChange={handleChange}
                                rows="4"
                                placeholder="Intervenciones sugeridas, seguimiento, derivaciones, etc."
                            />
                        </div>
                    </div>

                    <div className="form-actions">
                        <button
                            type="button"
                            onClick={() => navigate(`/patients/${patientId}`)}
                            className="btn-secondary"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="btn-primary"
                        >
                            {saving ? 'Guardando...' : 'Guardar Evaluación'}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
};

export default DiagnosticForm;