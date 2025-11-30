import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { DashboardStatus, SnapshotSummary } from '../types';
import { Button } from '../components/Button';
import { Layout } from '../components/Layout';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<DashboardStatus | null>(null);
  const [recentSnapshots, setRecentSnapshots] = useState<SnapshotSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const formatKst = (iso?: string | null) => {
    if (!iso) return '기록 없음';
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
    const loadDashboardData = async () => {
      try {
        if (!user?.id) return;
        const [statusData, snapshotsData] = await Promise.all([
          api.getUserStatus(user.id),
          api.getSnapshots(user.id)
        ]);
        setStatus(statusData);
        setRecentSnapshots((snapshotsData || []).slice(0, 3)); // Only show top 3
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, [user?.id]);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-indigo-600 font-medium">대시보드 로딩 중...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        {/* Welcome Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">반갑습니다, {user?.name?.split(' ')[0]}님!</h1>
            <p className="text-gray-500 mt-2">
              오늘도 FeedFlow와 함께 수학적 잠재력을 깨워보세요.
            </p>
          </div>
          <Button 
            onClick={() => navigate('/problem')} 
            className="w-full md:w-auto px-8 py-3 text-lg shadow-md"
          >
            오늘의 문제 풀기
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Status Card */}
          <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100 col-span-1">
            <h3 className="text-lg font-semibold text-indigo-900 mb-4">최근 학습 요약</h3>
            <div className="space-y-3">
               <div>
                 <p className="text-xs text-indigo-500 uppercase font-bold tracking-wide">마지막 학습일</p>
                 <p className="text-indigo-900 font-medium">{formatKst(status?.lastStudyDate)}</p>
               </div>
            </div>
          </div>

          {/* Snapshots List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 col-span-1 md:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">최근 진단 리포트</h3>
              <Button variant="outline" onClick={() => navigate('/snapshots')} className="text-sm py-1">
                전체 보기
              </Button>
            </div>
            
            <div className="space-y-4">
              {recentSnapshots.map((snap) => (
                <div 
                  key={snap.id} 
                  onClick={() => navigate(`/snapshots/${snap.id}`)}
                  className="group flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 cursor-pointer transition-all"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">
                        {snap.title}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        {formatKst(snap.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-1">{snap.summary}</p>
                  </div>
                  <div className="mt-2 sm:mt-0">
                    <svg className="w-5 h-5 text-gray-300 group-hover:text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
              
              {recentSnapshots.length === 0 && (
                <p className="text-gray-500 text-center py-4">아직 생성된 리포트가 없습니다.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
