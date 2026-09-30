import {Header} from '@/app/newsroom';
import DailyQuiz from '@/components/quiz/daily-quiz';
import ScrollToTop from '@/components/navigation/scroll-to-top';
import PageViewTracker from '@/components/analytics/page-view-tracker';
import {getQuizPageState} from '@/lib/quiz/service';
import {Sparkles} from 'lucide-react';
import PublicGeometry from '@/components/background/public-geometry';

export const dynamic='force-dynamic';

export default async function QuizPage({searchParams}:{searchParams:Promise<{quiz?:string}>}){
  const params=await searchParams;
  const {quiz,archive}=await getQuizPageState(params.quiz);
  return <PublicGeometry variant="quiz"><PageViewTracker route="quiz"/><Header archive="quiz"/><main className="shell quiz-shell">
    <section className="quiz-intro"><div><div className="eyebrow"><span className="yellow-line"/> HOLOCRON / DAILY QUIZ</div><h1>오늘의 <span>은하계 퀴즈.</span></h1><p>하루 한 문제, 가볍게 맞혀보세요. 선택하는 순간 정답과 모두의 선택이 공개됩니다.</p></div><Sparkles size={54}/></section>
    <div className="archive-bar quiz-summary"><div><Sparkles size={20}/><strong>스타워즈 퀴즈</strong><span className="edition">DAILY QUIZ</span></div><span className="archive-count">{archive.length}개의 공개 퀴즈</span></div>
    <DailyQuiz initialQuiz={quiz} archive={archive}/>
    <div className="end-mark"><span/>TRUST YOUR INSTINCTS<span/></div>
  </main><ScrollToTop/></PublicGeometry>;
}
