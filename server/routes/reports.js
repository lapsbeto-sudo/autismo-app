const express = require('express');
const PDFDocument = require('pdfkit');
const { body, validationResult, param } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { queryDb, runDb } = require('../utils/db');

const router = express.Router();

router.use(authenticateToken);

// Generar informe PDF
router.get('/:applicationId/pdf', [
    param('applicationId').isInt()
], (req, res) => {
    try {
        // Obtener datos de la aplicación
        const apps = queryDb(`
            SELECT ta.*, t.nombre as test_nombre, t.codigo as test_codigo, t.descripcion as test_descripcion,
                   p.nombre as patient_nombre, p.apellido as patient_apellido,
                   p.fecha_nacimiento, p.sexo, p.cedula, p.motivo_consulta,
                   u.nombre as doctor_nombre, u.apellido as doctor_apellido, u.especialidad
            FROM test_applications ta
            JOIN tests t ON ta.test_id = t.id
            JOIN patients p ON ta.patient_id = p.id
            JOIN users u ON ta.user_id = u.id
            WHERE ta.id = ?
        `, [req.params.applicationId]);

        if (apps.length === 0) {
            return res.status(404).json({ error: 'Aplicación no encontrada' });
        }

        const app = apps[0];
        const respuestas = JSON.parse(app.respuestas_json);
        const puntuacionSecciones = JSON.parse(app.puntuacion_por_seccion || '{}');

        // Calcular edad
        const hoy = new Date();
        const nacimiento = new Date(app.fecha_nacimiento);
        let edadAnos = hoy.getFullYear() - nacimiento.getFullYear();
        let edadMeses = hoy.getMonth() - nacimiento.getMonth();
        if (edadMeses < 0) {
            edadAnos--;
            edadMeses += 12;
        }

        // Crear PDF
        const doc = new PDFDocument({
            size: 'A4',
            margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });

        // Configurar respuesta
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=informe_${app.test_codigo}_${app.patient_apellido}.pdf`);
        doc.pipe(res);

        // Colores
        const primaryColor = '#2563eb';
        const secondaryColor = '#1e40af';
        const dangerColor = '#dc2626';
        const warningColor = '#d97706';
        const successColor = '#16a34a';

        // Encabezado
        doc.fontSize(24).fillColor(primaryColor).text('INFORME DE EVALUACIÓN', { align: 'center' });
        doc.fontSize(14).fillColor(secondaryColor).text('Trastorno del Espectro Autista', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#666').text('Sistema de Evaluación - Ecuador', { align: 'center' });
        doc.moveDown(1);

        // Línea separadora
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(primaryColor).lineWidth(2).stroke();
        doc.moveDown(1);

        // Datos del Profesional
        doc.fontSize(12).fillColor(primaryColor).text('DATOS DEL PROFESIONAL', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#333');
        doc.text(`Nombre: ${app.doctor_nombre} ${app.doctor_apellido}`);
        doc.text(`Especialidad: ${app.especialidad || 'Psicología Clínica'}`);
        doc.moveDown(1);

        // Datos del Paciente
        doc.fontSize(12).fillColor(primaryColor).text('DATOS DEL PACIENTE', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#333');
        doc.text(`Nombre: ${app.patient_nombre} ${app.patient_apellido}`);
        doc.text(`Fecha de Nacimiento: ${app.fecha_nacimiento}`);
        doc.text(`Edad: ${edadAnos} años y ${edadMeses} meses`);
        doc.text(`Sexo: ${app.sexo === 'M' ? 'Masculino' : 'Femenino'}`);
        if (app.cedula) doc.text(`Cédula: ${app.cedula}`);
        if (app.motivo_consulta) doc.text(`Motivo de Consulta: ${app.motivo_consulta}`);
        doc.moveDown(1);

        // Datos de la Evaluación
        doc.fontSize(12).fillColor(primaryColor).text('DATOS DE LA EVALUACIÓN', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#333');
        doc.text(`Test Aplicado: ${app.test_nombre}`);
        doc.text(`Código: ${app.test_codigo}`);
        doc.text(`Fecha de Aplicación: ${app.fecha_aplicacion}`);
        doc.text(`Método: ${app.test_descripcion}`);
        doc.moveDown(1);

        // Resultados
        doc.fontSize(12).fillColor(primaryColor).text('RESULTADOS', { underline: true });
        doc.moveDown(0.5);

        // Puntuación Total
        doc.fontSize(14).fillColor('#333').text(`Puntuación Total: ${app.puntuacion_total}`, { continued: true });

        // Nivel de Riesgo con color
        let riesgoColor = successColor;
        let riesgoTexto = 'BAJO';
        if (app.nivel_riesgo === 'alto') {
            riesgoColor = dangerColor;
            riesgoTexto = 'ALTO';
        } else if (app.nivel_riesgo === 'medio') {
            riesgoColor = warningColor;
            riesgoTexto = 'MEDIO';
        }
        doc.fontSize(14).fillColor(riesgoColor).text(` | Nivel de Riesgo: ${riesgoTexto}`);
        doc.moveDown(0.5);

        // Puntuación por secciones
        if (Object.keys(puntuacionSecciones).length > 0) {
            doc.fontSize(11).fillColor('#333').text('Desglose por Secciones:');
            doc.moveDown(0.3);
            doc.fontSize(10);
            Object.entries(puntuacionSecciones).forEach(([seccion, puntos]) => {
                doc.text(`  • ${seccion}: ${puntos} puntos`, { indent: 20 });
            });
            doc.moveDown(0.5);
        }

        // Interpretación según el test
        doc.fontSize(11).fillColor('#333').text('INTERPRETACIÓN:');
        doc.moveDown(0.3);
        doc.fontSize(10);

        if (app.nivel_riesgo === 'alto') {
            doc.fillColor(dangerColor).text('Se recomienda derivación urgente a evaluación diagnóstica especializada. Se identificaron indicadores significativos que sugieren la necesidad de una evaluación completa del Trastorno del Espectro Autista.');
        } else if (app.nivel_riesgo === 'medio') {
            doc.fillColor(warningColor).text('Se recomienda seguimiento y reevaluación. Se identificaron algunos indicadores que requieren atención. Se sugiere realizar entrevista de seguimiento o aplicación de instrumentos complementarios.');
        } else {
            doc.fillColor(successColor).text('No se identificaron indicadores significativos de riesgo de TEA en esta evaluación. Se recomienda mantener seguimiento del desarrollo en consultas regulares.');
        }
        doc.moveDown(1);

        // Observaciones
        if (app.observaciones) {
            doc.fontSize(11).fillColor('#333').text('OBSERVACIONES DEL EVALUADOR:');
            doc.moveDown(0.3);
            doc.fontSize(10).text(app.observaciones);
            doc.moveDown(1);
        }

        // Recomendaciones
        doc.fontSize(11).fillColor('#333').text('RECOMENDACIONES:');
        doc.moveDown(0.3);
        doc.fontSize(10);
        
        if (app.recomendaciones) {
            doc.text(app.recomendaciones);
        } else {
            doc.text('1. Este instrumento es de tamizaje y no sustituye una evaluación diagnóstica completa.', { indent: 10 });
            doc.text('2. Los resultados deben ser interpretados por un profesional especializado.', { indent: 10 });
            doc.text('3. Se recomienda integrar los resultados con observación clínica directa.', { indent: 10 });
            doc.text('4. Considerar factores culturales y ambientales en la interpretación.', { indent: 10 });
        }
        doc.moveDown(2);

        // Firmas
        doc.moveTo(50, doc.y).lineTo(250, doc.y).strokeColor('#333').lineWidth(1).stroke();
        doc.moveTo(350, doc.y).lineTo(545, doc.y).strokeColor('#333').lineWidth(1).stroke();
        doc.moveDown(0.5);
        doc.fontSize(9).fillColor('#333');
        doc.text('Firma del Profesional', 100, doc.y, { width: 150, align: 'center' });
        doc.text('Sello', 400, doc.y, { width: 150, align: 'center' });
        doc.moveDown(1);

        // Pie de página
        doc.fontSize(8).fillColor('#999');
        doc.text(`Informe generado el ${new Date().toLocaleDateString('es-EC')} a las ${new Date().toLocaleTimeString('es-EC')}`, { align: 'center' });
        doc.text('Este documento es confidencial y está destinado únicamente al uso del profesional de salud y el paciente.', { align: 'center' });

        doc.end();

    } catch (error) {
        console.error('Error al generar PDF:', error);
        res.status(500).json({ error: 'Error al generar informe PDF' });
    }
});

// Obtener datos del informe (para vista previa)
router.get('/:applicationId', [
    param('applicationId').isInt()
], (req, res) => {
    try {
        const apps = queryDb(`
            SELECT ta.*, t.nombre as test_nombre, t.codigo as test_codigo, t.descripcion as test_descripcion,
                   p.nombre as patient_nombre, p.apellido as patient_apellido,
                   p.fecha_nacimiento, p.sexo, p.cedula, p.motivo_consulta,
                   u.nombre as doctor_nombre, u.apellido as doctor_apellido, u.especialidad
            FROM test_applications ta
            JOIN tests t ON ta.test_id = t.id
            JOIN patients p ON ta.patient_id = p.id
            JOIN users u ON ta.user_id = u.id
            WHERE ta.id = ? AND ta.user_id = ?
        `, [req.params.applicationId, req.user.id]);

        if (apps.length === 0) {
            return res.status(404).json({ error: 'Aplicación no encontrada' });
        }

        const app = apps[0];
        res.json({
            ...app,
            respuestas_json: JSON.parse(app.respuestas_json),
            puntuacion_por_seccion: JSON.parse(app.puntuacion_por_seccion || '{}')
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener datos del informe' });
    }
});

// Editar informe (observaciones, nivel de riesgo, recomendaciones)
router.put('/:applicationId', [
    param('applicationId').isInt(),
    body('observaciones').optional(),
    body('recomendaciones').optional(),
    body('nivel_riesgo').optional().isIn(['bajo', 'medio', 'alto'])
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { observaciones, recomendaciones, nivel_riesgo } = req.body;

        // Verificar que la aplicación existe y pertenece al usuario
        const existing = queryDb(
            'SELECT id FROM test_applications WHERE id = ? AND user_id = ?',
            [req.params.applicationId, req.user.id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Aplicación no encontrada' });
        }

        // Actualizar campos
        const fields = [];
        const values = [];

        if (observaciones !== undefined) {
            fields.push('observaciones = ?');
            values.push(observaciones);
        }

        if (recomendaciones !== undefined) {
            fields.push('recomendaciones = ?');
            values.push(recomendaciones);
        }

        if (nivel_riesgo !== undefined) {
            fields.push('nivel_riesgo = ?');
            values.push(nivel_riesgo);
        }

        if (fields.length > 0) {
            fields.push('modified_at = datetime("now")');
            values.push(req.params.applicationId);

            runDb(
                `UPDATE test_applications SET ${fields.join(', ')} WHERE id = ?`,
                values
            );
        }

        // Obtener la aplicación actualizada
        const updated = queryDb(
            `SELECT ta.*, t.nombre as test_nombre, t.codigo as test_codigo,
                   p.nombre as patient_nombre, p.apellido as patient_apellido
            FROM test_applications ta
            JOIN tests t ON ta.test_id = t.id
            JOIN patients p ON ta.patient_id = p.id
            WHERE ta.id = ?`,
            [req.params.applicationId]
        );

        res.json({
            message: 'Informe actualizado exitosamente',
            application: {
                ...updated[0],
                respuestas_json: JSON.parse(updated[0].respuestas_json),
                puntuacion_por_seccion: JSON.parse(updated[0].puntuacion_por_seccion || '{}')
            }
        });
    } catch (error) {
        console.error('Error al editar informe:', error);
        res.status(500).json({ error: 'Error al editar informe' });
    }
});

module.exports = router;