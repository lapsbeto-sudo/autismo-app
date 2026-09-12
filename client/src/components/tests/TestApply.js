import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

import API_URL from '../../config';

const TestApply = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { id: testId } = useParams();
    const [searchParams] = useSearchParams();
    const patientId = searchParams.get('patient');

    const [test, setTest] = useState(null);
    const [patient, setPatient] = useState(null);
    const [respuestas, setRespuestas] = useState({});
    const [observaciones, setObservaciones] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!patientId) {
            navigate('/tests');
            return;
        }
        fetchData();
    }, [testId, patientId]);

    const fetchData = async () => {
        try {
            const [testRes, patientRes] = await Promise.all([
                axios.get(`${API_URL}/tests/${testId}`),
                axios.get(`${API_URL}/patients/${patientId}`)
            ]);
            setTest(testRes.data);
            setPatient(patientRes.data);

            // Inicializar respuestas
            const initialRespuestas = {};
            testRes.data.items.forEach(item => {
                initialRespuestas[item.orden] = '';
            });
            setRespuestas(initialRespuestas);
        } catch (error) {
            setError('Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    const handleRespuesta = (orden, value) => {
        setRespuestas(prev => ({
            ...prev,
            [orden]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            const response = await axios.post(`${API_URL}/tests/${testId}/apply`, {
                patient_id: parseInt(patientId),
                respuestas,
                observaciones
            });

            // Mostrar resultados
            const { application } = response.data;
            
            // Preguntar si desea generar informe
            const generarInforme = window.confirm(
                `Test aplicado exitosamente!\n\n` +
                `Puntuación: ${application.puntuacion_total}\n` +
                `Nivel de riesgo: ${application.nivel_riesgo.toUpperCase()}\n\n` +
                `¿Desea generar el informe PDF ahora?`
            );
            
            if (generarInforme) {
                navigate(`/reports/${application.id}`);
            } else {
                navigate('/patients');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Error al aplicar test');
        } finally {
            setSubmitting(false);
        }
    };

    const renderMCHATItems = () => {
        if (!test || !test.items) return null;

        return test.items.map(item => (
            <div key={item.id} className="test-item">
                <p className="item-text">{item.orden}. {item.texto}</p>
                <div className="item-options">
                    <label>
                        <input
                            type="radio"
                            name={`item_${item.orden}`}
                            value="0"
                            checked={respuestas[item.orden] === '0'}
                            onChange={() => handleRespuesta(item.orden, '0')}
                        />
                        No
                    </label>
                    <label>
                        <input
                            type="radio"
                            name={`item_${item.orden}`}
                            value="1"
                            checked={respuestas[item.orden] === '1'}
                            onChange={() => handleRespuesta(item.orden, '1')}
                        />
                        Sí
                    </label>
                </div>
            </div>
        ));
    };

    const renderITEAItems = () => {
        if (!test || !test.items) return null;

        const sections = {};
        test.items.forEach(item => {
            if (!sections[item.seccion]) {
                sections[item.seccion] = [];
            }
            sections[item.seccion].push(item);
        });

        return Object.entries(sections).map(([section, items]) => (
            <div key={section} className="test-section">
                <h4>{section}</h4>
                {items.map(item => (
                    <div key={item.id} className="test-item">
                        <p className="item-text">{item.orden}. {item.texto}</p>
                        <div className="item-options likert">
                            {[1, 2, 3, 4, 5].map(value => (
                                <label key={value}>
                                    <input
                                        type="radio"
                                        name={`item_${item.orden}`}
                                        value={value}
                                        checked={respuestas[item.orden] === String(value)}
                                        onChange={() => handleRespuesta(item.orden, String(value))}
                                    />
                                    {value}
                                </label>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        ));
    };

    const renderDefaultItems = () => {
        if (!test || !test.items) return null;

        return test.items.map(item => (
            <div key={item.id} className="test-item">
                <p className="item-text">{item.orden}. {item.texto}</p>
                <div className="item-options">
                    {item.opciones_json ? (
                        JSON.parse(item.opciones_json).map((opcion, idx) => (
                            <label key={idx}>
                                <input
                                    type="radio"
                                    name={`item_${item.orden}`}
                                    value={idx}
                                    checked={respuestas[item.orden] === String(idx)}
                                    onChange={() => handleRespuesta(item.orden, String(idx))}
                                />
                                {opcion}
                            </label>
                        ))
                    ) : (
                        <>
                            <label>
                                <input
                                    type="radio"
                                    name={`item_${item.orden}`}
                                    value="0"
                                    checked={respuestas[item.orden] === '0'}
                                    onChange={() => handleRespuesta(item.orden, '0')}
                                />
                                No
                            </label>
                            <label>
                                <input
                                    type="radio"
                                    name={`item_${item.orden}`}
                                    value="1"
                                    checked={respuestas[item.orden] === '1'}
                                    onChange={() => handleRespuesta(item.orden, '1')}
                                />
                                Sí
                            </label>
                        </>
                    )}
                </div>
            </div>
        ));
    };

    if (loading) {
        return <div className="loading">Cargando test...</div>;
    }

    if (!test || !patient) {
        return <div className="error">Error al cargar datos</div>;
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
                    <h2>Aplicar Test: {test.nombre}</h2>
                </div>

                <div className="patient-info-box">
                    <h3>Paciente</h3>
                    <p><strong>Nombre:</strong> {patient.nombre} {patient.apellido}</p>
                    <p><strong>Fecha de nacimiento:</strong> {patient.fecha_nacimiento}</p>
                    <p><strong>Sexo:</strong> {patient.sexo === 'M' ? 'Masculino' : 'Femenino'}</p>
                </div>

                <form onSubmit={handleSubmit} className="test-form">
                    {error && <div className="error-message">{error}</div>}

                    <div className="test-instructions">
                        <p><strong>Instrucciones:</strong> {test.descripcion}</p>
                        <p><strong>Método de aplicación:</strong> {
                            test.metodo_aplicacion === 'autoadmin' ? 'Autoadministrado (cuestionario)' :
                            test.metodo_aplicacion === 'observacion' ? 'Observación directa del niño' :
                            'Entrevista a padres/cuidadores'
                        }</p>
                    </div>

                    <div className="test-items-container">
                        {test.codigo === 'MCHAT-RF' && renderMCHATItems()}
                        {test.codigo === 'ITEA' && renderITEAItems()}
                        {!['MCHAT-RF', 'ITEA'].includes(test.codigo) && renderDefaultItems()}
                    </div>

                    <div className="form-group">
                        <label htmlFor="observaciones">Observaciones del evaluador</label>
                        <textarea
                            id="observaciones"
                            value={observaciones}
                            onChange={(e) => setObservaciones(e.target.value)}
                            rows="4"
                            placeholder="Ingrese observaciones adicionales..."
                        />
                    </div>

                    <div className="form-actions">
                        <button
                            type="button"
                            onClick={() => navigate('/tests')}
                            className="btn-secondary"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="btn-primary"
                        >
                            {submitting ? 'Aplicando...' : 'Aplicar Test'}
                        </button>
                    </div>
                </form>

                <button onClick={logout} className="btn-secondary logout-btn">Cerrar Sesión</button>
                <a href="/dashboard" className="back-link">← Volver al Dashboard</a>
            </main>
        </div>
    );
};

export default TestApply;