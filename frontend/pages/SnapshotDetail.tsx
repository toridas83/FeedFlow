
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { SnapshotDetail as SnapshotDetailType } from '../types';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';

// Simple Markdown Renderer Component
const MarkdownViewer: React.FC<{ content: string }> = ({ content }) => {
  // Split content by lines to process block elements
  const lines = content.split('\n');
  
  return (
    <div className="space-y-4 text-gray-800 leading-relaxed font-serif text-lg">
      {lines.map((line, index) => {
        // 1. Headers (#, ##, ###)
        if (line.startsWith('# ')) {
          return <h1 key={index} className="text-3xl font-bold text-gray-900 mt-8 mb-4 border-b pb-2 border-gray-200">{line.replace('# ', '')}</h1>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={index} className="text-2xl font-bold text-indigo-700 mt-6 mb-3">{line.replace('## ', '')}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={index} className="text-xl font-bold text-gray-800 mt-4 mb-2">{line.replace('### ', '')}</h3>;
        }

        // 2. List items (-)
        if (line.trim().startsWith('- ')) {
          const text = line.replace('- ', '');
          // Bold processing inside list item
          const parts = text.split(/(\*\*.*?\*\*)/g);
          return (
            <li key={index} className="ml-6 list-disc marker:text-indigo-500 pl-2 mb-1">
              {parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return <strong key={i} className="font-bold text-gray-900 bg-yellow-50 px-1 rounded">{part.slice(2, -2)}</strong>;
                }
                return part;
              })}
            </li>
          );
        }

        // 3. Normal Paragraphs with Bold support
        if (line.trim() === '') {
          return <div key={index} className="h-2"></div>;
        }

        const parts = line.split(/(\*\*.*?\*\*)/g);
        return (
          <p key={index} className="mb-2">
            {parts.map((part, i) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="font-bold text-gray-900 bg-yellow-50 px-1 rounded">{part.slice(2, -2)}</strong>;
              }
              return part;
            })}
          </p>
        );
      })}
    </div>
  );
};

export const SnapshotDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [detail, setDetail] = useState<SnapshotDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  const formatKst = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  useEffect(() => {
    if (!id || !user?.id) return;
    const fetchDetail = async () => {
      try {
        const data = await api.getSnapshotDetail(user.id, id);
        setDetail(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id, user?.id]);

  if (loading) return <Layout><div className="flex justify-center py-20">리포트 불러오는 중...</div></Layout>;
  if (!detail) return <Layout><div className="flex justify-center py-20">리포트를 찾을 수 없습니다.</div></Layout>;

  const handleRegenerate = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    const gradeCode = user.grade?.includes('3') ? '3' : user.grade?.includes('2') ? '2' : '1';
    setRegenerating(true);
    try {
      await api.regenerateProblemSet(user.id, gradeCode);
      navigate('/dashboard');
    } catch (e) {
      console.error('regenerate failed', e);
      alert('새 문제 생성에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
        {/* Header (Title Only) */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
          <div>
            <span className="text-sm font-bold text-indigo-600 tracking-wider uppercase bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 mb-3 inline-block">
              Analysis Complete
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">{detail.title}</h1>
            <p className="text-gray-500 mt-2 font-medium">진단 일자: {formatKst(detail.createdAt)}</p>
          </div>
          <Button 
            onClick={handleRegenerate}
            className="shadow-md"
            disabled={regenerating}
          >
            {regenerating ? '생성 중... (최대 2분 소요)' : '새 문제 생성하기'}
          </Button>
        </div>

        {/* Single Report Block */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          {/* Decorative Header Bar */}
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 px-8 py-6 border-b border-indigo-700">
            <h2 className="text-white font-bold text-xl flex items-center gap-3">
              <span className="text-2xl">📑</span>
              상세 진단 결과
            </h2>
            <p className="text-indigo-100 text-sm mt-1 ml-9 opacity-80">
              AI가 분석한 학습 패턴과 맞춤형 제안을 확인하세요.
            </p>
          </div>

          {/* Markdown Content Area */}
          <div className="p-8 md:p-12 bg-white min-h-[400px]">
            <MarkdownViewer content={detail.reportContent} />
          </div>
        </div>

        {/* Bottom Action */}
        <div className="flex justify-center pt-8">
          <Button 
            onClick={() => navigate('/snapshots')}
            variant="secondary"
            className="px-6"
          >
            목록으로 돌아가기
          </Button>
        </div>
      </div>
    </Layout>
  );
};
