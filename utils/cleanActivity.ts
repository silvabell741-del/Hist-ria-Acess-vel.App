
import { Activity } from '../types';

export function cleanActivity(activity: any): any {
  if (!activity) return null;
  
  // Helper to safely format dates (Firestore Timestamp or Date) to ISO String
  const safeDate = (date: any) => {
      if (!date) return undefined;
      if (typeof date.toDate === 'function') {
          return date.toDate().toISOString();
      }
      if (date instanceof Date) {
          return date.toISOString();
      }
      return date;
  };

  // Manual object construction to prevent "Converting circular structure to JSON" errors
  // caused by JSON.stringify on complex objects (like those containing DOM references or internal Firebase refs).
  return {
    id: activity.id,
    title: activity.title,
    description: activity.description,
    type: activity.type,
    points: activity.points,
    materia: activity.materia,
    unidade: activity.unidade,
    classId: activity.classId,
    className: activity.className, // Preserves className if exists
    imageUrl: activity.imageUrl,
    dueDate: activity.dueDate,
    createdAt: safeDate(activity.createdAt), // Safely convert Timestamp
    questions: activity.questions || [],
    submissions: activity.submissions || [],
    attachmentFiles: activity.attachmentFiles || [],
    isVisible: activity.isVisible,
    allowLateSubmissions: activity.allowLateSubmissions,
    creatorId: activity.creatorId,
    creatorName: activity.creatorName
  };
}
