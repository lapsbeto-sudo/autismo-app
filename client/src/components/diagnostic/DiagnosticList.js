import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

import API_URL from '../../config';

const NIVELES_GRAVEDAD = {
    'nivel_1': { label: 'Nivel 1', color: '#16a34a', desc: 'Requiere apoyo' },
    'nivel_2': { label: 'Nivel 2', color: '#d97706', desc: 'Requiere apoyo importante' },
    'nivel_3': { label: 'Nivel 3', color: '#dc2626', desc: 'Requiere apoyo muy importante' },
    'no_aplica': { label: 'No aplica', color: '#6b7280', desc: 'Sin indicadores' }
};

const DiagnosticList = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { patientId } = useParams();
    const [patient, setPatient] = useState(null);
    const [evaluations, setEvaluations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [patientId]);

    const fetchData = async () => {
        try {
            const [patientRes, evalsRes] = await Promise.all([
                axios.get(`${API_URL}/patients/${patientId}`),
                axios.get(`${API_URL}/diagnostic/patient/${patientId}`)
            ]);
            setPatient(patientRes.data);
            setEvaluations(evalsRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Estás seguro de eliminar esta evaluación?')) {
            try {
                await axios.delete(`${API_URL}/diagnostic/${id}`);
                fetchData();
            } catch (error) {
                alert('Error al eliminar evaluación');
            }
        }
    };

    const calculateAge = (birthDate) => {
        const hoy = new Date();
        const nacimiento = new Date(birthDate);
        let edadAnos = hoy.getFullYear() - nacimiento.getFullYear();
        let edadMeses = hoy.getMonth() - nacimiento.getMonth();
        if (edadMeses < 0) {
            edadAnos--;
            edadMeses += 12;
        }
        return `${edadAnos} años y ${edadMeses} meses`;
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
                    <h2>Evaluaciones Diagnósticas</h2>
                    <Link to={`/patients/${patientId}/diagnostic/new`} className="btn-primary">
                        + Nueva Evaluación
                    </Link>
                </div>

                <div className="patient-info-box">
                    <h3>Paciente</h3>
                    <p><strong>Nombre:</strong> {patient.nombre} {patient.apellido}</p>
                    <p><strong>Edad:</strong> {calculateAge(patient.fecha_nacimiento)}</p>
                </div>

                <div className="copyright-notice">
                    <p><strong>Instrumentos de diagnóstico:</strong> ADOS-2, ADI-R, CARS, GARS, SCQ, STAT, CBA. 
                    Estos instrumentos están protegidos por copyright. Este módulo permite registrar resultados de evaluaciones 
                    realizadas con los instrumentos oficiales adquiridos legalmente.</p>
                </div>

                {evaluations.length === 0 ? (
                    <div className="empty-state">
                        <p>No hay evaluaciones diagnósticas registradas para este paciente.</p>
                        <Link to={`/patients/${patientId}/diagnostic/new`} className="btn-primary">
                            Registrar Primera Evaluación
                        </Link>
                    </div>
                ) : (
                    <div className="evaluations-list">
                        {evaluations.map(evalItem => (
                            <div key={evalItem.id} className="evaluation-card">
                                <div className="eval-header">
                                    <div className="eval-instrument">
                                        <span className="instrument-name">{evalItem.instrumento}</span>
                                        {evalItem.area_evaluada && (
                                            <span className="area-badge">{evalItem.area_evaluada}</span>
                                        )}
                                    </div>
                                    <div className="eval-date">
                                        {new Date(evalItem.fecha_evaluacion).toLocaleDateString('es-EC')}
                                    </div>
                                </div>

                                <div className="eval-details">
                                    {evalItem.edad_evaluacion && (
                                        <p><strong>Edad al evaluar:</strong> {evalItem.edad_evaluacion}</p>
                                    )}
                                    {evalItem.nivel_gravedad && (
                                        <div className="nivel-badge" style={{ backgroundColor: NIVELES_GRAVEDAD[evalItem.nivel_gravedad]?.color }}>
                                            {NIVELES_GRAVEDAD[evalItem.nivel_gravedad]?.label} - {NIVELES_GRAVEDAD[evalItem.nivel_gravedad]?.desc}
                                        </div>
                                    )}
                                </div>

                                {evalItem.resultado && (
                                    <div className="eval-result">
                                        <strong>Resultado:</strong>
                                        <p>{evalItem.resultado}</p>
                                    </div>
                                )}

                                {evalItem.observaciones && (
                                    <div className="eval-observations">
                                        <strong>Observaciones:</strong>
                                        <p>{evalItem.observaciones}</p>
                                    </div>
                                )}

                                {evalItem.recomendaciones && (
                                    <div className="eval-recommendations">
                                        <strong>Recomendaciones:</strong>
                                        <p>{evalItem.recomendaciones}</p>
                                    </div>
                                )}

                                <div className="eval-footer">
                                    <span className="eval-doctor">
                                        Evaluador: {evalItem.doctor_nombre} {evalItem.doctor_apellido}
                                    </span>
                                    <div className="eval-actions">
                                        <button 
                                            onClick={() => navigate(`/patients/${patientId}/diagnostic/${evalItem.id}/edit`)}
                                            className="btn-small"
                                        >
                                            Editar
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(evalItem.id)}
                                            className="btn-small btn-danger"
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <Link to={`/patients/${patientId}`} className="back-link">← Volver al Perfil</Link>
            </main>
        </div>
    );
};

export default DiagnosticList;