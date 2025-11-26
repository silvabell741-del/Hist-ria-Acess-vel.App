
import { db } from "../components/firebaseClient";
import { doc, updateDoc, setDoc, increment, writeBatch, collection, addDoc, serverTimestamp, getDoc, Timestamp } from "firebase/firestore";
import { createNotification } from "./createNotification";
import { processGamificationEvent } from "./gamificationEngine";

// Payload Types
export interface SubmitActivityPayload {
    activityId: string;
    content: string;
    user: { id: string; name: string }; // Basic user info needed for denormalization
    activityData: any; // Minimal activity data (title, points, items) to avoid extra reads if possible
}

export interface GradeActivityPayload {
    activityId: string;
    studentId: string;
    grade: number;
    feedback: string;
    scores?: Record<string, number>;
    teacherUser: { id: string; name: string };
}

export interface PostNoticePayload {
    classId: string;
    text: string;
    authorName: string;
    authorId: string;
}

/**
 * Executes a student activity submission directly to Firestore.
 */
export async function executeSubmitActivity(payload: SubmitActivityPayload) {
    const { activityId, content, user, activityData } = payload;
    
    let calculatedGrade = 0;
    let hasTextQuestions = false;
    let answersMap: Record<string, string> = {};
    
    try { answersMap = JSON.parse(content); } catch { /* legacy text */ }

    // Calculate Grade if Auto
    const items = activityData.items || [];
    if (items.length > 0) {
        items.forEach((item: any) => {
            if (item.type === 'text') {
                hasTextQuestions = true;
            } else if (item.type === 'multiple_choice' && item.correctOptionId) {
                if (answersMap[item.id] === item.correctOptionId) {
                    calculatedGrade += (item.points || 0);
                }
            }
        });
    }

    const gradingMode = activityData.gradingConfig?.objectiveQuestions || 'automatic';
    let status = 'Aguardando correção';
    if (gradingMode === 'automatic' && !hasTextQuestions && items.length > 0) {
        status = 'Corrigido';
    }

    const submissionData: any = {
        studentId: user.id,
        studentName: user.name,
        submissionDate: new Date().toISOString(),
        content: content,
        status: status,
        timestamp: serverTimestamp()
    };

    if (status === 'Corrigido') {
        submissionData.grade = calculatedGrade;
        submissionData.gradedAt = new Date().toISOString();
        submissionData.feedback = "Correção automática.";
    }

    const activityRef = doc(db, "activities", activityId);
    const submissionRef = doc(db, "activities", activityId, "submissions", user.id);

    const batch = writeBatch(db);
    batch.set(submissionRef, submissionData);
    
    // We need to read the activity again to update the array safely, or use arrayUnion if we restructure.
    // For now, using a transaction-like read-modify-write is safer but batch is used here for simplicity in offline replay.
    // Ideally, submission lists inside activity doc should be removed for scalability, but maintaining legacy structure:
    
    const activitySnap = await getDoc(activityRef);
    if (activitySnap.exists()) {
        const currentData = activitySnap.data();
        const submissions = currentData.submissions || [];
        const existingIdx = submissions.findIndex((s: any) => s.studentId === user.id);
        
        if (existingIdx > -1) {
            submissions[existingIdx] = { ...submissions[existingIdx], ...submissionData };
        } else {
            submissions.push(submissionData);
        }

        batch.update(activityRef, {
            submissionCount: increment(existingIdx === -1 ? 1 : 0),
            pendingSubmissionCount: increment(status === 'Aguardando correção' && existingIdx === -1 ? 1 : 0),
            submissions: submissions
        });
    }

    await batch.commit();

    // Notifications & Gamification
    if (status === 'Corrigido') {
        await createNotification({
            userId: user.id, actorId: 'system', actorName: 'Sistema', type: 'activity_correction',
            title: 'Atividade Corrigida Automaticamente', text: `Sua atividade "${activityData.title}" foi corrigida. Nota: ${calculatedGrade}`,
            classId: activityData.classId!, activityId: activityId
        });
    }

    await processGamificationEvent(user.id, 'activity_sent', 0);
}

/**
 * Executes teacher grading directly to Firestore.
 */
export async function executeGradeActivity(payload: GradeActivityPayload) {
    const { activityId, studentId, grade, feedback, scores, teacherUser } = payload;
    
    const activityRef = doc(db, "activities", activityId);
    const activitySnap = await getDoc(activityRef);
    
    if (!activitySnap.exists()) return;
    const activityData = activitySnap.data();

    const submissions = activityData.submissions || [];
    const idx = submissions.findIndex((s: any) => s.studentId === studentId);

    if (idx > -1) {
        submissions[idx].grade = grade;
        submissions[idx].feedback = feedback;
        submissions[idx].status = 'Corrigido';
        submissions[idx].gradedAt = new Date().toISOString();
        if (scores) submissions[idx].scores = scores;
        
        const submissionPayload: any = { 
            status: 'Corrigido', 
            grade, 
            feedback, 
            gradedAt: new Date().toISOString() 
        };
        if (scores) submissionPayload.scores = scores;

        const subRef = doc(db, "activities", activityId, "submissions", studentId);
        
        const batch = writeBatch(db);
        batch.set(subRef, submissionPayload, { merge: true });
        batch.update(activityRef, { submissions: submissions, pendingSubmissionCount: increment(-1) });
        await batch.commit();

        await createNotification({
            userId: studentId, actorId: teacherUser.id, actorName: teacherUser.name, type: 'activity_correction',
            title: 'Atividade Corrigida', text: `Sua atividade "${activityData.title}" foi corrigida. Nota: ${grade}`,
            classId: activityData.classId!, activityId: activityId
        });
    }
}

/**
 * Executes posting a notice.
 */
export async function executePostNotice(payload: PostNoticePayload) {
    const { classId, text, authorName, authorId } = payload;
    const noticeId = Date.now().toString();
    const notice = { id: noticeId, text, author: authorName, authorId, timestamp: Timestamp.now() };
    
    const classRef = doc(db, "classes", classId);
    const classSnap = await getDoc(classRef);
    
    if(classSnap.exists()) {
        const currentNotices = classSnap.data().notices || [];
        await updateDoc(classRef, { notices: [notice, ...currentNotices], noticeCount: increment(1) });
        
        const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + 30); 
        await addDoc(collection(db, "broadcasts"), {
            classId, type: 'notice_post', title: 'Novo Aviso', summary: `Professor ${authorName}: "${text}"`,
            authorName: authorName, timestamp: serverTimestamp(), expiresAt: Timestamp.fromDate(expiresAt),
            deepLink: { page: 'join_class' } 
        });
    }
}
