import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Problem, SolutionStep } from '../types';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { MathIframeRenderer } from '../components/MathIframeRenderer';

// Icons
const TrashIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const BulbIcon = () => (
  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

// Advanced Math Symbols for the Editor
// Updated: Added Subscript, Therefore, Because, Similar, Approx, etc.
const MATH_TOOLS = [
  { label: '√', type: 'wrap', before: '\\sqrt{', after: '}', desc: '루트' },
  { label: '분수', type: 'template', template: '\\frac{}{}', cursorOffset: 6, desc: '분수' }, // \frac{}{}
  { label: 'x²', type: 'append', text: '^2', desc: '제곱(위 첨자)' },
  { label: 'xₙ', type: 'template', template: '_{}', cursorOffset: 2, desc: '아래 첨자' }, // Subscript
  { label: '×', type: 'append', text: '\\times', desc: '곱하기' },
  { label: '÷', type: 'append', text: '\\div', desc: '나누기' },
  { label: '∴', type: 'append', text: '\\therefore', desc: '따라서' },
  { label: '∵', type: 'append', text: '\\because', desc: '왜냐하면' },
  { label: '∽', type: 'append', text: '\\sim', desc: '닮음/유사' },
  { label: '≈', type: 'append', text: '\\approx', desc: '근사값' },
  { label: '≡', type: 'append', text: '\\equiv', desc: '합동/동치' },
  { label: 'π', type: 'append', text: '\\pi', desc: '파이' },
  { label: 'θ', type: 'append', text: '\\theta', desc: '세타' },
  { label: '≤', type: 'append', text: '\\le', desc: '이하' },
  { label: '≥', type: 'append', text: '\\ge', desc: '이상' },
  { label: '≠', type: 'append', text: '\\neq', desc: '같지 않다' },
  { label: '∞', type: 'append', text: '\\infty', desc: '무한' },
];

// Helper Component for Rendering Mixed Text + Math
// HTML이 아닌 일반 텍스트/LaTeX이면 한 줄씩 $...$로 감싸 MathJax 렌더링을 유도한다.
export const ProblemSolver: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const attemptIdRef = useRef<string | null>(null);
  const firstInputRef = useRef<string | null>(null);
  
  const TOTAL_PROBLEMS = 12;
  const [currentProblemIndex, setCurrentProblemIndex] = useState(1);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [problemSetId, setProblemSetId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [typingIntensity, setTypingIntensity] = useState(0); // 0~1: 입력 속도 기반 즉각 반응 효과

  // Steps State
  const [steps, setSteps] = useState<Array<SolutionStep & { createdAt: string; updatedAt: string }>>([
    { id: '1', content: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ]);
  const [focusedStepId, setFocusedStepId] = useState<string>('1'); 
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [expectedScore, setExpectedScore] = useState<number | ''>(''); // 최종 제출 시에만 사용
  const [selfConfidence, setSelfConfidence] = useState<number | ''>('');
  const [isFocused, setIsFocused] = useState<boolean>(false);
  
  // Hints State
  const [showConceptHint, setShowConceptHint] = useState(false);
  const [showProcedureHint, setShowProcedureHint] = useState(false);
  
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const startTimeRef = useRef<number>(Date.now());
  const initializedRef = useRef<boolean>(false);
  const keyTimesRef = useRef<number[]>([]);

  // Derived state for the active step content
  const activeStep = steps.find(s => s.id === focusedStepId);

  // 보기 번호 앞에만 줄바꿈을 넣어주는 포매터
  const addChoiceBreaks = (raw: string) => {
    if (!raw) return '';
    return raw.replace(/\s*(①|②|③|④|⑤)/g, '<br>$1');
  };

  // 단계별 풀이 렌더링용: 수식 구분자가 없으면 전체를 $...$로 감싼다.
  const asMath = (raw: string) => {
    if (!raw) return '';
    const hasDelim = /(\$|\\\(|\\\[)/.test(raw);
    return hasDelim ? raw : `$${raw}$`;
  };

  // 최종 제출/포기 시 예상 점수를 요청
  const requestExpectedScore = (): number | undefined => {
    let finalScore = expectedScore;
    if (finalScore === '' || isNaN(Number(finalScore))) {
      const v = window.prompt('모든 문항을 마쳤습니다. 예상 점수(0~100)를 입력해주세요.', '');
      if (v === null) return undefined;
      const n = Number(v);
      if (Number.isNaN(n) || n < 0 || n > 100) {
        alert('0~100 사이의 숫자를 입력해주세요.');
        return undefined;
      }
      setExpectedScore(n);
      finalScore = n;
    }
    return Number(finalScore);
  };

  // --- Initialization & Data Fetching ---
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (initializedRef.current) return;
    initializedRef.current = true;
    loadExistingProblems();
  }, [user, navigate]);

  const loadExistingProblems = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.getCurrentProblemSet(user.id);
      setProblemSetId(res.problemSetId);
      setProblems(res.problems || []);
      setCurrentProblemIndex(1);
      prepareProblem(res.problems?.[0] || null, res.problemSetId);
    } catch (err) {
      console.error(err);
      alert('문제를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const prepareProblem = async (data: Problem | null, setIdOverride?: string) => {
    if (!data) {
      setProblem(null);
      return;
    }
    setProblem(data);
    const firstId = Date.now().toString();
    const nowIso = new Date().toISOString();
    setSteps([{ id: firstId, content: '', createdAt: nowIso, updatedAt: nowIso }]);
    setFocusedStepId(firstId);
    setSelectedOption(null);
    setShowConceptHint(false);
    setShowProcedureHint(false);
    startTimeRef.current = Date.now();
    const targetSetId = setIdOverride || problemSetId;
    if (user && targetSetId) {
      const attempt = await api.startAttempt({
        userId: user.id,
        problemId: data.id,
        problemSetId: targetSetId,
        problem: {
          title: data.title,
          description: data.description,
          answer: data.answer,
          topic: data.questionTopicName || data.contentArea || data.evaluationArea,
          difficulty: data.difficulty,
          grade: user.grade,
        },
      });
      attemptIdRef.current = attempt.id;
      firstInputRef.current = null;
    }
  };

  // --- Step Management ---
  const addStep = () => {
    const newId = Date.now().toString();
    const nowIso = new Date().toISOString();
    setSteps(prev => [...prev, { id: newId, content: '', createdAt: nowIso, updatedAt: nowIso }]);
    setFocusedStepId(newId);
    if (attemptIdRef.current) {
      api.logAttemptEvents(attemptIdRef.current, [
        { eventType: 'STEP_CREATED', stepIndex: steps.length, clientTimestamp: new Date().toISOString() },
      ]);
    }
  };

  const removeStep = (id: string) => {
    if (steps.length <= 1) {
      setSteps(prev => prev.map(s => s.id === id ? { ...s, content: '', updatedAt: new Date().toISOString() } : s));
      return;
    }
    setSteps(prev => prev.filter(step => step.id !== id));
    if (focusedStepId === id) {
      setFocusedStepId(steps[0].id); // Fallback to first if deleted active
    }
    if (attemptIdRef.current) {
      api.logAttemptEvents(attemptIdRef.current, [
        { eventType: 'STEP_DELETED', stepIndex: steps.findIndex(s => s.id === id), clientTimestamp: new Date().toISOString() },
      ]);
    }
  };

  const updateStepContent = (id: string, content: string) => {
    if (!firstInputRef.current) {
      firstInputRef.current = new Date().toISOString();
      if (attemptIdRef.current) {
        api.logAttemptEvents(attemptIdRef.current, [
          { eventType: 'FIRST_INPUT', stepIndex: steps.findIndex(s => s.id === id), clientTimestamp: firstInputRef.current },
        ]);
      }
    }
    const nowIso = new Date().toISOString();
    setSteps(prev => prev.map(step => step.id === id ? { ...step, content, updatedAt: nowIso } : step));
    if (attemptIdRef.current) {
      api.logAttemptEvents(attemptIdRef.current, [
        { eventType: 'KEY_INPUT', stepIndex: steps.findIndex(s => s.id === id), clientTimestamp: new Date().toISOString(), payload: { length: content.length } },
        { eventType: 'STEP_UPDATED', stepIndex: steps.findIndex(s => s.id === id), clientTimestamp: nowIso },
      ]);
    }
  };

  // --- Editor Logic (Right Pane) ---
  const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (focusedStepId) {
      updateStepContent(focusedStepId, e.target.value);
    }
  };

  const handleTypingPing = () => {
    const now = Date.now();
    const windowMs = 3000;
    keyTimesRef.current = keyTimesRef.current.filter((t) => now - t < windowMs);
    keyTimesRef.current.push(now);
    const ratePerSec = keyTimesRef.current.length / (windowMs / 1000);
    const target = Math.min(1.5, ratePerSec / 2.5); // 최대치를 더 높이고, 더 빠르게 반응
    setTypingIntensity((prev) => {
      // 간단한 저역 통과 필터로 부드럽게 변화
      const alpha = 0.35;
      return prev * (1 - alpha) + target * alpha;
    });
  };

  // 자연스러운 감쇠 효과
  useEffect(() => {
    const decay = setInterval(() => {
      setTypingIntensity((prev) => Math.max(0, prev - 0.05));
    }, 200);
    return () => clearInterval(decay);
  }, []);

  const handleFocusIn = () => {
    if (isFocused) return;
    setIsFocused(true);
    const nowIso = new Date().toISOString();
    if (!firstInputRef.current) {
      firstInputRef.current = nowIso;
      if (attemptIdRef.current) {
        api.logAttemptEvents(attemptIdRef.current, [
          { eventType: 'FIRST_INPUT', clientTimestamp: nowIso },
          { eventType: 'FOCUS_IN', clientTimestamp: nowIso },
        ]);
        return;
      }
    }
    if (attemptIdRef.current) {
      api.logAttemptEvents(attemptIdRef.current, [
        { eventType: 'FOCUS_IN', clientTimestamp: nowIso },
      ]);
    }
  };

  const handleFocusOut = () => {
    if (!isFocused) return;
    setIsFocused(false);
    if (attemptIdRef.current) {
      api.logAttemptEvents(attemptIdRef.current, [
        { eventType: 'FOCUS_OUT', clientTimestamp: new Date().toISOString() },
      ]);
    }
  };

  const handleEditorTool = (tool: typeof MATH_TOOLS[0]) => {
    const textarea = editorRef.current;
    if (!textarea || !focusedStepId) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    
    let newText = '';
    let newCursorPos = end;

    if (tool.type === 'wrap') {
        const inserted = tool.before + (selected || '') + tool.after!;
        newText = text.substring(0, start) + inserted + text.substring(end);
        if (selected.length > 0) {
            newCursorPos = start + inserted.length;
        } else {
            newCursorPos = start + tool.before!.length; 
        }
    } else if (tool.type === 'template') {
        newText = text.substring(0, start) + tool.template + text.substring(end);
        newCursorPos = start + (tool.cursorOffset || 0);
    } else if (tool.type === 'append') {
        newText = text.substring(0, start) + tool.text + text.substring(end);
        newCursorPos = start + tool.text!.length;
    }

    // Update the step content immediately
    updateStepContent(focusedStepId, newText);
    
    // Restore focus and set cursor
    setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // --- Submission Logic ---
  const handleNext = async () => {
    if (!problem) return;
    
    if (selectedOption === null) {
      alert("정답을 선택해주세요.");
      return;
    }
    if (steps.every(s => s.content.trim() === '')) {
      alert("최소 한 단계 이상의 풀이를 작성해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const isFinal = currentProblemIndex >= (problems.length || TOTAL_PROBLEMS);
      let finalExpectedForSubmit: number | undefined = undefined;
      // 최종 제출 시 예상 점수 입력 유도
      if (isFinal) {
        const val = requestExpectedScore();
        if (val === undefined) {
          setSubmitting(false);
          return;
        }
        finalExpectedForSubmit = val;
      }

      // persist steps and events to backend
      if (attemptIdRef.current) {
        await api.saveAttemptSteps(attemptIdRef.current, steps.map((s, idx) => ({
          stepIndex: idx,
          content: s.content,
          isDeleted: false,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        })));
        await api.logAttemptEvents(attemptIdRef.current, [
          { eventType: 'SUBMIT_CLICK', clientTimestamp: new Date().toISOString() },
          { eventType: 'EVAL_RESULT', clientTimestamp: new Date().toISOString(), payload: { selectedOption } },
        ]);
        await api.submitAttempt(attemptIdRef.current, {
          result: selectedOption === 0 ? 'correct' : 'incorrect', // 간이 채점(임시). 추후 실제 채점 로직 대체.
          submittedAt: new Date().toISOString(),
          firstInputAt: firstInputRef.current || undefined,
          expectedScore: isFinal ? finalExpectedForSubmit : undefined,
          selfConfidence: selfConfidence === '' ? undefined : Number(selfConfidence),
        });
        await api.processAttempt(attemptIdRef.current);
      }

      const solutionData = {
        problemId: problem.id,
        solutionSteps: steps.map(s => s.content),
        selectedOption: selectedOption,
        usedConceptHint: showConceptHint,
        usedProcedureHint: showProcedureHint,
        startedAt: new Date(startTimeRef.current).toISOString(),
        submittedAt: new Date().toISOString()
      };

      await api.submitSolution(solutionData);

      if (currentProblemIndex < (problems.length || TOTAL_PROBLEMS)) {
        const nextIdx = currentProblemIndex + 1;
        setCurrentProblemIndex(nextIdx);
        await prepareProblem(problems[nextIdx - 1], problemSetId);
        window.scrollTo(0, 0);
      } else {
        setAnalyzing(true);
        if (problemSetId) {
          try {
            const res = await api.processProblemSetFeatures(problemSetId);
            navigate(`/snapshots/${res?.problemSetId || problemSetId}`);
            return;
          } catch (e) {
            console.error('feature/report processing failed', e);
          }
        }
        setAnalyzing(false);
      }
    } catch (err) {
      alert('제출에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGiveUp = async () => {
    setSubmitting(true);
    try {
      const isFinal = currentProblemIndex >= (problems.length || TOTAL_PROBLEMS);
      let finalExpectedForSubmit: number | undefined = undefined;
      if (isFinal) {
        const val = requestExpectedScore();
        if (val === undefined) {
          setSubmitting(false);
          return;
        }
        finalExpectedForSubmit = val;
      }

      // 현재까지 단계/이벤트를 저장
      if (attemptIdRef.current) {
        await api.saveAttemptSteps(attemptIdRef.current, steps.map((s, idx) => ({
          stepIndex: idx,
          content: s.content,
          isDeleted: false,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        })));
        await api.logAttemptEvents(attemptIdRef.current, [
          { eventType: 'GIVE_UP', clientTimestamp: new Date().toISOString() },
          { eventType: 'EVAL_RESULT', clientTimestamp: new Date().toISOString(), payload: { selectedOption } },
        ]);
        await api.submitAttempt(attemptIdRef.current, {
          result: 'gave_up',
          submittedAt: new Date().toISOString(),
          firstInputAt: firstInputRef.current || undefined,
          expectedScore: isFinal ? finalExpectedForSubmit : undefined,
          selfConfidence: selfConfidence === '' ? undefined : Number(selfConfidence),
        });
        await api.processAttempt(attemptIdRef.current);
      }

      // 다음 문제로 이동
      if (currentProblemIndex < (problems.length || TOTAL_PROBLEMS)) {
        const nextIdx = currentProblemIndex + 1;
        setCurrentProblemIndex(nextIdx);
        await prepareProblem(problems[nextIdx - 1], problemSetId);
        window.scrollTo(0, 0);
      } else {
        // 마지막 문항 포기: feature/report 처리까지 실행
        if (problemSetId) {
          setAnalyzing(true);
          try {
            const res = await api.processProblemSetFeatures(problemSetId);
            navigate(`/snapshots/${res?.problemSetId || problemSetId}`);
            return;
          } catch (e) {
            console.error('feature/report processing failed', e);
          } finally {
            setAnalyzing(false);
          }
        }
        navigate('/dashboard');
      }
    } catch (err) {
      alert('포기 처리 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || analyzing) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">처리 중... (최대 2분 소요)</div>;
  if (!problem) return <div className="p-8 text-center">문제가 아직 생성되지 않았습니다. 회원가입 이후 생성된 문제 세트가 필요합니다.</div>;

  return (
    <div
      className="min-h-screen flex flex-col transition-[box-shadow,border-color,background-image,background-color] duration-300 ease-out"
      style={{
        boxShadow: `0 0 ${90 + 280 * typingIntensity}px ${28 * typingIntensity}px rgba(76,29,149,${0.5 + 0.85 * typingIntensity})`,
        border: `3px solid rgba(67,56,202,${0.55 + 0.7 * typingIntensity})`,
        backgroundColor: `rgb(${236 + 32 * typingIntensity}, ${238 + 34 * typingIntensity}, ${248 + 22 * typingIntensity})`,
        backgroundImage:
          typingIntensity > 0
            ? `radial-gradient(circle at 8% 12%, rgba(99,102,241,${0.32 * typingIntensity}) 0, transparent 62%),
               radial-gradient(circle at 92% 88%, rgba(59,130,246,${0.3 * typingIntensity}) 0, transparent 64%),
               linear-gradient(135deg, rgba(88,28,135,${0.26 * typingIntensity}), rgba(255,255,255,0))`
            : 'none',
      }}
    >
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <div className="flex items-center gap-4">
             <Button
               variant="outline"
               onClick={async () => {
                 if (user) {
                    try {
                      console.log('[ui] resetSolves requested', { userId: user.id, problemSetId });
                      await api.resetSolves(user.id, problemSetId || undefined);
                      console.log('[ui] resetSolves completed');
                    } catch (e) {
                      console.error('resetSolves failed', e);
                    }
                 }
                 navigate('/dashboard');
               }}
               className="text-sm"
             >
               ← 나가기
             </Button>
             <div className="flex flex-col">
               <span className="font-bold text-gray-900">문제 풀이</span>
               <div className="flex items-center gap-2">
                 <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                   <div 
                     className="h-full bg-indigo-600 transition-all duration-500" 
                     style={{ width: `${(currentProblemIndex / TOTAL_PROBLEMS) * 100}%` }}
                   ></div>
                 </div>
                 <span className="text-xs text-gray-500 font-mono">{currentProblemIndex} / {TOTAL_PROBLEMS}</span>
               </div>
             </div>
          </div>
          <div className="text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
            {(problem.evaluationArea || problem.category || '문항') } • {problem.difficulty || ''}
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Problem & Steps (Span 2) */}
        <div className="lg:col-span-2 space-y-8">
            {/* Question Area */}
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
                <h1 className="text-2xl font-bold text-gray-900 mb-4 word-keep-all leading-snug">
                  {problem.contentArea || problem.title || problem.questionTopic || problem.questionTopicName || '문제'}
                </h1>
                <div className="bg-white rounded-lg border border-gray-200 mb-6">
                    <MathIframeRenderer content={addChoiceBreaks(problem.description || problem.questionText || problem.content || '')} height={340} />
                </div>

                {/* Hints */}
                <div className="flex gap-3">
                    <button
                        onClick={() => {
                          const next = !showConceptHint;
                          setShowConceptHint(next);
                          if (attemptIdRef.current) {
                            api.logAttemptEvents(attemptIdRef.current, [
                              { eventType: 'HINT_CLICK', clientTimestamp: new Date().toISOString(), payload: { hint_type: 'concept', opened: next } },
                            ]);
                          }
                        }}
                        className={`flex items-center text-sm font-medium px-4 py-2 rounded-lg border transition-colors ${showConceptHint ? 'bg-yellow-50 text-yellow-800 border-yellow-200' : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'}`}
                    >
                        <BulbIcon /> {showConceptHint ? '개념 힌트 닫기' : '개념 힌트 보기'}
                    </button>
                    <button
                        onClick={() => {
                          const next = !showProcedureHint;
                          setShowProcedureHint(next);
                          if (attemptIdRef.current) {
                            api.logAttemptEvents(attemptIdRef.current, [
                              { eventType: 'HINT_CLICK', clientTimestamp: new Date().toISOString(), payload: { hint_type: 'procedure', opened: next } },
                            ]);
                          }
                        }}
                        className={`flex items-center text-sm font-medium px-4 py-2 rounded-lg border transition-colors ${showProcedureHint ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'}`}
                    >
                        <BulbIcon /> {showProcedureHint ? '절차 힌트 닫기' : '절차 힌트 보기'}
                    </button>
                </div>
                {(showConceptHint || showProcedureHint) && (
                    <div className="mt-4 space-y-3 animate-fade-in">
                        {showConceptHint && (
                            <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-lg">
                                <span className="font-bold text-yellow-800 block mb-1">💡 개념 힌트</span>
                                <MathIframeRenderer content={addChoiceBreaks(problem.questionTopic || problem.questionTopicName || problem.conceptHint || '')} height={180} />
                            </div>
                        )}
                        {showProcedureHint && (
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
                                <span className="font-bold text-blue-800 block mb-1">🛠️ 절차 힌트</span>
                                <MathIframeRenderer content={addChoiceBreaks(problem.procedureHint || problem.proceduralHint || '')} height={220} />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Answer Selection */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h2 className="text-lg font-bold text-gray-900 mb-4">정답 선택</h2>
                <div className="grid grid-cols-5 gap-3">
                    {[0,1,2,3,4].map((idx) => (
                    <button
                        key={idx}
                        onClick={() => setSelectedOption(idx)}
                        className={`py-3 px-2 rounded-lg border-2 font-medium transition-all ${
                        selectedOption === idx
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                            : 'border-gray-200 hover:border-indigo-300 text-gray-600'
                        }`}
                    >
                        <span className="text-xs block text-gray-400 mb-1">{idx + 1}번</span>
                        {problem.options && problem.options[idx] ? problem.options[idx] : `선택지 ${idx + 1}`}
                    </button>
                    ))}
                </div>
            </div>

            {/* Steps List (READ ONLY / VIEW) */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900">풀이 과정</h2>
                    <span className="text-sm text-gray-500">단계를 선택하여 우측 에디터에서 내용을 작성하세요.</span>
                </div>

                <div className="space-y-4">
                    {steps.map((step, index) => (
                    <div 
                        key={step.id} 
                        onClick={() => setFocusedStepId(step.id)}
                        className={`group relative bg-white rounded-lg shadow-sm border transition-all flex overflow-hidden cursor-pointer ${
                        focusedStepId === step.id ? 'border-indigo-500 ring-2 ring-indigo-100 shadow-md' : 'border-gray-200 hover:border-indigo-300'
                        }`}
                    >
                        {/* Step Number */}
                        <div className={`w-12 flex-shrink-0 flex items-center justify-center border-r transition-colors ${
                        focusedStepId === step.id ? 'bg-indigo-600 border-indigo-600' : 'bg-gray-50 border-gray-100'
                        }`}>
                            <span className={`font-bold text-lg select-none ${
                                focusedStepId === step.id ? 'text-white' : 'text-gray-400'
                            }`}>{index + 1}</span>
                        </div>
                        
                        {/* Rendered Content View (No Input) */}
                        <div className="flex-grow p-5 min-h-[80px] flex items-center">
                            {step.content && step.content.trim().length > 0 ? (
                              <MathIframeRenderer content={asMath(step.content)} height={140} />
                            ) : (
                              <div className="text-gray-500">
                                {`${index + 1}단계 풀이가 비어있습니다. 선택 후 우측에서 작성해주세요.`}
                              </div>
                            )}
                        </div>

                        {/* Delete Button */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <button 
                                onClick={(e) => { e.stopPropagation(); removeStep(step.id); }}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                title="단계 삭제"
                            >
                                <TrashIcon />
                            </button>
                        </div>
                    </div>
                    ))}
                </div>

                <Button onClick={addStep} variant="secondary" fullWidth className="py-3 border-dashed">
                    <PlusIcon /> 다음 단계 추가
                </Button>
            </div>
        </div>

        {/* RIGHT COLUMN: Math Editor (Sticky, Real-time) */}
        <div className="lg:col-span-1">
            <div className="sticky top-24 bg-white rounded-xl shadow-lg border border-indigo-100 overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
                <div className="bg-indigo-600 px-4 py-3 border-b border-indigo-700 flex justify-between items-center">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        {activeStep ? `${steps.findIndex(s => s.id === focusedStepId) + 1}단계 편집 중` : '편집'}
                    </h3>
                    <span className="text-indigo-200 text-xs">Real-time</span>
                </div>

                {/* Toolbar */}
                <div className="p-3 bg-gray-50 border-b border-gray-200 flex flex-wrap gap-2">
                    {MATH_TOOLS.map((tool) => (
                        <button
                            key={tool.label}
                            onClick={() => handleEditorTool(tool)}
                            title={tool.desc}
                            disabled={!activeStep}
                            className="px-2.5 py-1.5 bg-white border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {tool.label}
                        </button>
                    ))}
                </div>

                {/* Editor Textarea with Dark Mode */}
                <div className="flex-grow flex flex-col p-4 gap-4 overflow-y-auto bg-gray-900">
                    {activeStep ? (
                        <>
                            <div className="flex-grow flex flex-col">
                                <label className="text-xs font-bold text-gray-400 block mb-2">
                                    내용 입력 (줄바꿈 시 각 줄은 자동으로 수식으로 변환됩니다)
                                </label>
                                <textarea
                                    ref={editorRef}
                                    value={activeStep.content}
                                    onChange={handleEditorChange}
                                    onKeyDown={handleTypingPing}
                                    onFocus={handleFocusIn}
                                    onBlur={handleFocusOut}
                                    className="flex-grow w-full p-4 border border-gray-700 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-base leading-relaxed resize-none shadow-inner placeholder-gray-500"
                                    placeholder="예: y = ax + b"
                                    autoFocus
                                />
                            </div>
                            <div className="text-xs text-gray-500 text-center">
                                * 엔터를 눌러 줄을 바꾸면 해당 줄 전체가 수식으로 표현됩니다.
                            </div>
                        </>
                    ) : (
                        <div className="flex-grow flex flex-col items-center justify-center text-gray-500 space-y-2">
                            <svg className="w-12 h-12 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                            </svg>
                            <p>좌측에서 편집할 단계를 선택해주세요.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </main>

      {/* Footer Submission Bar */}
      <div className="bg-white border-t border-gray-200 p-4 shadow-lg z-30">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-end">
          <div className="flex gap-3 justify-end w-full">
            <Button 
              variant="secondary"
              onClick={handleGiveUp}
              disabled={submitting}
              className="px-4 py-3 text-sm"
            >
              포기하기
            </Button>
            <Button 
              onClick={handleNext} 
              disabled={submitting}
              className="px-8 py-3 text-lg w-full sm:w-auto shadow-md"
            >
              {submitting 
                ? '처리 중... (최대 2분 소요)' 
                : currentProblemIndex < TOTAL_PROBLEMS 
                  ? '제출하고 다음 문제 풀기 →' 
                  : '최종 제출하기'
              }
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
