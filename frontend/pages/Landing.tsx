
import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';

export const Landing: React.FC = () => {
  const navigate = useNavigate();
  
  const methodologyRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const serviceRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* Header */}
      <header className="py-4 px-6 flex justify-between items-center max-w-7xl mx-auto w-full sticky top-0 bg-white/90 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-indigo-200 shadow-md">
            <span className="text-white font-bold text-lg">F</span>
          </div>
          <span className="font-bold text-xl text-gray-900 tracking-tight">FeedFlow</span>
        </div>
        <nav className="hidden md:flex gap-8 text-gray-600 font-medium text-sm">
          <button onClick={() => scrollToSection(methodologyRef)} className="hover:text-indigo-600 transition-colors">학습 방법론</button>
          <button onClick={() => scrollToSection(featuresRef)} className="hover:text-indigo-600 transition-colors">주요 기능</button>
          <button onClick={() => scrollToSection(serviceRef)} className="hover:text-indigo-600 transition-colors">서비스 소개</button>
        </nav>
        <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/login')} className="hidden sm:block text-sm px-4 py-2">로그인</Button>
            <Button onClick={() => navigate('/login?mode=register')} className="text-sm px-4 py-2 shadow-md shadow-indigo-100">시작하기</Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center px-4 py-32 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-4xl space-y-8 animate-fade-in-up">
          <div className="inline-block px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-sm font-semibold mb-4 border border-indigo-100">
            Process-Based Learning Diagnosis
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight word-keep-all">
            당신의 <span className="text-indigo-600">수학 잠재력</span>을 <br/>
            무자각 분석으로 깨우세요
          </h1>
          <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto word-keep-all leading-relaxed">
            단순히 정답만 확인하는 것이 아닙니다. FeedFlow는 당신의 풀이 과정을 분석하여
            생각의 패턴을 찾아내고, 가장 빠른 성장을 위한 맞춤형 진단을 제공합니다.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
            <Button 
              onClick={() => navigate('/login')} 
              className="px-8 py-4 text-lg shadow-xl shadow-indigo-200 hover:shadow-indigo-300 transform hover:-translate-y-1 transition-all"
            >
              무료로 진단 시작하기
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => scrollToSection(methodologyRef)}
              className="px-8 py-4 text-lg border-gray-300"
            >
              더 알아보기
            </Button>
          </div>
        </div>
      </section>

      {/* 1) 학습 방법론 */}
      <section ref={methodologyRef} className="py-24 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-indigo-600 font-bold tracking-wide uppercase text-sm mb-3">Methodology</h2>
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 word-keep-all">형성평가 기반의 무자각 진단 방식</h3>
            <p className="max-w-3xl mx-auto text-gray-600 text-lg leading-relaxed word-keep-all">
              저희 서비스는 형성평가 기반의 분석 방식을 바탕으로 사용자의 문제풀이 과정을 자연스럽게 해석합니다. 
              사용자는 단순히 문제를 해결하는 과정만 남기면 되고, 그 과정에 담긴 사고 흐름과 전략이 자동으로 분석되어 학습 상태를 진단합니다.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100 hover:border-indigo-200 transition-colors">
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-2xl mb-6">🧠</div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">풀이 과정 중심 진단</h4>
              <p className="text-gray-600 leading-relaxed word-keep-all">
                정답 여부에만 의존하는 기존 방식과 달리, 입력 내용·수정·힌트 사용·시간 흐름 등 전체 과정을 분석하여 개념 이해도와 사고 전략을 파악합니다.
              </p>
            </div>
            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100 hover:border-indigo-200 transition-colors">
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-2xl mb-6">🍃</div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">부담 없는 무자각 방식</h4>
              <p className="text-gray-600 leading-relaxed word-keep-all">
                별도의 테스트나 상담 절차 없이 평소처럼 문제를 풀기만 해도, 자연스럽게 학습 상태가 드러나는 구조를 적용합니다.
              </p>
            </div>
            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100 hover:border-indigo-200 transition-colors">
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-2xl mb-6">📊</div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">30가지 Feature 분석</h4>
              <p className="text-gray-600 leading-relaxed word-keep-all">
                이해, 절차, 논리, 메타인지, 지속성 등 학습의 다양한 측면을 세밀하게 측정하여 종합적인 진단이 가능하도록 구성되어 있습니다.
              </p>
            </div>
          </div>

          <div className="bg-indigo-900 rounded-3xl p-8 md:p-12 text-white text-center md:text-left flex flex-col md:flex-row items-center gap-10">
            <div className="flex-1">
              <h4 className="text-2xl font-bold mb-4">왜 이 방법이 효과적인가요?</h4>
              <ul className="space-y-4 text-indigo-100">
                <li className="flex gap-3 items-start">
                  <span className="text-indigo-400 mt-1">✓</span>
                  <span>과정 기반 분석은 반복 실수·개념 부족·전략의 비효율성을 정답률보다 훨씬 정확하게 포착합니다.</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="text-indigo-400 mt-1">✓</span>
                  <span>사용자는 “검사받고 있다”는 느낌 없이, 자신의 학습 상태를 자연스럽게 인지할 수 있습니다.</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="text-indigo-400 mt-1">✓</span>
                  <span>기존의 진단평가·상담 방식이 주는 심리적 부담을 최소화합니다.</span>
                </li>
              </ul>
            </div>
            <div className="hidden md:block w-px h-40 bg-indigo-700"></div>
             <div className="w-24 h-24 md:w-32 md:h-32 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                <span className="text-4xl md:text-5xl">💡</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2) 주요 기능 */}
      <section ref={featuresRef} className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-indigo-600 font-bold tracking-wide uppercase text-sm mb-3">Key Features</h2>
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">서비스가 제공하는 핵심 기능</h3>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <span className="inline-block p-3 bg-blue-50 text-blue-600 rounded-lg mb-4 text-xl">⌨️</span>
              <h4 className="text-lg font-bold text-gray-900 mb-2">텍스트 기반 문제풀이 환경</h4>
              <p className="text-gray-600 text-sm leading-relaxed">
                키보드 입력과 수식 편집기를 활용하여 풀이 과정을 명확하게 작성할 수 있도록 지원합니다. 생각의 흐름을 자연스럽게 기록하세요.
              </p>
            </div>
            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <span className="inline-block p-3 bg-green-50 text-green-600 rounded-lg mb-4 text-xl">📝</span>
              <h4 className="text-lg font-bold text-gray-900 mb-2">자동 문제풀이 로그 수집</h4>
              <p className="text-gray-600 text-sm leading-relaxed">
                풀이 시간, 수정 내역, 단계 흐름, 힌트 사용 등 학습 행위 전반을 자동으로 기록하여 분석의 기초 데이터를 구축합니다.
              </p>
            </div>
            {/* Feature 3 */}
             <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <span className="inline-block p-3 bg-purple-50 text-purple-600 rounded-lg mb-4 text-xl">🔍</span>
              <h4 className="text-lg font-bold text-gray-900 mb-2">30가지 Feature 분석</h4>
              <p className="text-gray-600 text-sm leading-relaxed">
                사용자의 사고 방식, 전략 선택, 개념 이해, 논리 구조 등을 세밀하게 측정하는 30개 분석 지표를 활용합니다.
              </p>
            </div>
            {/* Feature 4 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 lg:col-span-1.5">
              <span className="inline-block p-3 bg-yellow-50 text-yellow-600 rounded-lg mb-4 text-xl">📑</span>
              <h4 className="text-lg font-bold text-gray-900 mb-2">진단 리포트 자동 생성</h4>
              <p className="text-gray-600 text-sm leading-relaxed mb-3">
                일정 학습량 도달 시 진단 리포트가 자동 생성됩니다.
              </p>
              <ul className="text-xs text-gray-500 space-y-1 bg-gray-50 p-3 rounded-lg">
                <li>• 현재 학습 상태 요약</li>
                <li>• 주요 강점과 취약점</li>
                <li>• 근거가 된 학습 과정 신호</li>
                <li>• 학습자에게 필요한 전략 제안</li>
              </ul>
            </div>
             {/* Feature 5 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 lg:col-span-1.5">
              <span className="inline-block p-3 bg-pink-50 text-pink-600 rounded-lg mb-4 text-xl">🎯</span>
              <h4 className="text-lg font-bold text-gray-900 mb-2">맞춤형 문제세트 자동 제공</h4>
              <p className="text-gray-600 text-sm leading-relaxed mb-3">
                진단 리포트 내용을 반영해 AI가 새로운 문제세트를 생성합니다.
              </p>
               <div className="text-xs text-pink-700 bg-pink-50 px-3 py-2 rounded-lg inline-block">
                학습 경로 자동 개인화
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3) 서비스 소개 */}
      <section ref={serviceRef} className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-16 items-start">
            <div className="lg:w-1/2 sticky top-24">
              <h2 className="text-indigo-600 font-bold tracking-wide uppercase text-sm mb-3">Introduction</h2>
              <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 word-keep-all">
                FeedFlow가 지향하는<br/>수학 학습의 미래
              </h3>
              <p className="text-lg text-gray-600 leading-relaxed mb-8 word-keep-all">
                FeedFlow는 사용자가 문제를 풀기만 해도 학습 과정 전체가 자동으로 분석되고, 
                그 결과에 따라 가장 적합한 문제와 조언이 제공되는 <strong>무자각 기반의 학습 플랫폼</strong>입니다.
              </p>
              <Button onClick={() => navigate('/login?mode=register')} className="px-8 py-3 text-lg">지금 바로 경험하기</Button>
            </div>

            <div className="lg:w-1/2 space-y-12">
              <div>
                <h4 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">해결하고자 하는 문제</h4>
                <ul className="space-y-4 text-gray-600">
                  <li className="flex gap-3">
                    <span className="text-red-400 font-bold">!</span>
                    <span>기존 수학 학습은 정답 중심이라 사고 과정 결핍이 드러나기 어렵습니다.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-red-400 font-bold">!</span>
                    <span>상담이나 진단평가는 심리적 부담을 주어 진정한 도움을 받기 어렵습니다.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-red-400 font-bold">!</span>
                    <span>OCR 기반 서비스는 정확한 사고 과정 파악에 기술적 한계가 있습니다.</span>
                  </li>
                </ul>
              </div>

              <div>
                 <h4 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">FeedFlow의 핵심 가치</h4>
                 <div className="grid sm:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-xl">
                        <strong className="block text-indigo-700 mb-2">1. 부담 없는 진단</strong>
                        <p className="text-sm text-gray-600 word-keep-all">평가받는 느낌 없이, 문제 풀이만으로 자신의 상태를 파악합니다.</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl">
                        <strong className="block text-indigo-700 mb-2">2. 과정 중심 분석</strong>
                        <p className="text-sm text-gray-600 word-keep-all">사고 흐름과 논리 구조를 분석하여 실제 약점을 발견합니다.</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl">
                        <strong className="block text-indigo-700 mb-2">3. 높은 정확도</strong>
                        <p className="text-sm text-gray-600 word-keep-all">타이핑 기반 환경으로 AI가 사고 구조를 명확히 파악합니다.</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl">
                        <strong className="block text-indigo-700 mb-2">4. 자동 맞춤 루프</strong>
                        <p className="text-sm text-gray-600 word-keep-all">분석부터 처방까지, 사용자의 개입 없이 자연스럽게 순환됩니다.</p>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900 text-center text-gray-400 text-sm">
        <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center justify-center gap-2 mb-4 text-white">
                <span className="font-bold text-lg">FeedFlow</span>
            </div>
            <p className="mb-2">무자각 기반 맞춤형 수학 진단 솔루션</p>
            <p>© 2025 FeedFlow. All rights reserved. MVP Version.</p>
        </div>
      </footer>
    </div>
  );
};
