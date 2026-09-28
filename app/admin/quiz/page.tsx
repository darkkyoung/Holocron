import {requireAdminSession} from '@/lib/admin/session';
import {getQuizManagementState} from '@/lib/quiz/service';
import QuizAdmin from '@/components/quiz/quiz-admin';

export const dynamic='force-dynamic';

export default async function AdminQuizPage(){
  await requireAdminSession();
  return <QuizAdmin initialState={await getQuizManagementState()}/>;
}
