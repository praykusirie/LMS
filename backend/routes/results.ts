import { Router } from 'express';
import type { Request, Response } from 'express';
import * as XLSX from 'xlsx';
import { pool } from '../lib/db.js';
import { getSessionUser } from '../lib/session.js';

const router = Router();

// Calculate grade from percentage
const calculateGrade = (percentage: number): string => {
    if (percentage >= 90) return 'A*';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    if (percentage >= 40) return 'E';
    return 'U';
};

// Get results for a class
router.get('/', async (req: Request, res: Response) => {
    try {
        const { class_id } = req.query;
        
        if (!class_id) {
            res.status(400).json({ error: 'Class ID is required' });
            return;
        }
        
        // Get all activities for this class
        const activitiesResult = await pool.query(
            `SELECT id, name, activity_id, total_marks, date
             FROM activities
             WHERE class_id = $1 AND is_active = true
             ORDER BY date, created_at`,
            [class_id]
        );
        
        const activities = activitiesResult.rows;
        
        if (activities.length === 0) {
            res.json({
                activities: [],
                students: [],
                summary: { totalActivities: 0, classAverage: 0 }
            });
            return;
        }
        
        // Get all students in class with their marks
        const studentsResult = await pool.query(
            `SELECT s.id, s.name, s.student_id, s.avatar, s.class_id
             FROM students s
             WHERE s.class_id = $1 AND s.is_active = true
             ORDER BY s.name`,
            [class_id]
        );
        
        const students = studentsResult.rows;
        
        // Get marks for all activities
        const activityIds = activities.map(a => a.id);
        const marksResult = await pool.query(
            `SELECT am.student_id, am.activity_id, am.marks_obtained, a.total_marks
             FROM activity_marks am
             JOIN activities a ON a.id = am.activity_id
             WHERE am.activity_id = ANY($1)`,
            [activityIds]
        );
        
        // Build marks map
        const marksMap = new Map();
        marksResult.rows.forEach(mark => {
            const key = `${mark.student_id}-${mark.activity_id}`;
            marksMap.set(key, {
                marksObtained: mark.marks_obtained,
                totalMarks: mark.total_marks
            });
        });
        
        // Count marks per activity to find completed activities
        const activityMarkCounts = new Map();
        marksResult.rows.forEach(mark => {
            const count = activityMarkCounts.get(mark.activity_id) || 0;
            activityMarkCounts.set(mark.activity_id, count + 1);
        });
        
        // Filter to only completed activities (all students have marks)
        const completedActivityIds = activities
            .filter(a => activityMarkCounts.get(a.id) === students.length)
            .map(a => a.id);
        
        const completedActivities = activities.filter(a => completedActivityIds.includes(a.id));
        
        // Calculate results for each student (only for completed activities)
        const studentResults = students.map(student => {
            const activityResults = completedActivities.map(activity => {
                const key = `${student.id}-${activity.id}`;
                const mark = marksMap.get(key);
                return {
                    activityId: activity.id,
                    activityName: activity.name,
                    marksObtained: mark?.marksObtained ?? 0,
                    totalMarks: activity.total_marks
                };
            });
            
            // Calculate average: sum of marks / number of completed activities
            const completedCount = completedActivities.length;
            const obtainedMarksSum = activityResults.reduce((sum, a) => sum + a.marksObtained, 0);
            const average = completedCount > 0 ? obtainedMarksSum / completedCount : 0;
            
            // Calculate percentage based on average
            const percentage = completedCount > 0 ? (average / 50) * 100 : 0;
            
            return {
                ...student,
                activities: activityResults,
                totalObtained: obtainedMarksSum,
                totalPossible: completedCount * 50,
                average: Math.round(average * 100) / 100,
                percentage: Math.round(percentage * 100) / 100,
                grade: calculateGrade(percentage),
                completedActivities: completedCount,
                totalActivities: activities.length
            };
        });
        
        // Sort by average for position/rank
        studentResults.sort((a, b) => b.average - a.average);
        
        // Assign positions using competition ranking (1224 style - skip positions for ties)
        let currentPosition = 1;
        let previousAverage = -1;
        let studentsProcessed = 0;
        studentResults.forEach((student) => {
            if (student.average !== previousAverage && studentsProcessed > 0) {
                // New average, update position to current count + 1
                currentPosition = studentsProcessed + 1;
            }
            student.position = currentPosition;
            previousAverage = student.average;
            studentsProcessed++;
        });
        
        // Class summary
        const classAverage = studentResults.length > 0
            ? studentResults.reduce((sum, s) => sum + s.average, 0) / studentResults.length
            : 0;
        
        res.json({
            activities: completedActivities.map(a => ({
                id: a.id,
                name: a.name,
                activityId: a.activity_id,
                totalMarks: a.total_marks,
                date: a.date
            })),
            allActivitiesCount: activities.length,
            students: studentResults,
            summary: {
                totalActivities: activities.length,
                completedActivities: completedActivities.length,
                totalStudents: students.length,
                classAverage: Math.round(classAverage * 100) / 100,
                classGrade: calculateGrade((classAverage / 50) * 100)
            }
        });
    } catch (error) {
        console.error('Error fetching results:', error);
        res.status(500).json({ error: 'Failed to fetch results' });
    }
});

// Export results to Excel
router.get('/export', async (req: Request, res: Response) => {
    try {
        const { class_id } = req.query;
        
        if (!class_id) {
            res.status(400).json({ error: 'Class ID is required' });
            return;
        }
        
        // Get class name
        const classResult = await pool.query(
            'SELECT name FROM classes WHERE id = $1',
            [class_id]
        );
        const className = classResult.rows[0]?.name || 'Unknown';
        
        // Get all activities for this class
        const activitiesResult = await pool.query(
            `SELECT id, name, activity_id, total_marks, date
             FROM activities
             WHERE class_id = $1 AND is_active = true
             ORDER BY date, created_at`,
            [class_id]
        );
        
        const activities = activitiesResult.rows;
        
        // Get all students in class
        const studentsResult = await pool.query(
            `SELECT s.id, s.name, s.student_id
             FROM students s
             WHERE s.class_id = $1 AND s.is_active = true
             ORDER BY s.name`,
            [class_id]
        );
        
        const students = studentsResult.rows;
        
        if (activities.length === 0 || students.length === 0) {
            res.status(400).json({ error: 'No data to export' });
            return;
        }
        
        // Get marks
        const activityIds = activities.map(a => a.id);
        const marksResult = await pool.query(
            `SELECT am.student_id, am.activity_id, am.marks_obtained
             FROM activity_marks am
             WHERE am.activity_id = ANY($1)`,
            [activityIds]
        );
        
        const marksMap = new Map();
        marksResult.rows.forEach(mark => {
            marksMap.set(`${mark.student_id}-${mark.activity_id}`, mark.marks_obtained);
        });
        
        // Calculate results
        const calculateGrade = (percentage: number): string => {
            if (percentage >= 90) return 'A*';
            if (percentage >= 80) return 'A';
            if (percentage >= 70) return 'B';
            if (percentage >= 60) return 'C';
            if (percentage >= 50) return 'D';
            if (percentage >= 40) return 'E';
            return 'U';
        };
        
        const studentResults = students.map(student => {
            const row: any = {
                'Student ID': student.student_id,
                'Student Name': student.name,
            };
            
            let totalObtained = 0;
            let totalPossible = 0;
            
            activities.forEach(activity => {
                const marks = marksMap.get(`${student.id}-${activity.id}`);
                row[`${activity.name} (${activity.total_marks})`] = marks ?? '-';
                if (marks !== undefined) {
                    totalObtained += marks;
                    totalPossible += activity.total_marks;
                }
            });
            
            const average = totalPossible > 0 ? (totalObtained / totalPossible) * 100 : 0;
            
            row['Total Obtained'] = totalObtained;
            row['Total Possible'] = totalPossible;
            row['Average (%)'] = Math.round(average * 100) / 100;
            row['Grade'] = calculateGrade(average);
            
            return { ...row, _average: average };
        });
        
        // Sort by average and assign position
        studentResults.sort((a, b) => b._average - a._average);
        studentResults.forEach((row, index) => {
            row['Position'] = index + 1;
            delete row._average;
        });
        
        // Create Excel
        const ws = XLSX.utils.json_to_sheet(studentResults);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Results');
        
        // Generate buffer
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="results_${className.replace(/\s+/g, '_')}.xlsx"`);
        res.send(buffer);
    } catch (error) {
        console.error('Error exporting results:', error);
        res.status(500).json({ error: 'Failed to export results' });
    }
});

export default router;
