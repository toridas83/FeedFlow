import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { SnapshotSummary } from '../types';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';

export const Snapshots: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
  const [loading, setLoading] = useState(true);

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
    const fetchSnapshots = async () => {
      try {
        if (!user?.id) return;
        const data = await api.getSnapshots(user.id);
        setSnapshots(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchSnapshots();
  }, [user?.id]);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">진단 리포트 목록</h1>
        
        {loading ? (
          <div className="text-center py-10 text-gray-500">리포트를 불러오는 중...</div>
        ) : (
          <div className="grid gap-4">
            {snapshots.map((snap) => (
              <div 
                key={snap.id}
                onClick={() => navigate(`/snapshots/${snap.id}`)}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-indigo-300 cursor-pointer transition-all"
              >
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-2">
                  <h3 className="text-lg font-bold text-gray-900">{snap.title}</h3>
                  <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full w-fit">
                    {formatKst(snap.createdAt)}
                  </span>
                </div>
                <p className="text-gray-600 line-clamp-2">{snap.summary}</p>
                <div className="mt-4 flex items-center text-indigo-600 font-medium text-sm">
                  상세 리포트 보기 →
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};
